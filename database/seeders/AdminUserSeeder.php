<?php

namespace Database\Seeders;

use App\Models\Central\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder for creating the initial system administrator.
 *
 * This seeder creates the first admin user for the central admin portal.
 * Credentials can be set via environment variables or will use defaults.
 */
class AdminUserSeeder extends Seeder
{
    /**
     * The database connection.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * Run the database seeds.
     *
     * Creates the initial system administrator if no admin users exist.
     * Uses environment variables for credentials or falls back to defaults.
     */
    public function run(): void
    {
        // Check if any admin users already exist
        if (AdminUser::count() > 0) {
            $this->command->info('Admin users already exist. Skipping initial admin creation.');

            return;
        }

        // Get credentials from environment or use defaults
        $name = env('ADMIN_NAME', 'System Administrator');
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'password');

        // Create the initial admin user
        $admin = AdminUser::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);

        $this->command->info('Initial system administrator created successfully!');
        $this->command->newLine();
        $this->command->table(
            ['Field', 'Value'],
            [
                ['Name', $admin->name],
                ['Email', $admin->email],
                ['Password', $password === 'password' ? 'password (default - CHANGE THIS!)' : '(as configured in .env)'],
            ]
        );
        $this->command->newLine();

        if ($password === 'password') {
            $this->command->warn('⚠️  WARNING: Using default password. Please change it immediately!');
            $this->command->info('You can create additional admins using: php artisan admin:create-user');
        }
    }
}
