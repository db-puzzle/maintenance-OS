<?php

namespace App\Http\Controllers;

use App\Models\UserInvitation;
use App\Models\Role;
use App\Models\User;
use App\Notifications\UserInvitation as UserInvitationNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Services\AuditLogService;

class UserInvitationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('can:users.invite')->except(['show', 'accept']);
    }

    /**
     * Display invitations list
     */
    public function index(Request $request)
    {
        $query = UserInvitation::with(['invitedBy', 'acceptedBy', 'revokedBy'])
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
                case 'revoked':
                    $query->whereNotNull('revoked_at');
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

        // Add can attributes
        $invitations->getCollection()->transform(function ($invitation) {
            $invitation->append('can');
            return $invitation;
        });

        return Inertia::render('Invitations/Index', [
            'invitations' => $invitations,
            'filters' => $request->only(['status', 'search']),
            'stats' => [
                'total' => UserInvitation::count(),
                'pending' => UserInvitation::pending()->count(),
                'accepted' => UserInvitation::whereNotNull('accepted_at')->count(),
                'expired' => UserInvitation::expired()->count(),
            ]
        ]);
    }

    /**
     * Show invitation creation form
     */
    public function create()
    {
        return Inertia::render('Invitations/Create', [
            'roles' => Role::orderBy('name')->get(['id', 'name', 'is_system'])
        ]);
    }

    /**
     * Store new invitation
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
                                ->whereNull('revoked_at')
                                ->where('expires_at', '>', now());
                })
            ],
            'initial_role' => 'nullable|string|exists:roles,name',
            'initial_permissions' => 'nullable|array',
            'initial_permissions.*' => 'string|exists:permissions,name',
            'message' => 'nullable|string|max:1000',
        ]);

        $invitation = UserInvitation::create([
            'email' => $validated['email'],
            'invited_by' => $request->user()->id,
            'initial_role' => $validated['initial_role'] ?? null,
            'initial_permissions' => $validated['initial_permissions'] ?? null,
            'message' => $validated['message'] ?? null,
        ]);

        // Send invitation email
        Notification::route('mail', $validated['email'])
            ->notify(new UserInvitationNotification($invitation));

        // Log the invitation
        AuditLogService::logInvitation('sent', $invitation, [
            'invited_by' => $request->user()->name
        ]);

        return redirect()->route('invitations.index')
            ->with('success', "Invitation sent to {$validated['email']}");
    }

    /**
     * Show invitation acceptance form
     */
    public function show(string $token)
    {
        $invitation = UserInvitation::where('token', $token)->firstOrFail();

        if (!$invitation->isValid()) {
            return redirect()->route('login')
                ->with('error', 'This invitation is no longer valid.');
        }

        return Inertia::render('Invitations/Accept', [
            'invitation' => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'token' => $invitation->token,
                'invited_by' => [
                    'name' => $invitation->invitedBy->name
                ],
                'initial_role' => $invitation->initial_role,
                'message' => $invitation->message,
                'expires_at' => $invitation->expires_at,
            ]
        ]);
    }

    /**
     * Accept invitation and create user
     */
    public function accept(Request $request, string $token)
    {
        $invitation = UserInvitation::where('token', $token)->firstOrFail();

        if (!$invitation->isValid()) {
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
     * Revoke invitation
     */
    public function revoke(Request $request, UserInvitation $invitation)
    {
        if ($invitation->isAccepted()) {
            return back()->with('error', 'Cannot revoke an accepted invitation.');
        }

        if ($invitation->isRevoked()) {
            return back()->with('error', 'Invitation is already revoked.');
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        $invitation->revoke($request->user(), $validated['reason'] ?? null);

        return back()->with('success', 'Invitation revoked successfully.');
    }

    /**
     * Resend invitation
     */
    public function resend(UserInvitation $invitation)
    {
        if ($invitation->isAccepted()) {
            return back()->with('error', 'Cannot resend an accepted invitation.');
        }

        if ($invitation->isRevoked()) {
            return back()->with('error', 'Cannot resend a revoked invitation.');
        }

        // Update expiration date
        $invitation->update([
            'expires_at' => now()->addDays(7)
        ]);

        // Send invitation email
        Notification::route('mail', $invitation->email)
            ->notify(new UserInvitationNotification($invitation));

        AuditLogService::logInvitation('resent', $invitation);

        return back()->with('success', 'Invitation resent successfully.');
    }

    /**
     * Get pending invitations
     */
    public function pending()
    {
        $invitations = UserInvitation::pending()
            ->with('invitedBy')
            ->latest()
            ->get();

        return response()->json($invitations);
    }
}