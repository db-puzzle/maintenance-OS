<?php

namespace App\Console\Commands;

use App\Models\Central\AdminUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Command to create system administrator users.
 *
 * This command creates admin users for the central admin portal.
 * It prompts for name, email, and password with validation.
 */
class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create-user 
                            {name? : The name of the admin user}
                            {email? : The email address of the admin user}
                            {--password= : The password for the admin user (not recommended for security)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new system administrator user for the admin portal';

    /**
     * Execute the console command.
     *
     * Prompts for user details and creates a new admin user in the central database.
     */
    public function handle(): int
    {
        $this->info('Creating a new system administrator...');
        $this->newLine();

        // Get name (from argument or prompt)
        $name = $this->argument('name') ?: text(
            label: 'Admin name',
            placeholder: 'John Doe',
            required: true,
            validate: fn (string $value) => match (true) {
                strlen($value) < 2 => 'Name must be at least 2 characters.',
                strlen($value) > 255 => 'Name must not exceed 255 characters.',
                default => null
            }
        );

        // Get email (from argument or prompt)
        $email = $this->argument('email') ?: text(
            label: 'Email address',
            placeholder: 'admin@example.com',
            required: true,
            validate: function (string $value) {
                $validator = Validator::make(['email' => $value], [
                    'email' => ['required', 'email', 'max:255'],
                ]);

                if ($validator->fails()) {
                    return $validator->errors()->first('email');
                }

                // Check if email already exists
                if (AdminUser::where('email', $value)->exists()) {
                    return 'An admin user with this email already exists.';
                }

                return null;
            }
        );

        // Get password (from option or prompt)
        if ($this->option('password')) {
            $this->warn('⚠️  Warning: Passing passwords via command line is not secure.');
            $this->warn('Command history may expose the password.');
            $passwordInput = $this->option('password');
        } else {
            $passwordInput = password(
                label: 'Password',
                placeholder: 'Enter a secure password',
                required: true,
                validate: fn (string $value) => match (true) {
                    strlen($value) < 8 => 'Password must be at least 8 characters.',
                    default => null
                }
            );

            // Confirm password
            $passwordConfirm = password(
                label: 'Confirm password',
                placeholder: 'Re-enter the password',
                required: true
            );

            if ($passwordInput !== $passwordConfirm) {
                $this->error('Passwords do not match.');

                return self::FAILURE;
            }
        }

        // Create the admin user
        try {
            $admin = AdminUser::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($passwordInput),
                'email_verified_at' => now(),
            ]);

            $this->newLine();
            $this->info('✓ System administrator created successfully!');
            $this->newLine();

            $this->table(
                ['Field', 'Value'],
                [
                    ['ID', $admin->id],
                    ['Name', $admin->name],
                    ['Email', $admin->email],
                    ['Created', $admin->created_at->format('Y-m-d H:i:s')],
                ]
            );

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to create admin user: ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
