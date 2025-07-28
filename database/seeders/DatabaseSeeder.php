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
        $this->call([
            // Core System
            PermissionSeeder::class,
            
            // Production Module Permissions (must run before RoleSeeder)
            ProductionPermissionSeeder::class,
            
            // Core System Roles (after all permissions are created)
            RoleSeeder::class,
            
            // Production Module
            ProductionRoleSeeder::class,
            
            // Asset Hierarchy
            ManufacturerSeeder::class,
            // PlantSeeder::class, // TODO: Create this seeder
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
