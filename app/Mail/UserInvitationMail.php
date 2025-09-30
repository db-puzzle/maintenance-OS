<?php

namespace App\Mail;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UserInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public UserInvitation $invitation
    ) {}

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        // Process role display
        $roleDisplay = '';
        if ($this->invitation->initial_role) {
            // Try to decode as JSON first
            $roleAssignments = json_decode($this->invitation->initial_role, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($roleAssignments)) {
                // New JSON format with role_id
                $roleNames = [];
                foreach ($roleAssignments as $assignment) {
                    if (isset($assignment['role_id'])) {
                        $role = \App\Models\Role::find($assignment['role_id']);
                        if ($role) {
                            $roleName = $role->name;
                            if (isset($assignment['entity_type']) && isset($assignment['entity_id'])) {
                                $entityName = str_replace('App\\Models\\', '', $assignment['entity_type']);
                                $roleName .= " (for {$entityName} #{$assignment['entity_id']})";
                            }
                            $roleNames[] = $roleName;
                        }
                    }
                }
                $roleDisplay = implode(', ', $roleNames);
            } else {
                // Legacy format: plain role name
                $roleDisplay = $this->invitation->initial_role;
            }
        }

        return $this->to($this->invitation->email)
            ->subject('Você foi convidado para ' . config('app.name'))
            ->view('emails.user-invitation')
            ->with([
                'invitation' => $this->invitation,
                'inviterName' => $this->invitation->inviter?->name ?? 'the system',
                'acceptUrl' => $this->invitation->generateSignedUrl(),
                'roleDisplay' => $roleDisplay,
            ]);
    }
}
