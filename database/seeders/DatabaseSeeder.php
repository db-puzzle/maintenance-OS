<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            WorkOrderCategorySeeder::class,
            WorkOrderTypeSeeder::class,
            FailureClassificationSeeder::class,
            ManufacturerSeeder::class,
            PartSeeder::class,
            TeamSeeder::class,
            SkillSeeder::class,
            CertificationSeeder::class,
            // Production Module
            ProductionPermissionSeeder::class,
            ProductionRoleSeeder::class,
        ]);
    }
}
