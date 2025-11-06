<?php

namespace App\Observers;

use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Observer for the User model.
 *
 * Handles tenant-specific user operations, including automatic admin role
 * assignment for the first user created in a tenant database.
 */
class UserObserver
{
    /**
     * Handle the User "created" event.
     *
     * Automatically assigns the administrator role to the first user
     * created in a tenant database.
     */
    public function created(User $user): void
    {
        // Only execute this logic when running in tenant context
        if (! tenancy()->initialized) {
            return;
        }

        // Skip if authenticated user is not a tenant User (e.g., AdminUser from central)
        // This prevents guard mismatches when admin portal creates tenant data
        if (auth()->check() && ! auth()->user() instanceof User) {
            return;
        }

        // Check if this is the first user in the tenant
        $userCount = User::count();

        if ($userCount === 1) {
            // This is the first user - assign administrator role
            $adminRole = Role::where('name', 'administrator')->first();

            if ($adminRole) {
                $user->assignRole($adminRole);

                \Log::info('First user auto-assigned administrator role', [
                    'tenant_id' => tenant('id'),
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                ]);
            } else {
                \Log::warning('Administrator role not found for first user assignment', [
                    'tenant_id' => tenant('id'),
                    'user_id' => $user->id,
                ]);
            }
        }
    }
}
