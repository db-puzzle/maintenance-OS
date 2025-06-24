<?php

namespace App\Http\Controllers;

use App\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        
        // Only super admins can access audit logs
        $this->middleware(function ($request, $next) {
            if (!$request->user()->is_super_admin) {
                abort(403, 'Access denied. Super administrator privileges required.');
            }
            return $next($request);
        });
    }

    /**
     * Display audit logs
     */
    public function index(Request $request)
    {
        $query = PermissionAuditLog::with(['user', 'impersonator', 'auditable'])
            ->latest();

        // Apply filters
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('event_type')) {
            $query->eventType($request->event_type);
        }

        if ($request->filled('user_id')) {
            $query->forUser($request->user_id);
        }

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        $logs = $query->paginate(50)->withQueryString();

        // Add computed attributes
        $logs->getCollection()->transform(function ($log) {
            $log->append(['description', 'changes']);
            return $log;
        });

        // Get filter options
        $eventTypes = PermissionAuditLog::distinct()->pluck('event_type');
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();

        return Inertia::render('AuditLogs/Index', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'event_type', 'user_id', 'date_from', 'date_to']),
            'eventTypes' => $eventTypes,
            'users' => $users,
            'stats' => $this->getStats(),
        ]);
    }

    /**
     * Export audit logs
     */
    public function export(Request $request)
    {
        $query = PermissionAuditLog::with(['user', 'impersonator', 'auditable']);

        // Apply same filters as index
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('event_type')) {
            $query->eventType($request->event_type);
        }

        if ($request->filled('user_id')) {
            $query->forUser($request->user_id);
        }

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        $logs = $query->orderBy('created_at', 'desc')->get();

        // Prepare CSV data
        $csvData = [];
        $csvData[] = [
            'Date',
            'Time',
            'Event Type',
            'Action',
            'Description',
            'User',
            'Impersonator',
            'IP Address',
            'Entity Type',
            'Entity ID'
        ];

        foreach ($logs as $log) {
            $csvData[] = [
                $log->created_at->format('Y-m-d'),
                $log->created_at->format('H:i:s'),
                $log->event_type,
                $log->event_action,
                $log->description,
                $log->user->name,
                $log->impersonator?->name ?? '',
                $log->ip_address,
                $log->auditable_type,
                $log->auditable_id,
            ];
        }

        // Generate CSV
        $filename = 'audit-logs-' . now()->format('Y-m-d-H-i-s') . '.csv';
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get audit log statistics
     */
    public function stats()
    {
        return response()->json($this->getStats());
    }

    /**
     * Show audit log details
     */
    public function show(PermissionAuditLog $auditLog)
    {
        $auditLog->load(['user', 'impersonator', 'auditable']);
        $auditLog->append(['description', 'changes']);

        return response()->json($auditLog);
    }

    /**
     * Get audit statistics
     */
    private function getStats(): array
    {
        $startDate = now()->subDays(30);

        return [
            'total_events' => PermissionAuditLog::where('created_at', '>=', $startDate)->count(),
            'user_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'user.%')->count(),
            'permission_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'permission.%')->count(),
            'role_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'role.%')->count(),
            'invitation_events' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'invitation.%')->count(),
            'top_users' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->with('user:id,name')
                ->selectRaw('user_id, count(*) as count')
                ->groupBy('user_id')
                ->orderByDesc('count')
                ->limit(5)
                ->get(),
            'recent_events' => PermissionAuditLog::with(['user:id,name', 'auditable'])
                ->where('created_at', '>=', $startDate)
                ->latest()
                ->limit(10)
                ->get()
                ->map(function ($log) {
                    $log->append('description');
                    return $log;
                })
        ];
    }

    /**
     * Clean up old audit logs
     */
    public function cleanup(Request $request)
    {
        $validated = $request->validate([
            'keep_days' => 'required|integer|min:30|max:3650', // 30 days to 10 years
        ]);

        $deletedCount = \App\Services\AuditLogService::cleanup($validated['keep_days']);

        return back()->with('success', "Cleaned up {$deletedCount} old audit log entries.");
    }

    /**
     * Get event type breakdown
     */
    public function eventBreakdown()
    {
        $breakdown = PermissionAuditLog::selectRaw('event_type, count(*) as count')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('event_type')
            ->orderByDesc('count')
            ->get();

        return response()->json($breakdown);
    }

    /**
     * Get activity timeline
     */
    public function timeline(Request $request)
    {
        $days = $request->get('days', 7);
        
        $timeline = PermissionAuditLog::selectRaw('DATE(created_at) as date, count(*) as count')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($timeline);
    }
}