# Multi-Tenant Backup Strategy for Laravel Cloud

## Overview

This document outlines a comprehensive backup strategy for a multi-tenant Laravel application with individual PostgreSQL databases per tenant. The strategy leverages Laravel Cloud's managed backup capabilities where available and implements custom solutions for tenant-specific requirements.

## Backup Architecture

### Core Requirements
- **Scope**: Both individual tenant backups and full system backups
- **Frequency**: Daily backups with plan-based variations
- **Storage**: Amazon S3
- **Retention**: 30-day retention policy
- **Recovery Objectives**: RTO = 1 day, RPO = 1 day
- **Encryption**: Enabled with managed keys

## Backup Implementation

### 1. Laravel Cloud MySQL Backup Integration

Based on [Laravel Cloud's documentation](https://cloud.laravel.com/docs/resources/databases#connection-pooler), MySQL databases have built-in backup capabilities:

#### Available Features
- Automated daily backups (3AM-6AM EDT backup window)
- Manual on-demand backups
- 1-30 day retention configuration
- Backup pricing: $0.10/GB-mo (US regions)

#### Limitations for Our Use Case
- No PostgreSQL backup support mentioned
- No per-tenant backup scheduling
- Limited to MySQL databases only

### 2. Custom PostgreSQL Backup Solution

Since Laravel Cloud doesn't provide native PostgreSQL backup support, we'll implement a custom solution:

#### Architecture Components
```
┌─────────────────────────────────────────────────────────────┐
│                     Backup System Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Scheduler  │───▶│ Backup Jobs  │───▶│   S3 Storage │ │
│  │   (Cron)    │    │  (Per Tenant)│    │  (Encrypted) │ │
│  └─────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Plan-Based │    │   Progress   │    │    Restore   │ │
│  │  Scheduling │    │   Tracking   │    │   Service    │ │
│  └─────────────┘    └──────────────┘    └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Backup Types and Scheduling

#### Daily Backup Schedule by Plan
```php
// config/backup.php
return [
    'schedules' => [
        'premium' => [
            'frequency' => 'daily',
            'time' => '02:00',
            'type' => 'incremental',
            'full_backup_day' => 'sunday',
        ],
        'standard' => [
            'frequency' => 'daily',
            'time' => '03:00',
            'type' => 'incremental',
            'full_backup_day' => 'sunday',
        ],
        'trial' => [
            'frequency' => 'daily',
            'time' => '04:00',
            'type' => 'full',
        ],
    ],
];
```

#### Backup Types
1. **Full Backup**: Complete database dump
2. **Incremental Backup**: Only changes since last backup (using pg_basebackup with WAL)
3. **System Backup**: Central database and configuration

### 4. S3 Storage Configuration

#### Bucket Structure
```
maintenance-os-backups/
├── tenants/
│   ├── {tenant-id}/
│   │   ├── daily/
│   │   │   ├── 2024-01-15-full.sql.gz.enc
│   │   │   ├── 2024-01-16-incremental.sql.gz.enc
│   │   │   └── ...
│   │   └── metadata.json
│   └── ...
├── system/
│   ├── central-db/
│   └── configs/
└── logs/
    └── backup-reports/
```

#### S3 Configuration
```php
// config/filesystems.php
'backups' => [
    'driver' => 's3',
    'key' => env('AWS_BACKUP_ACCESS_KEY_ID'),
    'secret' => env('AWS_BACKUP_SECRET_ACCESS_KEY'),
    'region' => env('AWS_BACKUP_REGION', 'us-east-1'),
    'bucket' => env('AWS_BACKUP_BUCKET', 'maintenance-os-backups'),
    'url' => env('AWS_BACKUP_URL'),
    'endpoint' => env('AWS_BACKUP_ENDPOINT'),
    'visibility' => 'private',
    'server_side_encryption' => 'AES256',
],
```

### 5. Backup Job Implementation

#### Main Backup Job Structure
```php
// app/Jobs/BackupTenantDatabase.php
class BackupTenantDatabase implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public ?string $tenantId = null;
    public string $backupType; // 'full' or 'incremental'
    
    public function handle(): void
    {
        $tenant = Account::find($this->tenantId);
        
        // Skip inactive/suspended tenants
        if (!$this->shouldBackup($tenant)) {
            return;
        }
        
        try {
            $backupPath = $this->performBackup($tenant);
            $this->uploadToS3($backupPath, $tenant);
            $this->updateBackupMetadata($tenant);
            $this->cleanupOldBackups($tenant);
        } catch (\Exception $e) {
            $this->notifyBackupFailure($tenant, $e);
        }
    }
}
```

### 6. Encryption Strategy

#### Encryption Implementation
1. **Encryption Method**: AES-256-GCM
2. **Key Management**: AWS KMS with automatic key rotation
3. **Implementation**:
   ```php
   // app/Services/BackupEncryption.php
   class BackupEncryption
   {
       public function encrypt(string $filePath): string
       {
           // Use AWS KMS for key management
           $key = $this->kms->generateDataKey([
               'KeyId' => config('backup.kms_key_id'),
               'KeySpec' => 'AES_256',
           ]);
           
           // Encrypt file with generated key
           // Store encrypted key with file metadata
           return $encryptedFilePath;
       }
   }
   ```

### 7. Backup Commands and Verification

#### PostgreSQL Backup Commands
```bash
# Full backup
pg_dump --host=$DB_HOST --username=$DB_USER --dbname=$DB_NAME \
  --format=custom --compress=9 --file=$BACKUP_FILE

# Incremental backup using pg_basebackup
pg_basebackup --host=$DB_HOST --username=$DB_USER \
  --wal-method=stream --format=tar --gzip \
  --pgdata=$BACKUP_DIR --checkpoint=fast
```

#### Verification Process
```php
// app/Services/BackupVerification.php
class BackupVerification
{
    public function verify(string $backupFile): bool
    {
        // 1. Check file integrity
        $checksum = $this->calculateChecksum($backupFile);
        
        // 2. Test restore to temporary database
        $testDb = $this->createTestDatabase();
        $restoreSuccess = $this->testRestore($backupFile, $testDb);
        
        // 3. Verify data integrity
        $dataValid = $this->verifyDataIntegrity($testDb);
        
        // 4. Cleanup
        $this->dropTestDatabase($testDb);
        
        return $restoreSuccess && $dataValid;
    }
}
```

### 8. Restore Procedures

#### Selective Restoration (Single Tenant)
```php
// app/Services/TenantRestore.php
class TenantRestore
{
    public function restoreTenant(string $tenantId, string $backupDate): void
    {
        // 1. Download backup from S3
        $backupFile = $this->downloadBackup($tenantId, $backupDate);
        
        // 2. Decrypt backup
        $decryptedFile = $this->decrypt($backupFile);
        
        // 3. Create new database
        $newDb = $this->createDatabase($tenantId . '_restore');
        
        // 4. Restore data
        $this->restoreDatabase($decryptedFile, $newDb);
        
        // 5. Verify restoration
        $this->verifyRestoration($newDb);
        
        // 6. Switch tenant to restored database
        $this->switchTenantDatabase($tenantId, $newDb);
    }
}
```

#### Point-in-Time Recovery
```php
class PointInTimeRecovery
{
    public function recoverToTimestamp(string $tenantId, Carbon $timestamp): void
    {
        // 1. Find nearest full backup before timestamp
        $fullBackup = $this->findNearestFullBackup($tenantId, $timestamp);
        
        // 2. Apply incremental backups up to timestamp
        $incrementals = $this->findIncrementalBackups($tenantId, $fullBackup->date, $timestamp);
        
        // 3. Restore with transaction logs
        $this->restoreWithWAL($fullBackup, $incrementals, $timestamp);
    }
}
```

### 9. Monitoring and Reporting

#### Daily Backup Report
```php
// app/Console/Commands/SendBackupReport.php
class SendBackupReport extends Command
{
    protected $signature = 'backup:daily-report';
    
    public function handle(): void
    {
        $report = [
            'date' => now()->toDateString(),
            'summary' => [
                'total_tenants' => Account::count(),
                'successful_backups' => $this->getSuccessfulCount(),
                'failed_backups' => $this->getFailedCount(),
                'skipped_inactive' => $this->getSkippedCount(),
            ],
            'failures' => $this->getFailureDetails(),
            'storage_usage' => $this->getStorageMetrics(),
            'next_scheduled' => $this->getNextSchedule(),
        ];
        
        Mail::to(config('backup.admin_email'))
            ->send(new DailyBackupReport($report));
    }
}
```

#### Monitoring Metrics
1. **Backup Success Rate**: Target 99.9%
2. **Average Backup Duration**: Monitor for performance degradation
3. **Storage Growth**: Track monthly storage costs
4. **Restore Test Results**: Weekly automated restore tests

### 10. Cost Optimization

#### Storage Cost Management
1. **Incremental Backups**: Reduce storage by 70-80%
2. **Compression**: gzip level 9 compression
3. **Automatic Cleanup**: Delete backups older than 30 days
4. **Inactive Tenant Policy**: No backups for suspended accounts

#### Estimated Monthly Costs
```
Assumptions:
- Average database size: 500MB
- 100 tenants active
- 30-day retention
- 80% compression ratio

Storage needed: 100 × 0.5GB × 0.2 × 30 = 300GB
S3 Standard cost: 300GB × $0.023 = $6.90/month
```

### 11. Implementation Schedule

#### Phase 1 (Week 1): Foundation
- Set up S3 buckets and IAM policies
- Implement basic backup job
- Configure KMS encryption

#### Phase 2 (Week 2): Automation
- Implement scheduling system
- Add plan-based backup logic
- Create monitoring dashboard

#### Phase 3 (Week 3): Recovery
- Build restore functionality
- Implement point-in-time recovery
- Add verification procedures

#### Phase 4 (Week 4): Optimization
- Add incremental backup support
- Implement cost optimization
- Complete testing and documentation

### 12. Disaster Recovery Procedures

#### Recovery Runbook
1. **Identify Affected Tenant(s)**
2. **Determine Recovery Point**
3. **Execute Restore Procedure**
4. **Verify Data Integrity**
5. **Update DNS/Routing if needed**
6. **Notify Affected Users**
7. **Post-Mortem Analysis**

#### Emergency Contacts
- Primary DBA: [Contact Info]
- Backup System Admin: [Contact Info]
- AWS Support: [Premium Support Contact]

## Testing Requirements

### Backup Testing
1. **Daily Verification**: Automated checksum validation
2. **Weekly Restore Test**: Random tenant restore to test environment
3. **Monthly Full Recovery**: Complete disaster recovery drill
4. **Quarterly Review**: Backup strategy effectiveness

### Performance Benchmarks
- Backup completion: < 5 minutes per tenant
- Restore completion: < 30 minutes per tenant
- Verification process: < 2 minutes per backup
- S3 upload speed: > 50MB/s

## Security Considerations

1. **Encryption at Rest**: All backups encrypted with AES-256
2. **Encryption in Transit**: TLS 1.3 for S3 transfers
3. **Access Control**: IAM policies with least privilege
4. **Audit Logging**: All backup operations logged
5. **Key Rotation**: Automatic KMS key rotation enabled

## Conclusion

This backup strategy provides comprehensive protection for multi-tenant data while optimizing for cost and performance. The combination of automated daily backups, encryption, and selective restoration capabilities ensures business continuity while meeting the 1-day RTO/RPO requirements.
