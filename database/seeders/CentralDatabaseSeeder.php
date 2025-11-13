<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class CentralDatabaseSeeder extends Seeder
{
    /**
     * The database connection.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * Seed the central database.
     *
     * This should only seed data needed in the central database,
     * such as plans, global settings, etc.
     */
    public function run(): void
    {
        $this->call([
            // Create initial system administrator
            AdminUserSeeder::class,

            // Create subscription plans
            CentralPlansSeeder::class,

            // Create feature flags
            FeaturesSeeder::class,
        ]);
    }
}
