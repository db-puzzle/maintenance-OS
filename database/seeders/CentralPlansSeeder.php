<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CentralPlansSeeder extends Seeder
{
    /**
     * The database connection.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::connection('central')->table('plans')->insert([
            [
                'id' => 1,
                'name' => 'Free',
                'description' => 'Perfect for individuals and small teams just getting started',
                'price' => 0.00,
                'trial_days' => 0,
                'features' => json_encode([
                    'users' => 2,
                    'assets' => 25,
                    'work_orders' => 100,
                    'storage' => '1GB',
                ]),
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'Basic',
                'description' => 'Perfect for small teams getting started',
                'price' => 29.99,
                'trial_days' => 30,
                'features' => json_encode([
                    'users' => 5,
                    'assets' => 100,
                    'work_orders' => 500,
                    'storage' => '10GB',
                ]),
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'name' => 'Professional',
                'description' => 'For growing teams with advanced needs',
                'price' => 99.99,
                'trial_days' => 30,
                'features' => json_encode([
                    'users' => 20,
                    'assets' => 500,
                    'work_orders' => 'unlimited',
                    'storage' => '50GB',
                ]),
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'name' => 'Enterprise',
                'description' => 'Unlimited everything for large organizations',
                'price' => 299.99,
                'trial_days' => 30,
                'features' => json_encode([
                    'users' => 'unlimited',
                    'assets' => 'unlimited',
                    'work_orders' => 'unlimited',
                    'storage' => 'unlimited',
                ]),
                'is_active' => true,
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
