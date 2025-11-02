# Multi-Tenancy Master Implementation Guide

## Overview

This guide breaks down the multi-tenancy implementation into manageable phases. Each phase is designed to be self-contained and can be completed independently by AI agents. Follow the phases in order for best results.

**Total Estimated Time:** ~10-12 hours (vs 23 days for custom implementation)

## Implementation Phases

### Phase 1: Foundation Setup (2 hours)
**Goal:** Install and configure Laravel Tenancy package with basic setup

#### Prerequisites
- Laravel 12 application running
- PostgreSQL database server accessible
- Composer installed

#### Tasks
1. **Install Laravel Tenancy Package**
   ```bash
   composer require stancl/tenancy
   php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=config
   php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=migrations
   ```

2. **Update Environment Configuration**
   - File: `.env`
   - Add:
     ```env
     CENTRAL_DOMAINS="localhost,maintenance-os.com,www.maintenance-os.com,admin.maintenance-os.com"
     SESSION_DOMAIN=.maintenance-os.com
     ```

3. **Create Central Database**
   ```bash
   createdb maintenance_os_central -O postgres -E UTF8
   ```

4. **Configure Database Connections**
   - File: `config/database.php`
   - Add central connection configuration
   - Keep existing connection as tenant template

5. **Create Basic Account Model**
   - File: `app/Models/Account.php`
   - Extend Laravel Tenancy base model
   - Implement TenantWithDatabase interface

#### Verification
- [ ] Package installed successfully
- [ ] Central database created
- [ ] Config files published
- [ ] Account model created

#### Required Tests
```php
// tests/Feature/MultiTenancy/Foundation/PackageInstallationTest.php
- test_laravel_tenancy_package_is_installed()
- test_tenancy_config_file_exists()
- test_central_database_connection_works()
- test_account_model_extends_correct_base_class()
- test_account_model_implements_required_interfaces()

// tests/Feature/MultiTenancy/Foundation/EnvironmentConfigurationTest.php
- test_central_domains_are_configured()
- test_session_domain_is_configured_for_subdomains()
- test_environment_variables_are_set_correctly()
```

#### References
- `docs/MultiTenancy/COMPREHENSIVE_IMPLEMENTATION_SPECIFICATION_OPTIMIZED.md` (Lines 45-98)

---

### Phase 2: Database Architecture (1.5 hours)
**Goal:** Configure automatic database management for tenants

#### Prerequisites
- Phase 1 completed
- Central database accessible

#### Tasks
1. **Configure Tenancy Features**
   - File: `config/tenancy.php`
   - Enable automatic database creation/deletion
   - Configure migration parameters
   - Set up seeding configuration

2. **Organize Migrations**
   - Create directories:
     ```bash
     mkdir -p database/migrations/central
     mkdir -p database/migrations/tenant
     ```
   - Move existing migrations to `tenant/` directory
   - Create central migrations (accounts, domains, subscriptions)

3. **Run Central Migrations**
   ```bash
   php artisan migrate --database=central --path=database/migrations/central
   ```

4. **Configure Bootstrappers**
   - Enable DatabaseTenancyBootstrapper
   - Configure connection switching

#### Verification
- [ ] Central tables created (accounts, domains)
- [ ] Tenant migrations organized
- [ ] Test tenant creation creates database automatically

#### Required Tests
```php
// tests/Feature/MultiTenancy/Database/TenantDatabaseManagementTest.php
- test_tenant_creation_creates_database_automatically()
- test_database_naming_convention_follows_configuration()
- test_database_creation_failure_is_handled_gracefully()
- test_database_permissions_are_verified()
- test_connection_switching_after_creation()
- test_database_character_set_and_collation()

// tests/Feature/MultiTenancy/Database/MigrationManagementTest.php
- test_initial_tenant_migration_execution()
- test_migration_rollback_functionality()
- test_migration_status_tracking()
- test_failed_migration_handling()
- test_migration_in_transaction_mode()
- test_custom_migration_path_resolution()

// tests/Feature/MultiTenancy/Database/SeedingTest.php
- test_automatic_seeding_on_creation()
- test_conditional_seeding_based_on_configuration()
- test_admin_user_creation_from_metadata()
- test_default_data_seeding()
- test_seeding_error_handling()
- test_seeding_idempotency()

// tests/Feature/MultiTenancy/Events/DatabaseEventsTest.php
- test_database_created_event_dispatched()
- test_database_migrated_event_dispatched()
- test_database_seeded_event_dispatched()
- test_event_listener_execution_order()
- test_event_failure_handling()
```

#### References
- `docs/MultiTenancy/Implementation_Guides/02_DATABASE_AND_MIGRATIONS_OPTIMIZED.md`

---

### Phase 3: Routing & Middleware (1.5 hours)
**Goal:** Set up subdomain-based tenant identification and routing

#### Prerequisites
- Phase 2 completed
- Subdomain DNS configured (*.maintenance-os.com)

#### Tasks
1. **Configure Middleware Groups**
   - File: `bootstrap/app.php`
   - Add tenant middleware group
   - Configure domain identification middleware

2. **Create Route Files**
   ```bash
   touch routes/tenant.php
   touch routes/central.php
   ```

3. **Separate Routes**
   - Move all application routes to `routes/tenant.php`
   - Keep auth and admin routes in `routes/central.php`
   - Update route service provider

4. **Implement Domain Validation**
   - Create subdomain validation rules
   - Add reserved subdomain list
   - Simple unique check against domains table

#### Verification
- [ ] Subdomain routing works
- [ ] Central domain shows different content
- [ ] 404 on invalid subdomains

#### Required Tests
```php
// tests/Feature/MultiTenancy/Routing/SubdomainResolutionTest.php
- test_valid_subdomain_identification()
- test_invalid_subdomain_handling()
- test_missing_subdomain_handling()
- test_central_domain_access()
- test_subdomain_case_sensitivity()
- test_subdomain_with_hyphens_and_numbers()

// tests/Feature/MultiTenancy/Routing/MiddlewareTest.php
- test_initialize_tenancy_by_domain_middleware()
- test_prevent_access_from_central_domains_middleware()
- test_tenant_context_initialization()
- test_middleware_ordering()
- test_middleware_exception_handling()

// tests/Feature/MultiTenancy/Routing/DomainValidationTest.php
- test_subdomain_format_validation()
- test_reserved_subdomain_rejection()
- test_duplicate_subdomain_prevention()
- test_dns_compliant_subdomain_validation()
- test_special_character_handling_in_subdomains()
- test_subdomain_length_constraints()

// tests/Feature/MultiTenancy/Routing/RouteIsolationTest.php
- test_tenant_routes_only_accessible_with_subdomain()
- test_central_routes_only_accessible_on_central_domain()
- test_404_response_for_non_existent_tenants()
- test_route_caching_with_tenant_routes()
```

#### References
- `docs/MultiTenancy/Implementation_Guides/01_TENANT_IDENTIFICATION_AND_ROUTING_OPTIMIZED.md`

---

### Phase 4: Core Models & Relationships (2 hours)
**Goal:** Migrate existing models to multi-tenant architecture

#### Prerequisites
- Phase 3 completed
- Tenant context switching working

#### Tasks
1. **Update All Models**
   - Remove `protected $connection` properties
   - Remove any tenant_id scoping
   - Ensure no hardcoded database references

2. **Update Model Relationships**
   - Review all belongsTo/hasMany relationships
   - Ensure they work within tenant context
   - No cross-tenant relationships

3. **Configure Tenant-Specific Models**
   - User, Asset, WorkOrder, etc.
   - Keep business logic unchanged
   - Let package handle scoping

4. **Update Factories**
   - Remove tenant_id from factories
   - Ensure they work in tenant context

#### Verification
- [ ] Models work in tenant context
- [ ] No cross-tenant data leakage
- [ ] Factories create tenant-scoped data

#### Required Tests
```php
// tests/Feature/MultiTenancy/Models/DataIsolationTest.php
- test_user_cannot_access_other_tenant_data()
- test_api_endpoints_respect_tenant_boundaries()
- test_model_queries_are_automatically_scoped()
- test_no_cross_tenant_relationships()
- test_tenant_data_completely_isolated()

// tests/Feature/MultiTenancy/Models/ModelOperationsTest.php
- test_model_creation_in_tenant_context()
- test_model_updates_in_tenant_context()
- test_model_deletion_in_tenant_context()
- test_bulk_operations_respect_tenant_context()
- test_eager_loading_respects_tenant_boundaries()

// tests/Unit/MultiTenancy/Models/FactoryTest.php
- test_factories_create_tenant_scoped_data()
- test_factories_work_without_tenant_id()
- test_factory_relationships_stay_within_tenant()
- test_seeder_creates_correct_tenant_data()

// tests/Feature/MultiTenancy/Models/RelationshipTest.php
- test_belongs_to_relationships_work_correctly()
- test_has_many_relationships_scoped_to_tenant()
- test_many_to_many_relationships_isolated()
- test_polymorphic_relationships_respect_tenant()
```

#### References
- Existing model files in `app/Models/`

---

### Phase 5: Authentication & Users (1.5 hours)
**Goal:** Implement tenant-scoped authentication system

#### Prerequisites
- Phase 4 completed
- User model updated

#### Tasks
1. **Configure Session Handling**
   - Update session configuration for subdomains
   - Ensure sessions are tenant-isolated

2. **Implement First User Admin Logic**
   - Update user creation logic [[memory:1047760]]
   - First user in tenant becomes admin
   - Add to UserObserver

3. **Update Authentication Controllers**
   - Ensure login works per tenant
   - Update registration if needed
   - Configure password resets

4. **Create User Invitation System**
   - Tenant admins can invite users
   - Email contains tenant subdomain
   - Implement UserInvitationMail updates

#### Verification
- [ ] Can login to different tenants separately
- [ ] First user has admin role
- [ ] Invitations work with correct subdomain

#### Required Tests
```php
// tests/Feature/MultiTenancy/Auth/AuthenticationTest.php
- test_users_can_login_to_their_tenant_only()
- test_login_fails_with_wrong_tenant_subdomain()
- test_session_isolation_between_tenants()
- test_remember_me_works_per_tenant()
- test_logout_only_affects_current_tenant()

// tests/Feature/MultiTenancy/Auth/FirstUserAdminTest.php
- test_first_user_created_becomes_admin()
- test_subsequent_users_are_not_admin()
- test_first_user_gets_all_permissions()
- test_admin_role_assignment_is_automatic()

// tests/Feature/MultiTenancy/Auth/UserInvitationTest.php
- test_admin_can_send_user_invitations()
- test_invitation_email_contains_tenant_subdomain()
- test_invitation_link_directs_to_correct_tenant()
- test_invitation_can_be_accepted()
- test_expired_invitations_are_rejected()

// tests/Feature/MultiTenancy/Auth/PasswordResetTest.php
- test_password_reset_scoped_to_tenant()
- test_reset_token_only_works_for_correct_tenant()
- test_password_reset_email_has_tenant_url()
```

---

### Phase 6: Jobs & Queues (1 hour)
**Goal:** Make background jobs tenant-aware

#### Prerequisites
- Phase 5 completed
- Queue workers running

#### Tasks
1. **Update Existing Jobs**
   - Implement TenantAware interface
   - Add `public ?string $tenantId = null`
   - Remove manual context switching

2. **Configure Queue Bootstrapper**
   - Enable QueueTenancyBootstrapper
   - Test job dispatch from tenant context

3. **Update Job Dispatching**
   - Ensure jobs capture tenant context
   - Test email sending jobs
   - Verify PDF generation jobs

#### Verification
- [ ] Jobs run in correct tenant context
- [ ] Emails sent with correct tenant data
- [ ] Queue worker handles multiple tenants

#### Required Tests
```php
// tests/Unit/MultiTenancy/Jobs/TenantAwareJobTest.php
- test_tenant_aware_interface_implementation()
- test_automatic_tenant_id_capture()
- test_tenant_context_preservation()
- test_job_serialization_with_tenant_data()

// tests/Feature/MultiTenancy/Jobs/JobExecutionTest.php
- test_job_execution_in_correct_tenant_context()
- test_job_failure_handling_preserves_context()
- test_job_retry_maintains_tenant_context()
- test_queued_job_tenant_switching()
- test_job_batching_with_tenant_context()

// tests/Feature/MultiTenancy/Jobs/BackgroundProcessingTest.php
- test_maintenance_jobs_run_per_tenant()
- test_scheduled_tasks_execute_in_tenant_context()
- test_cron_jobs_respect_tenant_boundaries()
- test_job_monitoring_shows_tenant_info()

// tests/Feature/MultiTenancy/Jobs/EmailJobsTest.php
- test_email_jobs_use_tenant_data()
- test_notification_jobs_scoped_to_tenant()
- test_bulk_email_respects_tenant_boundaries()
```

#### References
- `docs/MultiTenancy/COMPREHENSIVE_IMPLEMENTATION_SPECIFICATION_OPTIMIZED.md` (Lines 355-394)

---

### Phase 7: Storage & Media (1 hour)
**Goal:** Configure tenant-isolated file storage

#### Prerequisites
- Phase 6 completed
- S3 or local storage configured

#### Tasks
1. **Configure Filesystem Bootstrapper**
   - Enable FilesystemTenancyBootstrapper
   - Configure path prefixing for disks

2. **Update Media Library**
   - Ensure Spatie Media Library works per tenant
   - Test image uploads
   - Verify path isolation

3. **Update File Upload Controllers**
   - Remove any manual path prefixing
   - Let package handle isolation

4. **Test Storage Operations**
   - Upload files as different tenants
   - Verify isolation
   - Test file retrieval

#### Verification
- [ ] Files stored in tenant-specific paths
- [ ] No cross-tenant file access
- [ ] Media library working correctly

#### Required Tests
```php
// tests/Feature/MultiTenancy/Storage/PathIsolationTest.php
- test_automatic_path_prefixing()
- test_file_upload_isolation()
- test_file_retrieval_with_tenant_context()
- test_cross_tenant_file_access_prevention()
- test_public_private_file_separation()

// tests/Feature/MultiTenancy/Storage/S3IntegrationTest.php
- test_s3_path_prefixing()
- test_s3_file_operations()
- test_presigned_url_generation()
- test_bucket_policy_enforcement()
- test_s3_file_deletion()

// tests/Feature/MultiTenancy/Storage/MediaLibraryTest.php
- test_media_upload_per_tenant()
- test_media_url_generation_includes_tenant()
- test_media_deletion_on_tenant_removal()
- test_media_conversion_queues_respect_tenant()
- test_media_collections_isolated_per_tenant()

// tests/Feature/MultiTenancy/Storage/FileOperationsTest.php
- test_file_exists_checks_tenant_scope()
- test_file_copy_within_tenant()
- test_file_move_respects_boundaries()
- test_directory_listing_tenant_scoped()
```

---

### Phase 8: Cache & Performance (1 hour)
**Goal:** Implement tenant-specific caching strategy

#### Prerequisites
- Phase 7 completed
- Redis/Cache driver configured

#### Tasks
1. **Configure Cache Bootstrapper**
   - Enable CacheTenancyBootstrapper
   - Enable PrefixCacheTenancyBootstrapper

2. **Implement Cache Tags Strategy**
   - Use cache tags for tenant data
   - Pattern: `Cache::tags(['tenant', $tenantId, 'type'])`
   - Update existing cache calls

3. **Add Tenant Statistics Caching**
   - Cache database stats
   - Cache user counts
   - Implement cache clearing methods

4. **Configure Redis Prefixing**
   - Enable RedisTenancyBootstrapper if using Redis
   - Test cache isolation

#### Verification
- [ ] Cache keys are tenant-prefixed
- [ ] Cache tags working
- [ ] No cache collision between tenants

#### Required Tests
```php
// tests/Unit/MultiTenancy/Cache/CachePrefixingTest.php
- test_automatic_cache_key_prefixing()
- test_cache_retrieval_isolation()
- test_cache_flush_per_tenant()
- test_cache_tags_with_tenant_context()

// tests/Feature/MultiTenancy/Cache/CacheOperationsTest.php
- test_remember_functionality_per_tenant()
- test_cache_expiration_respected()
- test_cache_warming_strategies()
- test_cache_invalidation_per_tenant()
- test_cache_tags_flush_only_tenant_data()

// tests/Feature/MultiTenancy/Cache/RedisIntegrationTest.php
- test_redis_key_prefixing()
- test_redis_pub_sub_isolation()
- test_redis_queue_isolation()
- test_redis_session_storage_isolation()

// tests/Performance/MultiTenancy/CachePerformanceTest.php
- test_cache_lookup_performance()
- test_cache_tag_performance()
- test_bulk_cache_operations()
- test_cache_memory_usage()
```

---

### Phase 9: Admin Portal (1.5 hours)
**Goal:** Create central admin interface for tenant management

#### Prerequisites
- Phase 8 completed
- Admin authentication working

#### Tasks
1. **Create Admin Controllers**
   - `app/Http/Controllers/Admin/TenantController.php`
   - CRUD operations for tenants
   - Tenant statistics dashboard

2. **Build Admin Views**
   - Tenant listing page
   - Tenant creation form
   - Statistics dashboard
   - Use existing UI components

3. **Implement Tenant Management**
   - Create tenant with subdomain
   - View tenant statistics
   - Suspend/activate tenants
   - Delete tenant (with confirmation)

4. **Add Impersonation Feature**
   - Admin can "login as" tenant
   - Proper security checks
   - Clear return mechanism

#### Verification
- [ ] Can create new tenants
- [ ] Statistics display correctly
- [ ] Impersonation works safely

#### Required Tests
```php
// tests/Feature/MultiTenancy/Admin/TenantManagementTest.php
- test_admin_can_list_all_tenants_with_pagination()
- test_admin_can_search_tenants()
- test_admin_can_filter_tenants_by_status()
- test_admin_can_view_tenant_details()
- test_admin_can_perform_bulk_operations()

// tests/Feature/MultiTenancy/Admin/TenantCrudTest.php
- test_admin_can_create_new_tenant()
- test_tenant_creation_validates_subdomain()
- test_admin_can_update_tenant_details()
- test_admin_can_suspend_tenant()
- test_admin_can_delete_tenant_with_confirmation()

// tests/Feature/MultiTenancy/Admin/MonitoringTest.php
- test_statistics_calculation_accuracy()
- test_health_check_functionality()
- test_real_time_monitoring_updates()
- test_alert_generation_for_issues()
- test_tenant_resource_usage_tracking()

// tests/Feature/MultiTenancy/Admin/ImpersonationTest.php
- test_admin_can_impersonate_tenant()
- test_impersonation_requires_permission()
- test_impersonation_session_handling()
- test_return_from_impersonation()
- test_audit_log_records_impersonation()

// tests/Feature/MultiTenancy/Admin/MaintenanceTest.php
- test_cache_clearing_per_tenant()
- test_maintenance_mode_toggle()
- test_backup_operations()
- test_restore_functionality()
- test_bulk_migration_commands()
```

---

### Phase 10: Testing & Cleanup (1 hour)
**Goal:** Update tests and remove obsolete code

#### Prerequisites
- All previous phases completed
- All features working

#### Tasks
1. **Update Test Suite**
   - Update `TestCase.php` for multi-tenancy
   - Add tenant setup in tests
   - Fix failing tests

2. **Remove Obsolete Code**
   - Delete unused single-tenant code
   - Remove hardcoded database references
   - Clean up old migrations

3. **Performance Testing**
   - Test with multiple tenants
   - Verify query performance
   - Check memory usage

4. **Documentation Updates**
   - Update README
   - Document tenant creation process
   - Add troubleshooting guide

#### Verification
- [ ] All tests passing
- [ ] No obsolete code remains
- [ ] Performance acceptable
- [ ] Documentation complete

#### Required Tests
```php
// tests/Feature/MultiTenancy/Integration/FullSystemTest.php
- test_complete_tenant_lifecycle()
- test_tenant_creation_to_deletion_flow()
- test_all_features_work_together()
- test_system_handles_concurrent_tenants()

// tests/Performance/MultiTenancy/LoadTest.php
- test_concurrent_tenant_creation()
- test_tenant_identification_performance()
- test_context_switching_overhead()
- test_database_connection_efficiency()
- test_system_with_100_tenants()
- test_system_with_1000_tenants()

// tests/Feature/MultiTenancy/Security/SecurityTest.php
- test_sql_injection_prevention()
- test_xss_prevention()
- test_csrf_protection_per_tenant()
- test_no_authentication_bypasses()
- test_no_authorization_flaws()

// tests/Feature/MultiTenancy/Upgrade/MigrationTest.php
- test_single_to_multi_tenant_migration()
- test_data_integrity_after_migration()
- test_rollback_procedure()
- test_zero_downtime_deployment()

// tests/Unit/MultiTenancy/Cleanup/ObsoleteCodeTest.php
- test_no_hardcoded_connections_remain()
- test_no_tenant_id_references()
- test_no_manual_scoping_code()
- test_all_models_use_tenant_context()
```

---

## Post-Implementation Checklist

### Essential Commands to Document
```bash
# Tenant management
php artisan tenants:list
php artisan tenants:migrate
php artisan tenants:seed
php artisan tenants:migrate-fresh --seed

# Maintenance
php artisan tenants:run cache:clear
php artisan tenants:run optimize
php artisan tenants:run down --message="Maintenance"
php artisan tenants:run up

# Targeted operations
php artisan tenants:run command --tenants=id1,id2
```

### Key Success Metrics
- [ ] Tenant creation < 5 seconds
- [ ] Zero custom database management code
- [ ] All existing features work per-tenant
- [ ] Admin can manage all tenants
- [ ] No data leakage between tenants

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Subdomain not working | Check DNS, clear route cache |
| Session not shared | Verify SESSION_DOMAIN in .env |
| Tenant not found | Check domains table, clear cache |
| Jobs failing | Ensure TenantAware interface implemented |
| Storage not isolated | Check filesystem bootstrapper config |

### Rollback Plan
1. Keep git branch of single-tenant version
2. Database backup before migration
3. Document any irreversible changes
4. Test rollback procedure on staging

---

## Additional Resources

- **Main Specification:** `docs/MultiTenancy/COMPREHENSIVE_IMPLEMENTATION_SPECIFICATION_OPTIMIZED.md`
- **Database Guide:** `docs/MultiTenancy/Implementation_Guides/02_DATABASE_AND_MIGRATIONS_OPTIMIZED.md`
- **Routing Guide:** `docs/MultiTenancy/Implementation_Guides/01_TENANT_IDENTIFICATION_AND_ROUTING_OPTIMIZED.md`
- **Migration Checklist:** `docs/MultiTenancy/Migration_Checklist/CODEBASE_MIGRATION_CHECKLIST_OPTIMIZED.md`
- **Laravel Tenancy Docs:** https://tenancyforlaravel.com/docs/v3/

---

**Remember:** Trust the package! Laravel Tenancy handles the complex infrastructure automatically. Focus on business logic and user experience rather than reinventing built-in features.
