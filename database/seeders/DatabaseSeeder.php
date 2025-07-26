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
            RoleSeeder::class,
            
            // Production Module
            ProductionPermissionSeeder::class,
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
        ]);
    }
}
