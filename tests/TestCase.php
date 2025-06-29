<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Indicates if observers should be disabled during the test.
     *
     * @var bool
     */
    protected $withoutObservers = false;

    /**
     * Creates the application.
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Ensure the APP_KEY is set in the config
        if ($appKey = env('APP_KEY')) {
            config(['app.key' => $appKey]);
        }

        // Mock Vite for tests to avoid manifest errors
        $this->withoutVite();

        // Only disable observers if explicitly requested
        if ($this->withoutObservers) {
            \Illuminate\Database\Eloquent\Model::unsetEventDispatcher();
        }

        // Seed necessary data for tests
        $this->seed([
            \Database\Seeders\PermissionSeeder::class,
            \Database\Seeders\RoleSeeder::class,
        ]);

        // CRITICAL: Always create system admin as first user
        // This prevents any test user from accidentally becoming administrator
        $this->ensureSystemAdminExists();
    }

    /**
     * Ensure system admin user exists as first user
     * This prevents test users from accidentally getting admin privileges
     */
    protected function ensureSystemAdminExists(): void
    {
        if (\App\Models\User::count() === 0) {
            // Create system admin as first user
            $adminUser = \App\Models\User::factory()->create([
                'email' => 'system@admin.com',
                'name' => 'System Administrator',
                'password' => bcrypt('system-admin-password')
            ]);
            
            // Verify first user is admin
            if (!$adminUser->isAdministrator()) {
                // Debug output
                \Log::error('Administrator role check failed:', [
                    'user_id' => $adminUser->id,
                    'user_email' => $adminUser->email,
                    'user_count' => \App\Models\User::count(),
                    'has_roles' => $adminUser->roles->pluck('name')->toArray(),
                    'admin_role_exists' => \App\Models\Role::where('is_administrator', true)->exists(),
                    'admin_role' => \App\Models\Role::where('is_administrator', true)->first()?->toArray(),
                ]);
                
                throw new \Exception('Critical: First user is not an administrator!');
            }
        }
    }
}