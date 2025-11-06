<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Seeder for tenant databases.
 */
class TenantDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Package has already switched to tenant context!

        $this->call([
            // Permissions must be seeded FIRST
            TenantPermissionSeeder::class,

            // Roles depend on permissions, so seed them SECOND
            TenantRolesSeeder::class,

            // Settings and default data
            TenantSettingsSeeder::class,
            TenantDefaultDataSeeder::class,
        ]);

        // Create admin user from tenant metadata
        $this->createAdminUser();
    }

    /**
     * Create the admin user from tenant metadata.
     */
    protected function createAdminUser(): void
    {
        // Access current tenant via helper
        $tenant = tenant();

        if (! $tenant || ! isset($tenant->metadata['admin_email'])) {
            $this->command->warn('No admin email found in tenant metadata, skipping admin user creation.');

            return;
        }

        // Create the admin user
        $admin = User::firstOrCreate(
            ['email' => $tenant->metadata['admin_email']],
            [
                'name' => $tenant->metadata['admin_name'] ?? 'Administrator',
                'password' => isset($tenant->metadata['admin_password'])
                    ? $tenant->metadata['admin_password']
                    : Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Assign Administrator role if not already assigned
        // Use web guard context to avoid guard mismatch when admin portal creates tenants
        $adminRole = Role::where('name', 'Administrator')->where('guard_name', 'web')->first();
        if ($adminRole && ! $admin->hasRole('Administrator', 'web')) {
            // Temporarily set guard to web for role assignment
            $currentGuard = auth()->getDefaultDriver();
            config(['auth.defaults.guard' => 'web']);

            $admin->assignRole($adminRole);

            // Restore original guard
            config(['auth.defaults.guard' => $currentGuard]);
        } elseif (! $adminRole) {
            $this->command->warn('Administrator role not found. Please ensure TenantRolesSeeder has run.');
        }

        // Clear sensitive data from metadata
        if (isset($tenant->metadata['admin_password'])) {
            $metadata = $tenant->metadata;
            unset($metadata['admin_password']);
            $tenant->update(['metadata' => $metadata]);
        }

        if ($admin->wasRecentlyCreated) {
            $this->command->info("Admin user created: {$admin->email}");
        } else {
            $this->command->info("Admin user already exists: {$admin->email}");
        }
    }
}
