<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserInvitation;
use App\Notifications\UserInvitation as UserInvitationNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class InviteUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:invite {email} {--role=} {--message=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Invite a new user to the system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $role = $this->option('role');
        $message = $this->option('message');

        // Validate email
        $validator = Validator::make(['email' => $email], [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            $this->error('Invalid email address.');
            return 1;
        }

        // Check if user already exists
        if (User::where('email', $email)->exists()) {
            $this->error('User already exists with this email.');
            return 1;
        }

        // Check if there's already a pending invitation
        $existingInvitation = UserInvitation::where('email', $email)
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($existingInvitation) {
            $this->error('There is already a pending invitation for this email.');
            return 1;
        }

        // Get the first super admin user to be the inviter
        $inviter = User::where('is_super_admin', true)->first();

        if (!$inviter) {
            $this->error('No super admin found. Cannot send invitation.');
            return 1;
        }

        // Create invitation
        $invitation = UserInvitation::create([
            'email' => $email,
            'token' => Str::random(64),
            'invited_by' => $inviter->id,
            'initial_role' => $role,
            'message' => $message,
            'expires_at' => now()->addDays(7),
        ]);

        // Send notification
        $invitation->notify(new UserInvitationNotification($invitation));

        $this->info("Invitation sent to {$email}");
        $this->info("Invitation expires at: {$invitation->expires_at}");
        
        if ($role) {
            $this->info("Initial role: {$role}");
        }

        return 0;
    }
} 