# File Storage Security Architecture

## Overview

This document details the security architecture for tenant file storage in the multi-tenant Maintenance OS, with a focus on AWS S3 integration and comprehensive access control.

## Storage Architecture

### AWS S3 Bucket Structure

```
maintenance-os-files/                    # Root bucket
├── tenants/                            # Tenant files root
│   └── {tenant_uuid}/                  # Tenant-specific folder
│       ├── attachments/                # Form response attachments
│       │   └── {year}/{month}/        # Date-based organization
│       ├── exports/                    # Generated reports/exports
│       │   └── {year}/{month}/
│       ├── imports/                    # Uploaded data files
│       │   └── {year}/{month}/
│       └── assets/                     # Asset-related files
│           └── {asset_id}/
└── temp/                               # Temporary files (auto-cleaned)
    └── {tenant_uuid}/
```

## Security Layers

### 1. AWS IAM Configuration

#### Application IAM Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::maintenance-os-files/tenants/*",
        "arn:aws:s3:::maintenance-os-files/temp/*"
      ]
    },
    {
      "Effect": "Deny",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::maintenance-os-files/*"],
      "Condition": {
        "StringNotLike": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

#### S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::maintenance-os-files/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::maintenance-os-files",
        "arn:aws:s3:::maintenance-os-files/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:SourceAccount": "${AWS_ACCOUNT_ID}"
        }
      }
    }
  ]
}
```

### 2. Application-Level Security

#### Secure File Upload Service
```php
namespace App\Services;

use Illuminate\Support\Str;
use Aws\S3\S3Client;
use App\Models\FileRecord;

class SecureFileStorageService
{
    private S3Client $s3;
    private string $bucket;
    
    public function __construct()
    {
        $this->s3 = new S3Client([
            'version' => 'latest',
            'region' => config('filesystems.disks.s3-tenant.region'),
            'credentials' => [
                'key' => config('filesystems.disks.s3-tenant.key'),
                'secret' => config('filesystems.disks.s3-tenant.secret'),
            ],
        ]);
        
        $this->bucket = config('filesystems.disks.s3-tenant.bucket');
    }
    
    public function store($file, $tenant, $category = 'attachments')
    {
        // Validate file type and size
        $this->validateFile($file);
        
        // Generate secure filename
        $filename = $this->generateSecureFilename($file);
        
        // Build secure path
        $path = $this->buildSecurePath($tenant, $category, $filename);
        
        // Encrypt and upload
        $result = $this->s3->putObject([
            'Bucket' => $this->bucket,
            'Key' => $path,
            'Body' => fopen($file->getRealPath(), 'r'),
            'ServerSideEncryption' => 'AES256',
            'Metadata' => [
                'tenant-id' => $tenant->uuid,
                'uploaded-by' => auth()->id(),
                'uploaded-at' => now()->toIso8601String(),
                'original-name' => $file->getClientOriginalName(),
            ],
        ]);
        
        // Record in database
        $fileRecord = FileRecord::create([
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'path' => $path,
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'category' => $category,
            'checksum' => hash_file('sha256', $file->getRealPath()),
            's3_etag' => $result['ETag'],
        ]);
        
        return $fileRecord;
    }
    
    private function validateFile($file)
    {
        $allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
        ];
        
        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            throw new \InvalidArgumentException('File type not allowed');
        }
        
        $maxSize = 50 * 1024 * 1024; // 50MB
        if ($file->getSize() > $maxSize) {
            throw new \InvalidArgumentException('File size exceeds limit');
        }
    }
    
    private function generateSecureFilename($file): string
    {
        $extension = $file->getClientOriginalExtension();
        return Str::uuid() . '.' . $extension;
    }
    
    private function buildSecurePath($tenant, $category, $filename): string
    {
        $date = now();
        return sprintf(
            'tenants/%s/%s/%d/%02d/%s',
            $tenant->uuid,
            $category,
            $date->year,
            $date->month,
            $filename
        );
    }
}
```

#### Secure File Retrieval
```php
class SecureFileRetrievalService
{
    public function getPresignedUrl(FileRecord $file, $expiresIn = 300)
    {
        // Verify tenant access
        if ($file->tenant_id !== tenant()->id) {
            abort(403, 'Access denied');
        }
        
        // Verify user permissions
        if (!auth()->user()->can('view', $file)) {
            abort(403, 'Insufficient permissions');
        }
        
        // Log access attempt
        $this->logFileAccess($file);
        
        // Generate time-limited presigned URL
        $command = $this->s3->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key' => $file->path,
            'ResponseContentDisposition' => 'attachment; filename="' . $file->original_filename . '"',
        ]);
        
        $request = $this->s3->createPresignedRequest($command, "+{$expiresIn} seconds");
        
        return (string) $request->getUri();
    }
    
    public function streamFile(FileRecord $file)
    {
        // Verify access
        $this->verifyAccess($file);
        
        // Get file from S3
        $result = $this->s3->getObject([
            'Bucket' => $this->bucket,
            'Key' => $file->path,
        ]);
        
        // Verify checksum
        $downloadedChecksum = hash('sha256', $result['Body']);
        if ($downloadedChecksum !== $file->checksum) {
            throw new \Exception('File integrity check failed');
        }
        
        // Stream to user
        return response()->stream(function () use ($result) {
            echo $result['Body'];
        }, 200, [
            'Content-Type' => $file->mime_type,
            'Content-Disposition' => 'attachment; filename="' . $file->original_filename . '"',
            'Content-Length' => $file->size,
        ]);
    }
    
    private function logFileAccess(FileRecord $file)
    {
        FileAccessLog::create([
            'file_id' => $file->id,
            'user_id' => auth()->id(),
            'tenant_id' => tenant()->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'accessed_at' => now(),
        ]);
    }
}
```

### 3. Database Schema for File Security

```sql
-- File records table
CREATE TABLE file_records (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    s3_etag VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, path)
);

-- File access logs
CREATE TABLE file_access_logs (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES file_records(id),
    user_id INTEGER NOT NULL,
    tenant_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(50) DEFAULT 'view',
    accessed_at TIMESTAMP DEFAULT NOW()
);

-- File permissions
CREATE TABLE file_permissions (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES file_records(id),
    role_id INTEGER,
    user_id INTEGER,
    permission VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by INTEGER NOT NULL,
    UNIQUE(file_id, role_id, user_id, permission)
);

-- Indexes
CREATE INDEX idx_file_records_tenant ON file_records(tenant_id);
CREATE INDEX idx_file_records_category ON file_records(tenant_id, category);
CREATE INDEX idx_file_access_tenant ON file_access_logs(tenant_id);
CREATE INDEX idx_file_access_file ON file_access_logs(file_id);
```

### 4. Middleware for File Access

```php
namespace App\Http\Middleware;

class SecureFileAccess
{
    public function handle($request, Closure $next)
    {
        // Extract file ID from route
        $fileId = $request->route('file');
        
        // Load file record
        $file = FileRecord::findOrFail($fileId);
        
        // Verify tenant context
        if ($file->tenant_id !== tenant()->id) {
            abort(403, 'Access denied - Invalid tenant context');
        }
        
        // Verify user permissions
        if (!auth()->user()->can('view', $file)) {
            abort(403, 'Access denied - Insufficient permissions');
        }
        
        // Check if file is marked as deleted
        if ($file->deleted_at) {
            abort(404, 'File not found');
        }
        
        // Rate limiting per user
        $key = 'file_access:' . auth()->id() . ':' . $fileId;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            abort(429, 'Too many requests');
        }
        RateLimiter::hit($key, 60);
        
        return $next($request);
    }
}
```

## Security Features

### 1. Encryption
- **At Rest**: All files encrypted using AWS S3 server-side encryption (AES-256)
- **In Transit**: All transfers use TLS 1.2+
- **Application Level**: Sensitive metadata encrypted before storage

### 2. Access Control
- **Multi-Factor Authentication**: Required for accessing sensitive files
- **Role-Based Access Control**: Granular permissions per file/folder
- **Time-Limited Access**: Presigned URLs expire after 5 minutes by default
- **IP Whitelisting**: Optional restriction by IP range

### 3. Audit Trail
```php
class FileAuditService
{
    public function logActivity($action, FileRecord $file, $metadata = [])
    {
        AuditLog::create([
            'tenant_id' => tenant()->id,
            'user_id' => auth()->id(),
            'action' => $action,
            'resource_type' => 'file',
            'resource_id' => $file->id,
            'metadata' => array_merge($metadata, [
                'file_path' => $file->path,
                'file_size' => $file->size,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'created_at' => now(),
        ]);
    }
}
```

### 4. Virus Scanning
```php
class VirusScanService
{
    public function scan($filePath)
    {
        // Integration with ClamAV or similar
        $result = $this->clamav->scan($filePath);
        
        if ($result->isInfected()) {
            // Quarantine file
            $this->quarantine($filePath);
            
            // Alert administrators
            $this->alertAdmins($result);
            
            throw new \Exception('File contains malware');
        }
        
        return true;
    }
}
```

## Implementation Guidelines

### 1. File Upload Flow
```
User Upload → Validation → Virus Scan → Encrypt → Upload to S3 → Record in DB → Return Success
```

### 2. File Download Flow
```
Request → Verify Tenant → Check Permissions → Log Access → Generate Presigned URL → Redirect
```

### 3. File Deletion
```php
public function deleteFile(FileRecord $file)
{
    // Soft delete in database
    $file->update(['deleted_at' => now()]);
    
    // Schedule permanent deletion after retention period
    DeleteFileJob::dispatch($file)->delay(now()->addDays(30));
    
    // Log deletion
    $this->auditService->logActivity('delete', $file);
}
```

## Monitoring and Alerts

### 1. Security Metrics
- Failed access attempts per tenant
- Unusual download patterns
- Large file uploads
- Suspicious file types

### 2. Alert Conditions
```yaml
alerts:
  - name: "Excessive Failed Access"
    condition: "failed_access_count > 10 in 5 minutes"
    action: "Block user and notify admin"
    
  - name: "Large Data Export"
    condition: "download_size > 1GB in 1 hour"
    action: "Notify tenant admin"
    
  - name: "Malware Detected"
    condition: "virus_scan_failed"
    action: "Quarantine and alert all admins"
```

## Compliance Considerations

### 1. GDPR Compliance
- Right to access: Users can download all their files
- Right to deletion: Permanent deletion after retention period
- Data portability: Bulk export functionality

### 2. HIPAA Compliance (if needed)
- Encryption at rest and in transit
- Access logs retained for 6 years
- Business Associate Agreement (BAA) with AWS

### 3. Data Retention
```php
class DataRetentionPolicy
{
    public function applyPolicy(FileRecord $file)
    {
        $retentionDays = match($file->category) {
            'exports' => 30,
            'imports' => 90,
            'attachments' => 365,
            'assets' => null, // Keep indefinitely
        };
        
        if ($retentionDays && $file->created_at->addDays($retentionDays)->isPast()) {
            $this->scheduleForDeletion($file);
        }
    }
}
```

## Disaster Recovery

### 1. Backup Strategy
- S3 Cross-Region Replication enabled
- Daily snapshots of file metadata
- Point-in-time recovery available

### 2. Recovery Procedures
```bash
# Restore files for a specific tenant
aws s3 sync s3://maintenance-os-files-backup/tenants/{tenant_uuid}/ \
            s3://maintenance-os-files/tenants/{tenant_uuid}/ \
            --delete
```

## Cost Optimization

### 1. Storage Classes
- Standard: First 30 days
- Standard-IA: 30-90 days
- Glacier: After 90 days (configurable per tenant)

### 2. Lifecycle Policies
```json
{
  "Rules": [{
    "Id": "ArchiveOldFiles",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 30,
      "StorageClass": "STANDARD_IA"
    }, {
      "Days": 90,
      "StorageClass": "GLACIER"
    }]
  }]
}
``` 