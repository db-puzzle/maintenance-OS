# Multi-Tenant Migration Checklist

## Overview

This checklist provides a comprehensive guide for migrating the existing Maintenance OS codebase to a multi-tenant architecture. Follow each section in order and check off completed items.

## Pre-Migration Preparation

### 1. Environment Setup ✓

- [ ] **Create Fresh Development Environment**
  ```bash
  # No production data to backup - this is a new system
  git checkout -b feature/multi-tenancy
  ```


- [ ] **Update .env.example**
  ```env
  # Central Database
  CENTRAL_DB_CONNECTION=central
  CENTRAL_DB_HOST=127.0.0.1
  CENTRAL_DB_PORT=5432
  CENTRAL_DB_DATABASE=maintenance_os_central
  CENTRAL_DB_USERNAME=postgres
  CENTRAL_DB_PASSWORD=

  # Tenant Database (dynamic)
  DB_CONNECTION=tenant
  DB_HOST=127.0.0.1
  DB_PORT=5432
  DB_DATABASE=
  DB_USERNAME=postgres
  DB_PASSWORD=

  # Domain Configuration
  APP_DOMAIN=maintenance-os.com
  SESSION_DOMAIN=.maintenance-os.com
  ```

### 2. Dependencies Installation

- [ ] **Install Laravel Tenancy**
  ```bash
  composer require stancl/tenancy
  ```

- [ ] **Install Additional Packages**
  ```bash
  composer require laravel/cashier stripe/stripe-php
  ```

- [ ] **Publish Configurations**
  ```bash
  php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider"
  ```

## Database Migration

### 3. Create Central Database

- [ ] **Create Central Database**
  ```bash
  createdb maintenance_os_central -O postgres -E UTF8
  ```

- [ ] **Configure database.php**
  ```php
  // Add to config/database.php
  'central' => [
      'driver' => 'pgsql',
      'host' => env('CENTRAL_DB_HOST', '127.0.0.1'),
      'port' => env('CENTRAL_DB_PORT', '5432'),
      'database' => env('CENTRAL_DB_DATABASE', 'maintenance_os_central'),
      'username' => env('CENTRAL_DB_USERNAME', 'forge'),
      'password' => env('CENTRAL_DB_PASSWORD', ''),
      'charset' => 'utf8',
      'prefix' => '',
      'prefix_indexes' => true,
      'schema' => 'public',
      'sslmode' => 'prefer',
  ],
  ```

### 4. Organize Migrations

- [ ] **Create Migration Directories**
  ```bash
  mkdir -p database/migrations/central
  mkdir -p database/migrations/tenant
  ```

- [ ] **Move Existing Migrations**
  ```bash
  # Move all existing migrations to tenant directory
  mv database/migrations/*.php database/migrations/tenant/
  ```

- [ ] **Create Central Migrations**
  - [ ] Create accounts table migration
  - [ ] Create domains table migration
  - [ ] Create plans and features tables migration
  - [ ] Create subscriptions table migration
  - [ ] Create system_admins table migration
  - [ ] Create audit_logs table migration

### 5. Update Models

#### Model Updates Checklist

- [ ] **Create Account Model**
  ```php
  // app/Models/Account.php
  namespace App\Models;
  
  use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
  use Stancl\Tenancy\Contracts\TenantWithDatabase;
  use Stancl\Tenancy\Database\Concerns\HasDatabase;
  use Stancl\Tenancy\Database\Concerns\HasDomains;
  ```

- [ ] **Update User Model**
  - [ ] Remove any central database connections
  - [ ] Ensure soft deletes work with tenant context
  - [ ] Update administrator check to be tenant-aware

- [ ] **Update All Other Models** (Check each one):
  - [ ] Asset
  - [ ] WorkOrder
  - [ ] WorkOrderExecution
  - [ ] ManufacturingOrder
  - [ ] ManufacturingStep
  - [ ] ManufacturingRoute
  - [ ] Item
  - [ ] BillOfMaterial
  - [ ] WorkCell
  - [ ] Team
  - [ ] Form
  - [ ] Routine
  - [ ] Part
  - [ ] Shift
  - [ ] Plant
  - [ ] Area
  - [ ] Sector

#### For Each Model Update:
- [ ] Remove `protected $connection` if present
- [ ] Add tenant-aware scopes if needed
- [ ] Update relationships to respect tenant boundaries
- [ ] Check for any cross-tenant references

## Application Structure Updates

### 6. Middleware Updates

- [ ] **Update bootstrap/app.php**
  ```php
  ->withMiddleware(function (Middleware $middleware) {
      $middleware->group('tenant', [
          InitializeTenancyByDomain::class,
          PreventAccessFromCentralDomains::class,
          EnsureTenantIsActive::class,
          EnforceReadOnlyMode::class,
          CheckSubscriptionStatus::class,
      ]);
  })
  ```

- [ ] **Create Tenant Middleware**
  - [ ] EnsureTenantIsActive
  - [ ] EnforceReadOnlyMode
  - [ ] CheckSubscriptionStatus
  - [ ] ValidateResourceLimits

- [ ] **Update Existing Middleware**
  - [ ] HandleInertiaRequests - Add tenant data
  - [ ] Authenticate - Ensure tenant context
  - [ ] VerifyCsrfToken - Update for subdomains

### 7. Route Updates

- [ ] **Create Route Files**
  ```bash
  touch routes/tenant.php
  touch routes/admin.php
  touch routes/marketing.php
  ```

- [ ] **Move Routes**
  - [ ] Move all application routes to routes/tenant.php
  - [ ] Keep only landing/marketing in routes/web.php
  - [ ] Create admin routes in routes/admin.php

- [ ] **Update Route Service Provider**
  - [ ] Configure subdomain routing
  - [ ] Apply tenant middleware group
  - [ ] Set up domain-based route groups

### 8. Controller Updates

#### Authentication Controllers

- [ ] **AuthenticatedSessionController**
  - [ ] Ensure login works with tenant context
  - [ ] Update session handling for subdomains

- [ ] **RegisteredUserController**
  - [ ] Replace with TenantRegistrationController
  - [ ] Remove direct user registration

- [ ] **Create New Controllers**
  - [ ] TenantRegistrationController
  - [ ] SubdomainAvailabilityController
  - [ ] EmailVerificationController (tenant-aware)

#### Application Controllers

For each controller, check:
- [ ] Remove any hard-coded database connections
- [ ] Ensure all queries use tenant connection
- [ ] Update authorization to be tenant-aware
- [ ] Check for any cross-tenant data access

### 9. Service Updates

- [ ] **Create Tenancy Services**
  - [ ] AccountService
  - [ ] TenantDatabaseService
  - [ ] SubscriptionService
  - [ ] LimitEnforcementService
  - [ ] StorageService (tenant-aware)

- [ ] **Update Existing Services**
  - [ ] Media/BlurHashService - Add tenant prefix
  - [ ] Any report generation services
  - [ ] Export/Import services
  - [ ] Notification services

### 10. Job Updates

- [ ] **Create Base TenantAwareJob**
  ```php
  abstract class TenantAwareJob implements ShouldQueue
  {
      protected string $tenantId;
      
      public function handle(): void
      {
          $tenant = Account::find($this->tenantId);
          tenancy()->initialize($tenant);
          
          try {
              $this->handleTenantJob();
          } finally {
              tenancy()->end();
          }
      }
  }
  ```

- [ ] **Update All Jobs** to extend TenantAwareJob:
  - [ ] Email notification jobs
  - [ ] Report generation jobs
  - [ ] Data processing jobs
  - [ ] Scheduled maintenance jobs

### 11. Command Updates

- [ ] **Create Tenant Management Commands**
  - [ ] tenants:create
  - [ ] tenants:migrate
  - [ ] tenants:seed
  - [ ] tenants:list
  - [ ] tenants:backup
  - [ ] tenants:health-check

- [ ] **Update Existing Commands**
  - [ ] Add --tenant option where applicable
  - [ ] Ensure commands respect tenant context
  - [ ] Update data import/export commands

## Frontend Updates

### 12. React Component Updates

- [ ] **Update Layout Components**
  - [ ] Add tenant information display
  - [ ] Update navigation for tenant context
  - [ ] Add subscription/billing links

- [ ] **Create New Components**
  - [ ] SignupPage component
  - [ ] PlanSelector component
  - [ ] SubdomainInput component
  - [ ] BillingPortal component
  - [ ] SubscriptionStatus component

- [ ] **Update Existing Components**
  - [ ] Update API calls to use relative URLs
  - [ ] Remove any hard-coded domains
  - [ ] Add plan-based feature flags

### 13. API and AJAX Updates

- [ ] **Update All API Calls**
  - [ ] Use relative URLs (not absolute)
  - [ ] Ensure CSRF tokens work with subdomains
  - [ ] Update error handling for tenant-specific errors

- [ ] **Inertia Updates**
  - [ ] Update shared data to include tenant info
  - [ ] Add subscription status to shared data
  - [ ] Include feature flags in shared data

## Configuration Updates

### 14. Laravel Configuration

- [ ] **Update config/app.php**
  ```php
  'domain' => env('APP_DOMAIN', 'maintenance-os.com'),
  ```

- [ ] **Update config/session.php**
  ```php
  'domain' => env('SESSION_DOMAIN', null),
  'same_site' => 'lax',
  ```

- [ ] **Update config/cors.php**
  - [ ] Allow subdomains
  - [ ] Configure for tenant domains

- [ ] **Update config/filesystems.php**
  - [ ] Add tenant disk configuration
  - [ ] Update S3 configuration for prefixes

### 15. Environment Configuration

- [ ] **Update .env**
  - [ ] Add central database configuration
  - [ ] Update session domain
  - [ ] Add Stripe keys
  - [ ] Configure domain settings

- [ ] **Update .env.testing**
  - [ ] Configure test databases
  - [ ] Set appropriate test domains

## Testing Updates

### 16. Test Infrastructure

- [ ] **Update TestCase.php**
  ```php
  protected function setUp(): void
  {
      parent::setUp();
      
      // Initialize test tenant
      $this->tenant = Account::factory()->create();
      tenancy()->initialize($this->tenant);
  }
  
  protected function tearDown(): void
  {
      tenancy()->end();
      parent::tearDown();
  }
  ```

- [ ] **Create Tenant Test Helpers**
  - [ ] withTenant() method
  - [ ] actingAsTenant() method
  - [ ] assertTenantHas() assertions

### 17. Update Existing Tests

For each test file:
- [ ] Add tenant context in setUp
- [ ] Update database assertions to use tenant connection
- [ ] Fix route calls to include subdomain
- [ ] Update factory calls to be tenant-aware

Priority test files to update:
- [ ] AuthenticationTest
- [ ] RegistrationTest (replace with TenantRegistrationTest)
- [ ] UserManagementTest
- [ ] WorkOrderTest
- [ ] AssetManagementTest
- [ ] ProductionModuleTest

### 18. Create New Tests

- [ ] **Tenancy Tests**
  - [ ] TenantRegistrationTest
  - [ ] SubdomainRoutingTest
  - [ ] TenantIsolationTest
  - [ ] DatabaseCreationTest

- [ ] **Subscription Tests**
  - [ ] PlanManagementTest
  - [ ] SubscriptionFlowTest
  - [ ] LimitEnforcementTest
  - [ ] TrialExpirationTest

## Initial Data Setup

### 19. Seed Data Configuration

- [ ] **Create TenantDatabaseSeeder**
  - [ ] Roles and permissions
  - [ ] Units of measure
  - [ ] Asset types
  - [ ] Work order categories
  - [ ] Default settings

- [ ] **Create Central Database Seeders**
  - [ ] Plans and pricing
  - [ ] Feature configurations
  - [ ] Resource limits
  - [ ] System admin accounts

### 20. Fresh Installation Scripts

- [ ] **Create Installation Command**
  ```php
  // Command to set up fresh multi-tenant system
  class InstallMultiTenantSystem extends Command
  {
      public function handle()
      {
          // 1. Create central database
          // 2. Run central migrations
          // 3. Seed central data
          // 4. Verify system ready
      }
  }
  ```

- [ ] **Create Demo Account Script** (Optional)
  ```php
  // Command to create demo tenant for testing
  class CreateDemoTenant extends Command
  {
      public function handle()
      {
          // 1. Create demo account
          // 2. Set up demo database
          // 3. Seed with sample data
          // 4. Output access details
      }
  }
  ```

## Storage and Media

### 21. File Storage Updates

- [ ] **Update Media Library Configuration**
  - [ ] Add tenant path prefix
  - [ ] Update URL generation
  - [ ] Configure S3 paths

- [ ] **Configure Storage Structure**
  - [ ] Set up tenant directory structure
  - [ ] Configure S3 bucket prefixes
  - [ ] Test file isolation

- [ ] **Update File Upload Handling**
  - [ ] Add tenant directory structure
  - [ ] Update file validation
  - [ ] Implement storage quotas

## Security Updates

### 22. Authentication and Authorization

- [ ] **Update Auth Guards**
  - [ ] Configure tenant user guard
  - [ ] Add admin portal guard
  - [ ] Update API authentication

- [ ] **Update Policies**
  - [ ] Add tenant checks to all policies
  - [ ] Prevent cross-tenant access
  - [ ] Update role-based checks

- [ ] **Update Gates**
  - [ ] Add tenant context to gates
  - [ ] Implement feature-based gates
  - [ ] Add subscription gates

### 23. Security Middleware

- [ ] **Create Security Middleware**
  - [ ] ValidateTenantAccess
  - [ ] EnforceHttps
  - [ ] ValidateSubscription

- [ ] **Update CORS Configuration**
  - [ ] Allow tenant subdomains
  - [ ] Configure for API access
  - [ ] Set appropriate headers

## Performance Optimization

### 24. Caching Strategy

- [ ] **Implement Tenant Cache Keys**
  ```php
  Cache::tags(['tenant:' . tenant()->id])->remember($key, $ttl, $callback);
  ```

- [ ] **Update Cache Usage**
  - [ ] Add tenant prefixes to cache keys
  - [ ] Implement cache tagging
  - [ ] Update cache clearing logic

### 25. Query Optimization

- [ ] **Add Indexes**
  - [ ] Add tenant_id indexes where applicable
  - [ ] Optimize common query patterns
  - [ ] Review and optimize slow queries

- [ ] **Implement Query Caching**
  - [ ] Cache expensive calculations
  - [ ] Implement model caching
  - [ ] Add query result caching

## Deployment Preparation

### 26. Infrastructure Updates

- [ ] **Database Server**
  - [ ] Configure connection pooling
  - [ ] Set up automated backups
  - [ ] Plan scaling strategy

- [ ] **Application Server**
  - [ ] Update nginx/Apache configuration
  - [ ] Configure subdomain handling
  - [ ] Set up SSL wildcard certificate

### 27. Monitoring Setup

- [ ] **Application Monitoring**
  - [ ] Configure error tracking by tenant
  - [ ] Set up performance monitoring
  - [ ] Create tenant-specific dashboards

- [ ] **Database Monitoring**
  - [ ] Monitor connection counts
  - [ ] Track database sizes
  - [ ] Set up slow query alerts

### 28. Backup Strategy

- [ ] **Implement Backup System**
  - [ ] Central database backups
  - [ ] Per-tenant database backups
  - [ ] File storage backups
  - [ ] Automated backup verification

## Final Checks

### 29. Code Quality

- [ ] **Run Static Analysis**
  ```bash
  ./vendor/bin/phpstan analyse
  ./vendor/bin/pint --test
  ```

- [ ] **Run Tests**
  ```bash
  php artisan test
  php artisan test --parallel
  ```

- [ ] **Check Code Coverage**
  ```bash
  php artisan test --coverage
  ```

### 30. Documentation

- [ ] **Update README.md**
  - [ ] Multi-tenant setup instructions
  - [ ] Development environment setup
  - [ ] Deployment instructions

- [ ] **Create Admin Documentation**
  - [ ] Account management guide
  - [ ] Billing configuration
  - [ ] Troubleshooting guide

- [ ] **Update API Documentation**
  - [ ] Tenant authentication
  - [ ] Rate limiting
  - [ ] New endpoints

## Post-Migration

### 31. Verification

- [ ] **Test Critical Flows**
  - [ ] Account registration
  - [ ] User login/logout
  - [ ] Data isolation
  - [ ] File uploads
  - [ ] Background jobs
  - [ ] Email notifications

- [ ] **Performance Testing**
  - [ ] Load testing with multiple tenants
  - [ ] Database connection testing
  - [ ] Cache performance
  - [ ] Storage performance

### 32. Rollback Plan

- [ ] **Document Rollback Steps**
  - [ ] Code rollback process
  - [ ] Central database cleanup
  - [ ] Environment variable restoration
  - [ ] Communication plan

- [ ] **Test Rollback Procedure**
  - [ ] Practice in staging
  - [ ] Document timing
  - [ ] Verify clean state

## Migration Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| Preparation | Items 1-2 | 1 day | - |
| Database Setup | Items 3-5 | 3 days | Preparation |
| Core Updates | Items 6-11 | 5 days | Database Setup |
| Frontend Updates | Items 12-13 | 3 days | Core Updates |
| Configuration | Items 14-15 | 1 day | Core Updates |
| Testing Updates | Items 16-18 | 3 days | All Updates |
| Initial Data Setup | Items 19-21 | 1 day | Testing |
| Security & Performance | Items 22-25 | 2 days | Initial Data Setup |
| Deployment Prep | Items 26-28 | 2 days | All Above |
| Final Verification | Items 29-32 | 2 days | Deployment Prep |

**Total Estimated Duration: 23 days**

## Critical Path Items

These items must be completed in order:

1. Package installation and configuration
2. Database structure creation
3. Model updates for tenancy
4. Middleware implementation
5. Route reorganization
6. Authentication updates
7. Testing infrastructure
8. Initial data seeders
9. Production deployment

## Risk Mitigation

### High-Risk Areas

1. **Authentication System**
   - Risk: Users unable to create or access accounts
   - Mitigation: Thorough testing, staging environment validation

2. **Database Creation**
   - Risk: Tenant database creation failures
   - Mitigation: Automated retry mechanisms, proper error handling

3. **Performance Impact**
   - Risk: Slower response times with multiple tenants
   - Mitigation: Connection pooling, caching strategy, load testing

4. **Subdomain Routing**
   - Risk: DNS or routing configuration issues
   - Mitigation: Wildcard DNS setup, comprehensive routing tests

## Success Criteria

- [ ] All tests passing
- [ ] Fresh system deployed successfully
- [ ] Performance benchmarks established
- [ ] All tenants properly isolated
- [ ] Billing system functional
- [ ] No security vulnerabilities
- [ ] Complete documentation
- [ ] Successful staging deployment
- [ ] First tenant account created successfully

## Notes Section

Use this section to track specific issues, decisions, or customizations during migration:

```
Date: ___________
Issue: 
Resolution:
```

---

This checklist should be reviewed and updated throughout the migration process. Each checked item should be verified by at least one other team member.
