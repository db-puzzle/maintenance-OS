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
            PlantSeeder::class,
            FailureAnalysisSeeder::class,
            
            // Work Orders
            WorkOrderTypeSeeder::class,
            WorkOrderCategorySeeder::class,
            
            // Skills & Certifications
            SkillSeeder::class,
            CertificationSeeder::class,
            
            // Others
            TeamSeeder::class,
            ShiftSeeder::class,
            UserSeeder::class,
        ]);
    }
}
