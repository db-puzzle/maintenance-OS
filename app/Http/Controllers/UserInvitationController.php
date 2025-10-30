<?php

namespace App\Http\Controllers;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;
use App\Notifications\UserInvitation as UserInvitationNotification;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserInvitationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth')->except(['show', 'accept']);
        $this->middleware('can:users.invite')->except(['show', 'accept']);
    }

    /**
     * Display invitations list.
     */
    public function index(Request $request)
    {
        $query = UserInvitation::with(['inviter', 'acceptedBy'])
            ->latest();

        // Apply filters
        if ($request->filled('status')) {
            switch ($request->status) {
                case 'pending':
                    $query->pending();
                    break;
                case 'accepted':
                    $query->whereNotNull('accepted_at');
                    break;
                case 'expired':
                    $query->expired();
                    break;
            }
        }

        if ($request->filled('search')) {
            $query->where('email', 'like', "%{$request->search}%");
        }

        $invitations = $query->paginate(20)->withQueryString();

        // Add can attributes and url
        $invitations->getCollection()->transform(function ($invitation) {
            $invitation->append(['can', 'url']);
            // Make token visible for generating URLs
            $invitation->makeVisible('token');

            return $invitation;
        });

        return Inertia::render('invitations/index', [
            'invitations' => $invitations,
            'filters' => $request->only(['status', 'search']),
            'stats' => [
                'total' => UserInvitation::count(),
                'pending' => UserInvitation::pending()->count(),
                'accepted' => UserInvitation::whereNotNull('accepted_at')->count(),
                'expired' => UserInvitation::expired()->count(),
            ],
            'roles' => $this->getRolesWithMetadata(),
            'plants' => Plant::orderBy('name')->get(['id', 'name'])->map(function ($plant) {
                $plant->type = 'plant';

                return $plant;
            }),
            'areas' => Area::orderBy('name')->get(['id', 'name'])->map(function ($area) {
                $area->type = 'area';

                return $area;
            }),
            'sectors' => Sector::orderBy('name')->get(['id', 'name'])->map(function ($sector) {
                $sector->type = 'sector';

                return $sector;
            }),
        ]);
    }

    /**
     * Show invitation creation form.
     */
    public function create()
    {
        return Inertia::render('invitations/create', [
            'roles' => $this->getRolesWithMetadata(),
            'plants' => Plant::orderBy('name')->get(['id', 'name'])->map(function ($plant) {
                $plant->type = 'plant';

                return $plant;
            }),
            'areas' => Area::orderBy('name')->get(['id', 'name'])->map(function ($area) {
                $area->type = 'area';

                return $area;
            }),
            'sectors' => Sector::orderBy('name')->get(['id', 'name'])->map(function ($sector) {
                $sector->type = 'sector';

                return $sector;
            }),
        ]);
    }

    /**
     * Store new invitation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
                Rule::unique('user_invitations', 'email')->where(function ($query) {
                    return $query->whereNull('accepted_at')
                        ->where('expires_at', '>', now());
                }),
            ],
            'role_assignments' => 'nullable|array',
            'role_assignments.*.role_id' => 'required|exists:roles,id',
            'role_assignments.*.entity_type' => 'nullable|in:plant,area,sector',
            'role_assignments.*.entity_id' => 'nullable|integer',
            'message' => 'nullable|string|max:1000',
        ]);

        // Convert role assignments to the format expected by the model
        $initialRoles = [];
        $initialPermissions = [];

        if (! empty($validated['role_assignments'])) {
            foreach ($validated['role_assignments'] as $assignment) {
                $role = Role::find($assignment['role_id']);
                if ($role) {
                    // Store role assignment information
                    $roleAssignment = [
                        'role_id' => $role->id,
                        'role_name' => $role->name,
                    ];

                    if (! empty($assignment['entity_type']) && ! empty($assignment['entity_id'])) {
                        $roleAssignment['entity_type'] = $assignment['entity_type'];
                        $roleAssignment['entity_id'] = $assignment['entity_id'];
                    }

                    $initialRoles[] = $roleAssignment;
                }
            }
        }

        $invitation = UserInvitation::create([
            'email' => $validated['email'],
            'invited_by' => $request->user()->id,
            'initial_role' => ! empty($initialRoles) ? json_encode($initialRoles) : null,
            'initial_permissions' => null, // Permissions will be derived from roles
            'message' => $validated['message'] ?? null,
        ]);

        // Send invitation email
        Notification::route('mail', $validated['email'])
            ->notify(new UserInvitationNotification($invitation));

        Log::info('[invitations] User invitation email queued', [
            'email' => $validated['email'],
            'invited_by' => $request->user()->name,
            'invitation_id' => $invitation->id,
        ]);

        // Log the invitation
        AuditLogService::logInvitation('sent', $invitation, [
            'invited_by' => $request->user()->name,
        ]);

        return redirect()->route('invitations.index')
            ->with('success', "Convite enviado para {$validated['email']}");
    }

    /**
     * Show invitation acceptance form.
     */
    public function show(string $token)
    {
        $invitation = UserInvitation::where('token', $token)->firstOrFail();

        if (! $invitation->isValid()) {
            return redirect()->route('login')
                ->with('error', 'This invitation is no longer valid.');
        }

        return Inertia::render('invitations/accept', [
            'invitation' => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'token' => $invitation->token,
                'invited_by' => [
                    'name' => $invitation->inviter ? $invitation->inviter->name : 'System',
                ],
                'initial_roles' => $this->formatRolesForDisplay($invitation->initial_role),
                'message' => $invitation->message,
                'expires_at' => $invitation->expires_at,
            ],
        ]);
    }

    /**
     * Accept invitation and create user.
     */
    public function accept(Request $request, string $token)
    {
        $invitation = UserInvitation::where('token', $token)->firstOrFail();

        if (! $invitation->isValid()) {
            return redirect()->route('login')
                ->with('error', 'This invitation is no longer valid.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $invitation->email,
            'password' => bcrypt($validated['password']),
            'email_verified_at' => now(), // Auto-verify invited users
        ]);

        // Accept invitation (this will assign roles/permissions)
        $invitation->accept($user);

        // Log the user in
        auth()->login($user);

        return redirect()->route('home')
            ->with('success', 'Welcome! Your account has been created successfully.');
    }

    /**
     * Resend invitation.
     */
    public function resend(UserInvitation $invitation)
    {
        if ($invitation->isAccepted()) {
            return back()->with('error', 'Cannot resend an accepted invitation.');
        }

        // Update expiration date
        $invitation->update([
            'expires_at' => now()->addDays(7),
        ]);

        // Send invitation email
        Notification::route('mail', $invitation->email)
            ->notify(new UserInvitationNotification($invitation));

        Log::info('[invitations] User invitation email resent', [
            'email' => $invitation->email,
            'resent_by' => auth()->user()->name,
            'invitation_id' => $invitation->id,
        ]);

        AuditLogService::logInvitation('resent', $invitation);

        return back()->with('success', 'Invitation resent successfully.');
    }

    /**
     * Get pending invitations.
     */
    public function pending()
    {
        $invitations = UserInvitation::pending()
            ->with('invitedBy')
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    /**
     * Delete an invitation.
     */
    public function destroy(UserInvitation $invitation)
    {
        // Check if the invitation has already been accepted
        if ($invitation->isAccepted()) {
            $message = 'Não é possível excluir um convite que já foi aceito.';

            if (request()->wantsJson()) {
                return response()->json(['error' => $message], 422);
            }

            return back()->with('error', $message);
        }

        try {
            // Log the deletion
            AuditLogService::logInvitation('deleted', $invitation, [
                'deleted_by' => auth()->user()->name,
                'status_at_deletion' => $invitation->status,
            ]);

            // Delete the invitation
            $invitation->delete();

            if (request()->wantsJson()) {
                return response()->json(['success' => true]);
            }

            return back()->with('success', 'Convite excluído com sucesso.');
        } catch (\Exception $e) {
            $message = 'Não foi possível excluir o convite.';

            if (request()->wantsJson()) {
                return response()->json(['error' => $message], 500);
            }

            return back()->with('error', $message);
        }
    }

    /**
     * Get roles with metadata.
     */
    private function getRolesWithMetadata()
    {
        return Role::orderBy('name')->get(['id', 'name', 'is_system', 'display_name', 'description'])
            ->map(function ($role) {
                $role->permissions_count = $role->permissions_count;

                // Check if role name suggests entity-scoped permissions
                $entityScopedRoles = ['Plant Manager', 'Area Manager', 'Sector Manager'];
                if (in_array($role->name, $entityScopedRoles)) {
                    $role->requires_entity = true;
                    $role->entity_type = strtolower(explode(' ', $role->name)[0]);
                } else {
                    $role->requires_entity = false;
                }

                return $role;
            });
    }

    /**
     * Format roles for display on the accept page.
     */
    private function formatRolesForDisplay(?string $initialRole): array
    {
        if (! $initialRole) {
            return [];
        }

        // Try to decode as JSON first
        $roleAssignments = json_decode($initialRole, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($roleAssignments)) {
            // Legacy format: plain role name
            return [$initialRole];
        }

        $formattedRoles = [];

        foreach ($roleAssignments as $assignment) {
            if (isset($assignment['role_id'])) {
                $role = Role::find($assignment['role_id']);
                if (! $role) {
                    continue;
                }

                $roleName = $role->display_name ?? $role->name;

                if (isset($assignment['entity_type']) && isset($assignment['entity_id'])) {
                    // Load the actual entity to get its name
                    $entityName = $this->getEntityName($assignment['entity_type'], $assignment['entity_id']);
                    $entityTypeSingular = $this->getEntityTypeInPortuguese($assignment['entity_type']);
                    if ($entityName) {
                        $formattedRoles[] = [
                            'role_name' => $roleName,
                            'entity_type' => $entityTypeSingular,
                            'entity_name' => $entityName,
                            'full_display' => "{$roleName} (para {$entityTypeSingular}: {$entityName})",
                        ];
                    }
                } else {
                    $formattedRoles[] = [
                        'role_name' => $roleName,
                        'entity_type' => null,
                        'entity_name' => null,
                        'full_display' => $roleName,
                    ];
                }
            } elseif (isset($assignment['role_name'])) {
                // Handle legacy format with just role_name
                $formattedRoles[] = [
                    'role_name' => $assignment['role_name'],
                    'entity_type' => null,
                    'entity_name' => null,
                    'full_display' => $assignment['role_name'],
                ];
            }
        }

        return $formattedRoles;
    }

    /**
     * Get the entity name from the database.
     */
    private function getEntityName(string $entityType, int $entityId): ?string
    {
        $modelMap = [
            'plant' => Plant::class,
            'area' => Area::class,
            'sector' => Sector::class,
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
