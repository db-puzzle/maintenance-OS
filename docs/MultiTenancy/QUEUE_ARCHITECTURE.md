# Queue and Jobs Architecture - Multi-Tenant System

## Executive Summary

In a multi-tenant application, **queues and jobs can exist in BOTH central and tenant contexts**, depending on what they're processing. The critical factor is: **where does the data live?**

## The Answer: Both (But Mostly Tenant)

| Job Type | Context | Database (Jobs Table) | Examples | Reason |
|----------|---------|----------------------|----------|---------|
| **Tenant Jobs** | Tenant | Tenant DB | User invites, image processing, production scheduling | Process tenant-specific data |
| **Central Jobs** | Central | Central DB | Tenant creation, admin notifications, system maintenance | Process central/multi-tenant data |

## Your Current Setup (Analysis)

### ✅ QueueTenancyBootstrapper is Configured

```php
// config/tenancy.php (line 31)
'bootstrappers' => [
    Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,  // ← This is CRITICAL
    Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
],
```

**What this does**:
- Automatically captures tenant context when jobs are dispatched
- Restores tenant context when jobs are processed
- Works transparently without requiring `TenantAware` interface

### Your Existing Jobs (All Tenant Context)

Based on your codebase analysis:

#### 1. User Invitation Emails (TENANT)

```php
// app/Mail/UserInvitationMail.php
// app/Notifications/UserInvitation.php

Location: app/Jobs/ (implicitly tenant context)
Dispatched from: UserInvitationController (tenant route)
Database: Tenant DB (UserInvitation table is in tenant migrations)
Jobs table: Tenant DB jobs table
```

**Why tenant?**
- `UserInvitation` model lives in tenant database
- Invitation is for a user joining a specific tenant
- Email should have tenant-specific branding/URLs

**Example flow:**
```
User on acme.yourapp.com invites someone:
├─ In tenant context (acme)
├─ Creates UserInvitation in tenant_acme.user_invitations
├─ Dispatches notification
├─ Job stored in: tenant_acme.jobs table
└─ When processed: Context restored to acme, email sent
```

#### 2. Image Processing (TENANT)

```php
// app/Jobs/OptimizeMediaImage.php
// app/Jobs/GenerateMediaMetadata.php
// app/Jobs/Production/GenerateImageVariants.php
// app/Jobs/Production/ProcessImageImportSession.php

Location: app/Jobs/
Dispatched from: Media uploads (tenant context)
Database: Tenant DB (Media table is tenant-specific)
Jobs table: Tenant DB jobs table
```

**Why tenant?**
- Media/images belong to specific tenants
- Files stored in tenant-specific paths
- Image processing is tenant-isolated

#### 3. Production Scheduling (TENANT)

```php
// app/Jobs/Production/ScheduleProductionJob.php
// app/Jobs/Production/UpdateSmartProgress.php
// app/Jobs/Production/CheckPendingStepsJob.php
// app/Jobs/Production/ProcessBomImportSession.php

Location: app/Jobs/Production/
Dispatched from: Production module (tenant routes)
Database: Tenant DB (ManufacturingOrder, etc.)
Jobs table: Tenant DB jobs table
Queue: 'scheduling' (separate queue, still tenant-scoped)
```

**Why tenant?**
- Production data is tenant-specific
- Orders, schedules, BOM all in tenant DB
- Each tenant has independent production

#### 4. CreateTenantAdmin (SPECIAL CASE)

```php
// app/Jobs/CreateTenantAdmin.php

Location: app/Jobs/
Dispatched from: Tenant creation (central context)
Runs in: Tenant context (via $tenant->run())
Database: Seeds tenant DB
Jobs table: Central DB jobs table (dispatched from central)
```

**This is the ONLY central job** in your system:
- Dispatched when tenant is created (central context)
- Stored in central `jobs` table
- Manually enters tenant context via `$tenant->run()`
- Seeds tenant database with admin user

## How Laravel Tenancy QueueTenancyBootstrapper Works

### Automatic Context Preservation

```php
// When you dispatch a job in tenant context:
// Route: https://acme.yourapp.com/invitations
public function store(Request $request) 
{
    // We're in tenant context (acme)
    $invitation = UserInvitation::create([...]);
    
    // This job is automatically tagged with tenant_id!
    Notification::route('mail', $email)
        ->notify(new UserInvitationNotification($invitation));
    
    // Job payload includes: tenant_id = 'acme-uuid'
}

// When the queue worker processes the job:
// 1. QueueTenancyBootstrapper detects tenant_id in payload
// 2. Initializes tenancy for 'acme'
// 3. Job runs in correct tenant context
// 4. After job completes, context is reverted
```

### What Gets Stored in Job Payload

```json
{
  "displayName": "App\\Notifications\\UserInvitation",
  "job": "Illuminate\\Queue\\CallQueuedHandler@call",
  "data": {
    "commandName": "Illuminate\\Notifications\\SendQueuedNotifications",
    "command": "... serialized notification ...",
    "tenantId": "acme-uuid-here"  // ← Added automatically!
  },
  "attempts": 0,
  "queue": "default"
}
```

## Jobs Table Location Decision Tree

```
Where should the jobs table be?
│
├─ Does the job process CENTRAL data?
│  ├─ Examples: Creating tenants, admin emails, system maintenance
│  └─ Jobs table: CENTRAL database
│      └─ Queue connection: Uses central DB
│
└─ Does the job process TENANT data?
   ├─ Examples: User invites, image optimization, production scheduling
   └─ Jobs table: TENANT database (each tenant has own jobs table)
       └─ Queue connection: Uses current tenant DB
```

## Current State: Missing Jobs Tables

### The Problem

Your logs show:
```
SQLSTATE[42P01]: Undefined table: 7 ERROR: relation "jobs" does not exist
```

**Analysis**:
- Queue worker is trying to use the default database connection
- That connection points to `maintenance_os_central`
- But `jobs` table doesn't exist there

### The Solution

You need jobs tables in **BOTH** places because you have jobs in both contexts:

#### Option 1: Tenant Jobs Only (Current Architecture - RECOMMENDED)

**Your current jobs are ALL tenant-scoped** (except CreateTenantAdmin which manually enters tenant context).

Solution:
```bash
# 1. Create jobs table migration for tenants
php artisan queue:table
php artisan queue:failed-table

# 2. Move to TENANT migrations (not central)
mv database/migrations/*_create_jobs_table.php database/migrations/tenant/
mv database/migrations/*_create_failed_jobs_table.php database/migrations/tenant/

# 3. Run tenant migrations
php artisan tenants:migrate
```

**BUT** there's a catch with `CreateTenantAdmin`...

#### Option 2: Jobs in Both (Better for Your Use Case)

Since `CreateTenantAdmin` is dispatched from central context (when tenant is created):

```bash
# Create migrations
php artisan queue:table
php artisan queue:failed-table

# Copy to BOTH locations
cp database/migrations/*_create_jobs_table.php database/migrations/central/
cp database/migrations/*_create_failed_jobs_table.php database/migrations/central/
cp database/migrations/*_create_jobs_table.php database/migrations/tenant/
cp database/migrations/*_create_failed_jobs_table.php database/migrations/tenant/

# Edit central versions to add:
# protected $connection = 'central';

# Run both
php artisan migrate --database=central --path=database/migrations/central
php artisan tenants:migrate

# Clean up original files
rm database/migrations/*_create_jobs_table.php
rm database/migrations/*_create_failed_jobs_table.php
```

## Recommended Architecture for Your App

### Jobs Table Strategy

```
Central Database (maintenance_os_central):
├── jobs                  ✅ For central jobs (tenant creation, etc.)
├── failed_jobs           ✅ For central job failures
└── sessions              ✅ Already have this

Each Tenant Database (tenant_<uuid>):
├── jobs                  ✅ For tenant jobs (invites, images, production)
├── failed_jobs           ✅ For tenant job failures  
├── sessions              ✅ Already have this
└── users, work_orders... ✅ Already have this
```

### Queue Worker Configuration

```bash
# Option 1: Single worker (simple)
php artisan queue:work

# Option 2: Multiple workers (better)
# Terminal 1: Central jobs (rare, mostly tenant creation)
php artisan queue:work --queue=default --database=central

# Terminal 2: Tenant jobs (main workload)
php artisan queue:work --queue=default,scheduling
```

## Specific Examples from Your Codebase

### Example 1: User Invitation Email

```
📧 User Invitation Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. Admin on acme.yourapp.com invites user              │
│    ├─ Controller: UserInvitationController (tenant)    │
│    ├─ Creates: UserInvitation (tenant_acme DB)         │
│    └─ Dispatches: UserInvitationNotification           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. QueueTenancyBootstrapper captures context           │
│    ├─ Job payload includes: tenant_id = 'acme-uuid'    │
│    └─ Stored in: tenant_acme.jobs table                │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Queue worker processes job                           │
│    ├─ Reads from: tenant_acme.jobs table               │
│    ├─ Bootstrapper restores: acme tenant context       │
│    ├─ Loads: UserInvitation from tenant_acme DB        │
│    ├─ Sends email: With acme-specific branding/URLs    │
│    └─ Context cleanup: Returns to neutral              │
└─────────────────────────────────────────────────────────┘
```

**Context**: TENANT  
**Jobs table**: tenant_acme.jobs  
**Why**: Invitation is tenant-specific data

### Example 2: Image Optimization

```
🖼️ Image Processing Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. User on contoso.yourapp.com uploads image           │
│    ├─ Controller: MediaController (tenant)             │
│    ├─ Creates: Media record (tenant_contoso DB)        │
│    └─ Dispatches: OptimizeMediaImage job               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. QueueTenancyBootstrapper captures context           │
│    ├─ Job payload includes: tenant_id = 'contoso-uuid' │
│    ├─ Serializes: Media model (with tenant ID)         │
│    └─ Stored in: tenant_contoso.jobs table             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Queue worker processes job                           │
│    ├─ Reads from: tenant_contoso.jobs table            │
│    ├─ Bootstrapper restores: contoso tenant context    │
│    ├─ Loads: Media from tenant_contoso DB              │
│    ├─ Optimizes: File in contoso-specific storage      │
│    └─ Updates: Media record in tenant_contoso DB       │
└─────────────────────────────────────────────────────────┘
```

**Context**: TENANT  
**Jobs table**: tenant_contoso.jobs  
**Why**: Image belongs to specific tenant

### Example 3: Production Scheduling

```
📊 Production Scheduling Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. User on acme.yourapp.com schedules production       │
│    ├─ Controller: SchedulingController (tenant)        │
│    ├─ Creates: ScheduleVersion (tenant_acme DB)        │
│    └─ Dispatches: ScheduleProductionJob               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. QueueTenancyBootstrapper captures context           │
│    ├─ Job payload includes: tenant_id = 'acme-uuid'    │
│    ├─ Queue: 'scheduling' (tenant-specific queue)      │
│    └─ Stored in: tenant_acme.jobs table                │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Queue worker (scheduling queue) processes job       │
│    ├─ Reads from: tenant_acme.jobs table               │
│    ├─ Bootstrapper restores: acme tenant context       │
│    ├─ Loads: Manufacturing orders from tenant_acme DB  │
│    ├─ Runs: Scheduling algorithm (5 min timeout)       │
│    ├─ Saves: Results to tenant_acme DB                 │
│    └─ Broadcasts: SchedulingComplete event             │
└─────────────────────────────────────────────────────────┘
```

**Context**: TENANT  
**Jobs table**: tenant_acme.jobs  
**Queue name**: 'scheduling' (still tenant-scoped)  
**Why**: Production data is tenant-specific

### Example 4: CreateTenantAdmin (SPECIAL CASE - Central→Tenant)

```
👤 Tenant Creation Flow:
┌─────────────────────────────────────────────────────────┐
│ 1. Visitor on yourapp.com creates new tenant account   │
│    ├─ Controller: TenantRegistrationController         │
│    ├─ Context: CENTRAL (no tenant initialized)         │
│    ├─ Creates: Account in maintenance_os_central       │
│    └─ Laravel Tenancy dispatches: CreateTenantAdmin    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Job queued in CENTRAL context                       │
│    ├─ No tenant context (central job)                  │
│    ├─ Payload includes: TenantWithDatabase object      │
│    └─ Stored in: maintenance_os_central.jobs table     │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Queue worker processes job (central context)        │
│    ├─ Reads from: maintenance_os_central.jobs          │
│    ├─ No tenant context initially                      │
│    ├─ Job calls: $tenant->run(function() {...})        │
│    │   ├─ MANUALLY enters tenant context               │
│    │   ├─ Runs: TenantDatabaseSeeder                   │
│    │   ├─ Creates: Admin user in new tenant DB         │
│    │   └─ Exits tenant context                         │
│    └─ Job completes in central context                 │
└─────────────────────────────────────────────────────────┘
```

**Context**: CENTRAL (but manually enters tenant)  
**Jobs table**: maintenance_os_central.jobs  
**Why**: Job is part of tenant creation (central operation)

## Why NOT Use TenantAware Interface?

You might notice your jobs **don't implement `TenantAware`**. That's because:

### Laravel Tenancy Provides Two Options:

#### Option 1: TenantAware Interface (Explicit)
```php
class ProcessWorkOrderJob implements ShouldQueue, TenantAware
{
    public ?string $tenantId = null; // Package sets this
    
    // Job logic...
}
```

**Pros**: Explicit, clear intent  
**Cons**: Requires adding interface to every job

#### Option 2: QueueTenancyBootstrapper (Automatic) ✅ YOUR CHOICE
```php
class OptimizeMediaImage implements ShouldQueue
{
    protected Media $media; // Eloquent model knows its tenant
    
    // Job logic - tenant context restored automatically!
}
```

**Pros**: No interface needed, works automatically  
**Cons**: Less explicit (but still reliable)

**Your system uses Option 2** via `QueueTenancyBootstrapper` which:
- Detects when a job is dispatched in tenant context
- Adds `tenantId` to job payload automatically
- Restores context when processing
- Works seamlessly with Eloquent model serialization

## Database Configuration

### Current Queue Config

```php
// config/queue.php
'default' => env('QUEUE_CONNECTION', 'database'),

'connections' => [
    'database' => [
        'driver' => 'database',
        'connection' => env('DB_QUEUE_CONNECTION'),  // ← This determines which DB
        'table' => env('DB_QUEUE_TABLE', 'jobs'),
        'queue' => 'default',
        'retry_after' => 90,
    ],
],
```

### Critical: Queue Connection Configuration

```env
# .env configuration

# Main database (central by default)
DB_CONNECTION=pgsql
DB_DATABASE=maintenance_os_central

# Queue configuration
QUEUE_CONNECTION=database

# Don't set DB_QUEUE_CONNECTION - let it use current context:
# - When in central context → uses maintenance_os_central.jobs
# - When in tenant context → uses tenant_<uuid>.jobs (automatic!)
```

**How it works:**
- When `DB_QUEUE_CONNECTION` is NOT set, Laravel uses the current database connection
- With QueueTenancyBootstrapper, the current connection is automatically tenant-scoped
- This means jobs are stored in the correct database automatically!

## Where Each Component Lives

| Component | Central DB | Tenant DB | Why |
|-----------|-----------|-----------|-----|
| **jobs table** | ✅ Needed | ✅ Needed | Both contexts queue jobs |
| **failed_jobs table** | ✅ Needed | ✅ Needed | Track failures in both contexts |
| **sessions table** | ✅ Needed | ✅ Needed | Already covered |
| **user_invitations table** | ❌ No | ✅ Yes | Tenant-specific invites |
| **media table** | ❌ No | ✅ Yes | Tenant-specific media |
| **manufacturing_orders table** | ❌ No | ✅ Yes | Tenant-specific production |
| **accounts table** | ✅ Yes | ❌ No | Central tenant registry |
| **admin_users table** | ✅ Yes | ❌ No | System administrators |

## Monitoring & Debugging

### Check Jobs in Each Context

```bash
# Check central jobs
psql -d maintenance_os_central -c "SELECT COUNT(*) FROM jobs;"

# Check tenant jobs
php artisan tenants:run "echo 'Tenant:' . tenant('name') . ' - Jobs:' . DB::table('jobs')->count();"

# List all jobs across all tenants
php artisan tenants:run db:table jobs
```

### Monitor Failed Jobs

```bash
# Central failed jobs
php artisan queue:failed --database=central

# Tenant failed jobs (within tenant context)
php artisan tenants:run queue:failed
```

### Restart Queue Workers

```bash
# Restart all workers (sends graceful shutdown signal)
php artisan queue:restart

# Or kill and restart manually
pkill -f "artisan queue:work"
php artisan queue:work --queue=default,scheduling
```

## Best Practices

### 1. Queue Jobs Should Process Their Own Context Data

✅ **GOOD**: Job processes data from same context it was dispatched
```php
// Dispatched from tenant context
// Processes UserInvitation from same tenant
OptimizeMediaImage::dispatch($media);
```

❌ **BAD**: Job crosses contexts (security risk, complexity)
```php
// DON'T DO THIS
// Dispatched from tenant A, tries to access tenant B data
```

### 2. Use Proper Queue Names

```php
// Different queues for different priorities
class ScheduleProductionJob implements ShouldQueue
{
    public function __construct(...)
    {
        $this->onQueue('scheduling'); // Dedicated queue for heavy jobs
    }
}

class SendNotificationJob implements ShouldQueue
{
    // Uses 'default' queue (lighter jobs)
}
```

### 3. Failed Job Handling

Jobs in tenant context automatically:
- Store failures in tenant's `failed_jobs` table
- Can be retried within tenant context
- Don't leak data to other tenants

## Migration Path (Fix Current Issues)

### Step 1: Create Queue Tables

```bash
# Generate migrations
php artisan queue:table
php artisan queue:failed-table
```

### Step 2: Distribute to Both Contexts

```bash
# For central
cp database/migrations/*_create_jobs_table.php database/migrations/central/2025_11_04_120000_create_jobs_table.php
cp database/migrations/*_create_failed_jobs_table.php database/migrations/central/2025_11_04_120001_create_failed_jobs_table.php

# For tenants
mv database/migrations/*_create_jobs_table.php database/migrations/tenant/
mv database/migrations/*_create_failed_jobs_table.php database/migrations/tenant/
```

### Step 3: Configure Central Migrations

Edit `database/migrations/central/2025_11_04_120000_create_jobs_table.php`:
```php
return new class extends Migration
{
    protected $connection = 'central'; // ← Add this
    
    public function up(): void
    {
        // ... existing code
    }
}
```

Do the same for `create_failed_jobs_table.php`.

### Step 4: Run Migrations

```bash
# Central
php artisan migrate --database=central --path=database/migrations/central

# Tenants (all of them)
php artisan tenants:migrate
```

### Step 5: Restart Queue Workers

```bash
php artisan queue:restart
```

## Testing Strategy

### Test 1: Tenant Job Execution

```php
public function test_tenant_job_uses_tenant_jobs_table(): void
{
    $tenant = Account::factory()->create();
    
    $tenant->run(function () {
        $media = Media::factory()->create();
        
        // Dispatch job
        OptimizeMediaImage::dispatch($media);
        
        // Verify job stored in TENANT jobs table
        $this->assertDatabaseHas('jobs', [
            'queue' => 'default',
        ]); // Uses current (tenant) connection
        
        // Verify NOT in central
        $this->assertDatabaseMissing('jobs', [
            'queue' => 'default',
        ], 'central');
    });
}
```

### Test 2: Central Job Execution

```php
public function test_central_job_uses_central_jobs_table(): void
{
    $tenant = Account::create([
        'name' => 'Test',
        'subdomain' => 'test',
    ]);
    
    // CreateTenantAdmin dispatched automatically
    // Should be in central jobs table
    $this->assertDatabaseHas('jobs', [
        'queue' => 'default',
    ], 'central');
}
```

## Summary

### Your Application's Queue Architecture

✅ **95% of your jobs are TENANT jobs**:
- User invitations (tenant-specific)
- Image processing (tenant-specific)
- Production scheduling (tenant-specific)
- All production jobs (tenant-specific)

✅ **5% are CENTRAL jobs**:
- CreateTenantAdmin (tenant creation)
- (Future: System maintenance, admin notifications)

### Required Setup

1. **Jobs tables in BOTH databases** (central and each tenant)
2. **QueueTenancyBootstrapper** (already configured ✅)
3. **Queue workers** running with proper configuration
4. **No code changes needed** - bootstrapper handles everything

### Why This Architecture Works

- **Automatic isolation**: Tenant A jobs never touch Tenant B data
- **Performance**: Each tenant's queue is independent
- **Security**: Physical database separation
- **Simplicity**: No complex routing logic needed
- **Laravel Tenancy magic**: Context preserved automatically

The beauty of this system is that **you don't have to think about it** - just dispatch jobs normally, and Laravel Tenancy's `QueueTenancyBootstrapper` ensures they run in the correct context!

---

**Next Step**: Create the jobs tables using the migration path above, and your queue system will be fully functional!








