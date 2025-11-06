<?php

namespace App\Mail;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

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
        Log::info('[invitations] Building invitation email', [
            'email' => $this->invitation->email,
            'invitation_id' => $this->invitation->id,
        ]);

        // Process role display
        $roleDisplayList = [];
        if ($this->invitation->initial_role) {
            // Try to decode as JSON first
            $roleAssignments = json_decode($this->invitation->initial_role, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($roleAssignments)) {
                // New JSON format with role_id
                // Format each assignment separately
                foreach ($roleAssignments as $assignment) {
                    if (isset($assignment['role_id'])) {
                        $role = \App\Models\Role::find($assignment['role_id']);
                        if ($role) {
                            $roleName = $role->name;

                            if (isset($assignment['entity_type']) && isset($assignment['entity_id'])) {
                                // Load the actual entity to get its name
                                $entityName = $this->getEntityName($assignment['entity_type'], $assignment['entity_id']);
                                $entityTypeSingular = $this->getEntityTypeInPortuguese($assignment['entity_type']);
                                if ($entityName) {
                                    $roleDisplayList[] = "{$roleName} (para {$entityTypeSingular}: {$entityName})";
                                }
                            } else {
                                $roleDisplayList[] = $roleName;
                            }
                        }
                    }
                }
            } else {
                // Legacy format: plain role name
                $roleDisplayList[] = $this->invitation->initial_role;
            }
        }

        // Get tenant-specific accept URL
        // If we're in a tenant context, the URL will automatically include the tenant subdomain
        $acceptUrl = $this->invitation->generateSignedUrl();

        // Get tenant name for the email subject if in tenant context
        $organizationName = tenancy()->initialized
            ? tenant('name') ?? config('app.name')
            : config('app.name');

        return $this->to($this->invitation->email)
            ->subject('Você foi convidado para ' . $organizationName)
            ->view('emails.user-invitation')
            ->with([
                'invitation' => $this->invitation,
                'inviterName' => $this->invitation->inviter?->name ?? 'the system',
                'acceptUrl' => $acceptUrl,
                'roleDisplayList' => $roleDisplayList,
                'organizationName' => $organizationName,
            ])
            ->tap(function () {
                Log::info('[invitations] Invitation email sent successfully', [
                    'email' => $this->invitation->email,
                    'invitation_id' => $this->invitation->id,
                    'tenant_id' => tenancy()->initialized ? tenant('id') : null,
                ]);
            });
    }

    /**
     * Get the entity name from the database.
     */
    private function getEntityName(string $entityType, int $entityId): ?string
    {
        $modelMap = [
            'plant' => \App\Models\AssetHierarchy\Plant::class,
            'area' => \App\Models\AssetHierarchy\Area::class,
            'sector' => \App\Models\AssetHierarchy\Sector::class,
        ];

        $modelClass = $modelMap[$entityType] ?? null;

        if ($modelClass) {
            $entity = $modelClass::find($entityId);

            return $entity?->name;
        }

        return null;
    }

    /**
     * Get the entity type in Portuguese (singular form).
     */
    private function getEntityTypeInPortuguese(string $entityType): string
    {
        $typeMap = [
            'plant' => 'planta',
            'area' => 'área',
            'sector' => 'setor',
        ];

        return $typeMap[$entityType] ?? $entityType;
    }
}
