<?php

namespace Database\Seeders;

use App\Models\Central\Feature;
use Illuminate\Database\Seeder;

/**
 * Features Seeder.
 *
 * Seeds the initial feature flags for the application.
 * These flags control which features are visible and accessible to users.
 */
class FeaturesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $features = [
            [
                'key' => 'production_step_types_advanced',
                'name' => 'Advanced Step Types',
                'description' => 'Enables advanced manufacturing step types beyond Standard (e.g., Quality Check, Assembly). When disabled, only Standard step type is available.',
                'category' => 'production',
                'is_global' => true,
                'is_enabled_globally' => false, // Disabled by default - feature not ready
                'requires_backend_validation' => true,
                'metadata' => [
                    'available_types' => ['standard', 'quality_check', 'assembly'],
                    'default_type' => 'standard',
                ],
            ],
            [
                'key' => 'production_forms_engine',
                'name' => 'Production Forms Engine',
                'description' => 'Enables the forms engine for associating custom forms with manufacturing steps. When disabled, the form association field is hidden.',
                'category' => 'production',
                'is_global' => true,
                'is_enabled_globally' => false, // Disabled by default - feature not ready
                'requires_backend_validation' => true,
                'metadata' => [
                    'max_forms_per_step' => 1,
                ],
            ],
            [
                'key' => 'production_scheduler',
                'name' => 'Production Scheduler',
                'description' => 'Enables the advanced production scheduler including: scheduling interface, shift management, timing configuration (setup/cycle times, workcell throughput), and capacity planning. When disabled, these features are hidden from the UI.',
                'category' => 'production',
                'is_global' => true,
                'is_enabled_globally' => false, // Disabled by default - feature not ready
                'requires_backend_validation' => true,
                'metadata' => [
                    'includes' => [
                        'scheduler_interface',
                        'shift_management',
                        'timing_configuration',
                        'capacity_planning',
                        'workcell_throughput',
                    ],
                ],
            ],
        ];

        foreach ($features as $featureData) {
            Feature::updateOrCreate(
                ['key' => $featureData['key']],
                $featureData
            );
        }

        $this->command->info('Feature flags seeded successfully.');
        $this->command->info('All features are currently disabled globally (not ready for production).');
        $this->command->info('Enable features in the admin panel when they are ready.');
    }
}
