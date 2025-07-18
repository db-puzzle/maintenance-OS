# Comprehensive Testing Guide

This document outlines the complete testing strategy and procedures for the Maintenance OS system, including database migrations, feature tests, and integration tests.

## Quick Test Commands

### Full Test Suite with Fresh Migration
```bash
# Complete test cycle - fresh database with seeding
php artisan migrate:fresh --env=testing --seed && php artisan test

# Quick test run (uses existing test database)
php artisan test

# Test specific feature areas
php artisan test --filter=Permission
php artisan test --filter=WorkOrder
php artisan test --filter=Asset
php artisan test --filter=User
```

### Test-Specific Database Setup
```bash
# Set up clean test environment
php artisan config:cache --env=testing
php artisan migrate:fresh --env=testing --seed

# Run tests with fresh database (slower but ensures clean state)
php artisan test --recreate-databases
```

## Test Categories

### 1. Work Order Management Tests
```bash
# All work order related tests
php artisan test tests/Feature/WorkOrders/

# Specific work order test classes
php artisan test tests/Feature/WorkOrders/WorkOrderUpdateTest.php
php artisan test tests/Feature/WorkOrders/WorkOrderSystemTest.php

# Critical work order update functionality
php artisan test --filter="admin_can_update_work_order_with_all_fields"
php artisan test --filter="update_preserves_fields_not_sent"
php artisan test --filter="cannot_update_work_order_in_progress_with_restricted_fields"
php artisan test --filter="validation_errors_for_invalid_data"
```

**Work Order Update Tests Coverage:**
- ✅ Field validation and updating (title, description, priority_score, etc.)
- ✅ Status-based update restrictions
- ✅ Data preservation for fields not sent in update
- ✅ Validation error handling
- ✅ Asset relationship updates
- ✅ Category and type changes
- ✅ Due date and scheduling updates
- ✅ Boolean flags (downtime_required, warranty_claim)

### 2. Permission System Tests
```bash
# All permission-related tests
php artisan test tests/Feature/Permission/

# Critical permission scenarios
php artisan test tests/Feature/Permission/AdministratorProtectionTest.php
php artisan test tests/Feature/Permission/AreaPermissionTest.php
```

### 3. Asset Hierarchy Tests
```bash
# Asset management tests
php artisan test tests/Feature/Models/AssetIntegrationTest.php
php artisan test tests/Unit/Models/AssetHierarchy/
```

### 4. Authentication & User Management Tests
```bash
# Authentication flow tests
php artisan test tests/Feature/Auth/
php artisan test tests/Feature/Settings/
```

## Database Migration Testing

### Migration Validation Process
```bash
# 1. Test fresh migration
php artisan migrate:fresh --env=testing
php artisan db:seed --env=testing

# 2. Verify database structure
php artisan tinker
# In tinker:
Schema::getColumnListing('work_orders');
Schema::getColumnListing('users');
Schema::getColumnListing('assets');

# 3. Run all tests to verify migrations work
php artisan test

# 4. Test migration rollback (if needed)
php artisan migrate:rollback --env=testing
php artisan migrate --env=testing
```

### Critical Migration Points
- **Work Orders Table**: Verify all fields exist and have correct types
- **Permissions**: Ensure all permission relationships are properly seeded
- **Asset Hierarchy**: Validate plant → area → sector → asset relationships
- **Foreign Keys**: Check all relationships are properly constrained

## Test Environment Configuration

### Database Setup
```bash
# Ensure test database is configured in .env.testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
# OR for persistent test database:
DB_DATABASE=maintenance_os_test
```

### Required Seeders for Testing
```bash
# Essential seeders that must run for tests to pass
php artisan db:seed --class=RoleSeeder --env=testing
php artisan db:seed --class=PermissionSeeder --env=testing
php artisan db:seed --class=WorkOrderTypeSeeder --env=testing
php artisan db:seed --class=CertificationSeeder --env=testing
```

## New Test Implementation Guidelines

### Work Order Update Tests (Recently Added)
The `WorkOrderUpdateTest` class validates critical work order update functionality that was previously failing silently:

**Test Cases:**
1. **`test_admin_can_update_work_order_with_all_fields`**
   - Validates all form fields are properly saved
   - Ensures validation rules accept valid data
   - Verifies database persistence

2. **`test_update_preserves_fields_not_sent`**
   - Prevents accidental data loss during partial updates
   - Validates Laravel's mass assignment works correctly

3. **`test_cannot_update_work_order_in_progress_with_restricted_fields`**
   - Enforces business rules based on work order status
   - Prevents unauthorized field modifications

4. **`test_validation_errors_for_invalid_data`**
   - Validates form validation rules work correctly
   - Prevents invalid data from being saved

### Adding New Tests
When adding new tests, ensure they include:

1. **Proper Setup**: Use factories and seeders appropriately
2. **Authentication**: Set up user context before testing
3. **Data Validation**: Test both valid and invalid scenarios
4. **Cleanup**: Use `RefreshDatabase` trait for isolation
5. **Assertions**: Verify both success and failure cases

## Performance Testing

### Database Performance
```bash
# Test with larger datasets
php artisan tinker
# Create 1000+ work orders, assets, etc. and run tests

# Monitor query performance
php artisan telescope:clear
# Run tests and check Telescope for N+1 queries
```

### Memory Usage
```bash
# Run tests with memory monitoring
php -d memory_limit=128M artisan test --filter=WorkOrder
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      
      - name: Install Dependencies
        run: |
          composer install --no-interaction --prefer-dist
          npm ci
      
      - name: Setup Environment
        run: |
          cp .env.testing.example .env.testing
          php artisan key:generate --env=testing
      
      - name: Run Migration and Tests
        run: |
          php artisan migrate:fresh --env=testing --seed
          php artisan test
      
      - name: Frontend Tests
        run: npm run test
```

## Troubleshooting Common Test Issues

### 1. Migration Failures
```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Reset test database
php artisan migrate:fresh --env=testing --seed
```

### 2. Permission Test Failures
```bash
# Verify roles and permissions are seeded
php artisan tinker
Role::count(); // Should be > 0
Permission::count(); // Should be > 0
```

### 3. Factory Failures
```bash
# Check if all required factories exist and have correct relationships
# Ensure foreign key constraints are satisfied
```

### 4. Work Order Update Test Failures
If work order update tests fail, check:
- `UpdateWorkOrderRequest` validation rules are complete
- Work order model `$fillable` array includes all necessary fields
- Database schema matches expected fields
- User has proper permissions

## Test Data Management

### Using Factories Effectively
```php
// Create related data properly
$plant = Plant::factory()->create();
$area = Area::factory()->create(['plant_id' => $plant->id]);
$asset = Asset::factory()->create(['area_id' => $area->id]);
$workOrder = WorkOrder::factory()->create(['asset_id' => $asset->id]);
```

### Seeder Dependencies
Ensure seeders run in correct order:
1. Roles and Permissions
2. Users
3. Plants/Areas/Sectors
4. Assets
5. Work Order Types
6. Work Orders

## Reporting and Monitoring

### Test Coverage
```bash
# Generate test coverage report (requires Xdebug)
php artisan test --coverage
php artisan test --coverage-html coverage-report
```

### Performance Metrics
Monitor test execution time and database query counts to catch performance regressions early.

## Maintenance Commands

### Regular Test Maintenance
```bash
# Weekly: Full test suite with fresh database
php artisan migrate:fresh --env=testing --seed && php artisan test

# Before deployment: Full test suite
php artisan test --stop-on-failure

# After schema changes: Verify migrations and run tests
php artisan migrate:fresh --env=testing --seed && php artisan test tests/Feature/
``` 