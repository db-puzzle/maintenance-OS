<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SuperAdminGrant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('can:users.grant-super-admin')->only(['grant']);
        $this->middleware('can:users.revoke-super-admin')->only(['revoke']);
    }

    /**
     * Grant super admin privileges to a user
     */
    public function grant(Request $request, User $user)
    {
        if ($user->is_super_admin) {
            return back()->with('error', 'User is already a super administrator.');
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            DB::transaction(function () use ($user, $request, $validated) {
                $user->grantSuperAdmin($request->user(), $validated['reason'] ?? null);
            });

            return back()->with('success', "Super admin privileges granted to {$user->name}.");
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to grant super admin privileges: ' . $e->getMessage());
        }
    }

    /**
     * Revoke super admin privileges from a user
     */
    public function revoke(Request $request, User $user)
    {
        if (!$user->is_super_admin) {
            return back()->with('error', 'User is not a super administrator.');
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            DB::transaction(function () use ($user, $request, $validated) {
                $user->revokeSuperAdmin($request->user(), $validated['reason'] ?? null);
            });

            return back()->with('success', "Super admin privileges revoked from {$user->name}.");
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to revoke super admin privileges: ' . $e->getMessage());
        }
    }

    /**
     * Get super admin grants history
     */
    public function grants()
    {
        $grants = SuperAdminGrant::with(['grantedTo', 'grantedBy', 'revokedBy'])
            ->latest('granted_at')
            ->paginate(20);

        return response()->json($grants);
    }

    /**
     * Get current super administrators
     */
    public function current()
    {
        $superAdmins = User::where('is_super_admin', true)
            ->with('superAdminGrants')
            ->get();

        return response()->json($superAdmins);
    }
}