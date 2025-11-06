<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // For multi-tenancy, we'll use the CentralDatabaseSeeder for the central database
        // This seeder should not be run directly anymore
        $this->command->warn('Note: This seeder contains tenant-specific seeds.');
        $this->command->warn('Use CentralDatabaseSeeder for central database seeding.');
        $this->command->warn('Use TenantDatabaseSeeder for tenant database seeding.');

        return;
        $this->call([
            // Core System
            PermissionSeeder::class,

            // Production Module Permissions (must run before RoleSeeder)
            ProductionPermissionSeeder::class,

            // Core System Roles (after all permissions are created)
            RoleSeeder::class,

            // Production Module
            ProductionRoleSeeder::class,
            UnitOfMeasureSeeder::class,

            // Maintenance
            FailureAnalysisSeeder::class,

            // Work Orders
            WorkOrderCategorySeeder::class,
            WorkOrderTypeSeeder::class,

            // Skills & Certifications
            SkillSeeder::class,
            CertificationSeeder::class,

            // Others
            TeamSeeder::class,
            // ShiftSeeder::class, // TODO: Create this seeder
            // UserSeeder::class, // TODO: Create this seeder

            // Test Data (only for development)
            // ProductionTestDataSeeder::class, // COMMENTED: Creates users which steals admin privileges from first interface user
        ]);
    }
}
