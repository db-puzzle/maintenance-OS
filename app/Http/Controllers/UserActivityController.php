<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\PermissionAuditLog;
use App\Services\UserManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserActivityController extends Controller
{
    protected UserManagementService $userManagementService;

    public function __construct(UserManagementService $userManagementService)
    {
        $this->middleware('auth');
        $this->userManagementService = $userManagementService;
    }

    /**
     * Show user activity logs
     */
    public function show(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to view this user\'s activity.');
        }
        
        $query = PermissionAuditLog::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('affected_user_id', $user->id);
        });
        
        // Apply filters
        if ($request->filled('action')) {
            $query->where('event_action', $request->input('action'));
        }
        
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }
        
        $activities = $query->with(['user', 'affectedUser'])
            ->latest()
            ->paginate(20)
            ->withQueryString();
        
        // Get available actions for filtering
        $availableActions = PermissionAuditLog::select('event_action')
            ->distinct()
            ->pluck('event_action');
        
        return Inertia::render('users/activity', [
            'user' => $user,
            'activities' => $activities,
            'filters' => $request->only(['action', 'date_from', 'date_to']),
            'availableActions' => $availableActions,
        ]);
    }
} 