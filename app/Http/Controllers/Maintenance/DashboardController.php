<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('maintenance/dashboard-maintenance', [
            // Aqui você pode adicionar dados específicos do dashboard se necessário
            // 'stats' => $this->getDashboardStats(),
            // 'recentActivities' => $this->getRecentActivities(),
        ]);
    }

    // Métodos privados para buscar dados do dashboard se necessário
    // private function getDashboardStats()
    // {
    //     return [
    //         'total_equipment' => Equipment::count(),
    //         'pending_maintenance' => MaintenancePlan::where('status', 'pending')->count(),
    //         'overdue_tasks' => RoutineExecution::where('status', 'overdue')->count(),
    //     ];
    // }
} 