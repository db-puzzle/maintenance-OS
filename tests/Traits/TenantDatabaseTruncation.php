<?php

namespace Tests\Traits;

use Illuminate\Support\Facades\DB;

/**
 * Truncate tenant database tables between tests.
 *
 * This trait provides fast cleanup between tests by truncating tables
 * instead of recreating the entire database. After truncation, it
 * re-seeds the minimum required data for tests to run.
 *
 * Inspired by Laravel's DatabaseTruncation trait but adapted for
 * multi-tenant testing.
 *
 * @see https://solutions.io/news/how-to-test-multitenant-laravel-applications-solving-database-refresh-challenges
 */
trait TenantDatabaseTruncation
{
    /**
     * Truncate all tenant tables and re-seed.
     *
     * This is called after each test to ensure a clean state
     * for the next test without recreating the database.
     */
    protected function truncateTenantDatabase(): void
    {
        // Get all table names in the tenant database
        $tables = $this->getTenantTables();

        // Disable foreign key checks for truncation
        DB::statement('SET CONSTRAINTS ALL DEFERRED');

        // Truncate all tables
        foreach ($tables as $table) {
            // Skip migrations table
            if ($table === 'migrations') {
                continue;
            }

            try {
                DB::table($table)->truncate();
            } catch (\Exception $e) {
                // If truncate fails, try delete
                DB::table($table)->delete();
            }
        }

        // Re-enable foreign key checks
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');

        // Re-seed minimum required data
        $this->seedMinimumTenantData();
    }

    /**
     * Get all table names in the tenant database.
     */
    protected function getTenantTables(): array
    {
        $tables = DB::select("
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        ");

        return array_map(function ($table) {
            return $table->tablename;
        }, $tables);
    }

    /**
     * Seed minimum required data for tests.
     *
     * This seeds only the essential data needed for tests to run,
     * such as roles, permissions, and the admin user.
     */
    protected function seedMinimumTenantData(): void
    {
        // Seed roles and permissions for TENANT database
        // Note: TenantRolesSeeder creates both roles AND permissions
        $this->artisan('db:seed', [
            '--class' => 'Database\\Seeders\\TenantRolesSeeder',
            '--force' => true,
        ]);

        // Create admin user if metadata contains admin email
        if (isset($this->tenant->metadata['admin_email'])) {
            $this->createAdminUser();
        }
    }

    /**
     * Create the admin user for the tenant.
     */
    protected function createAdminUser(): void
    {
        $adminEmail = $this->tenant->metadata['admin_email'];

        // Check if admin already exists
        $existingAdmin = \App\Models\User::where('email', $adminEmail)->first();

        if (! $existingAdmin) {
            $admin = \App\Models\User::factory()->create([
                'email' => $adminEmail,
                'name' => 'Test Admin',
                'password' => bcrypt('password'),
            ]);

            // Assign administrator role
            $adminRole = \Spatie\Permission\Models\Role::where('name', 'administrator')->first();
            if ($adminRole) {
                $admin->assignRole($adminRole);
            }
        }
    }

    /**
     * Refresh specific tables without truncating everything.
     *
     * Useful for tests that only need certain tables cleaned.
     *
     * @param array $tables Array of table names to truncate
     */
    protected function truncateSpecificTables(array $tables): void
    {
        // Disable foreign key checks
        DB::statement('SET CONSTRAINTS ALL DEFERRED');

        foreach ($tables as $table) {
            try {
                DB::table($table)->truncate();
            } catch (\Exception $e) {
                // If truncate fails, try delete
                DB::table($table)->delete();
            }
        }

        // Re-enable foreign key checks
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
    }
}
