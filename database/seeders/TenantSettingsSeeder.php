<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder for tenant default settings.
 */
class TenantSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Settings will be implemented based on your settings system
        // For now, this is a placeholder

        // Example settings that might be created:
        // - Default work order settings
        // - Default manufacturing settings
        // - Email notification preferences
        // - Date/time format preferences
        // - etc.

        $this->command->info('Tenant settings initialized.');
    }
}
