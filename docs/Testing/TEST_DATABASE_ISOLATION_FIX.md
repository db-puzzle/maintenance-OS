# Test Database Isolation Fix

## Problem Summary

Tests were modifying development databases instead of isolated test databases because:

1. **Central database was hardcoded** in `config/database.php` to `maintenance_os_central`
2. **No environment variable support** for the central database in test configuration
3. **No safety checks** to prevent tests from running against production databases

This caused feature tests to impact both `maintenance_os_central` (dev) and tenant databases.

## Solution Implemented

### 1. Environment Variable Support for Central Database

**File:** `config/database.php`

Changed the central connection to use an environment variable:

```php
'central' => [
    // ... other config
    'database' => env('DB_CENTRAL_DATABASE', 'maintenance_os_central'),
],
```

This allows:
- **Development:** Uses default `maintenance_os_central`
- **Testing:** Uses `maintenance_os_central_test` (set in phpunit.xml)

### 2. Updated PHPUnit Configuration

**File:** `phpunit.xml`

Added test-specific environment variables:

```xml
<env name="DB_DATABASE" value="maintenance_os_test"/>
<env name="DB_CENTRAL_DATABASE" value="maintenance_os_central_test"/>
<env name="TENANCY_DB_TEMPLATE_CONNECTION" value="pgsql"/>
```

### 3. Safety Checks in Test Base Classes

Added `verifyTestDatabaseConfiguration()` method to all test base classes:

#### `tests/TestCase.php`
- Checks default database contains 'test'
- Throws exception if production database detected

#### `tests/CentralTestCase.php`
- Checks central database contains 'test'
- Prevents tests from running against `maintenance_os_central`

#### `tests/MultiTenancyTestCase.php`
- Checks both default and central databases contain 'test'
- Updated to use `env('DB_CENTRAL_DATABASE')` in config override
- Protects against both tenant and central database misconfigurations

## Test Database Names

| Environment | Default Database | Central Database |
|-------------|-----------------|------------------|
| **Development** | `maintenance_os_central` | `maintenance_os_central` |
| **Testing** | `maintenance_os_test` | `maintenance_os_central_test` |

## Next Steps

### 1. Create Test Databases

Before running tests, create the test databases:

```bash
# Create central test database
psql -U danilobibancos -c "CREATE DATABASE maintenance_os_central_test;"

# Create default test database (if not exists)
psql -U danilobibancos -c "CREATE DATABASE maintenance_os_test;"
```

### 2. Run Migrations on Test Databases

The test suite will handle migrations, but you can manually verify:

```bash
# Migrate central test database
php artisan migrate --database=central --path=database/migrations/central

# For tenant databases, the MultiTenancyTestCase will handle creation
```

### 3. Run Tests

Tests should now run against isolated test databases:

```bash
# Run all tests
php artisan test

# Run specific test file
php artisan test tests/Feature/Production/WorkCellTest.php

# Run with filter
php artisan test --filter=test_can_list_work_cells
```

### 4. Safety Verification

If tests are misconfigured, you'll see an error like:

```
DANGER: Tests are configured to use a production database!
Connection: pgsql
Database: maintenance_os_central
Expected database name to contain 'test'.
Please check your phpunit.xml configuration.
```

This prevents accidental data corruption in development databases.

## How It Works

### Test Execution Flow

1. **Test starts** → Base test class `setUp()` is called
2. **Safety check runs** → `verifyTestDatabaseConfiguration()` validates database names
3. **If database name doesn't contain 'test'** → Exception thrown, test aborted
4. **If database name contains 'test'** → Test continues safely
5. **Test runs** → Modifications only affect test databases
6. **Test ends** → Database is cleaned up (RefreshDatabase or truncation)

### Multi-Tenancy Tests

For `MultiTenancyTestCase`:

1. Central database checked: `maintenance_os_central_test` ✓
2. Default connection checked: `maintenance_os_test` ✓
3. Tenant databases created with prefix: `tenant_<uuid>` (created in test database)
4. Each test truncates tables, not drops databases (for performance)

## Benefits

✅ **Development databases are protected** from test modifications
✅ **Explicit test database configuration** via environment variables
✅ **Safety checks prevent accidents** before any damage is done
✅ **Clear error messages** guide developers to fix misconfigurations
✅ **No changes to existing test code** required

## Configuration Files Changed

1. `config/database.php` - Central connection now uses `DB_CENTRAL_DATABASE` env var
2. `phpunit.xml` - Added `DB_CENTRAL_DATABASE` and `TENANCY_DB_TEMPLATE_CONNECTION`
3. `tests/TestCase.php` - Added safety check for default database
4. `tests/CentralTestCase.php` - Added safety check for central database
5. `tests/MultiTenancyTestCase.php` - Added safety checks and env var usage

## Maintenance Notes

- **Never hardcode database names** in config files that are used across environments
- **Always use environment variables** for environment-specific configuration
- **Test database names must contain 'test'** to pass safety checks
- **Update `.env.example`** if you add new test-related environment variables

## Troubleshooting

### Issue: Tests fail with "database does not exist"

**Solution:** Create the test databases:
```bash
psql -U danilobibancos -c "CREATE DATABASE maintenance_os_central_test;"
psql -U danilobibancos -c "CREATE DATABASE maintenance_os_test;"
```

### Issue: Safety check fails in development

**Cause:** phpunit.xml configuration is being used outside of testing

**Solution:** Verify `APP_ENV=testing` is only set when running tests, not in `.env`

### Issue: Tests still affecting dev database

**Cause:** Environment variables not being loaded correctly

**Solution:**
1. Clear config cache: `php artisan config:clear`
2. Verify phpunit.xml has correct database names
3. Check that test files extend the correct base test class

## Future Improvements

- Consider adding a `php artisan test:setup` command to create test databases automatically
- Add test database cleanup command
- Document test database backup/restore procedures
- Add CI/CD integration notes for test database setup

