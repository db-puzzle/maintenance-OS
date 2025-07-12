<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class WorkOrderMetricsService
{
    /**
     * Get overview metrics for work orders
     */
    public function getOverviewMetrics(Carbon $startDate, Carbon $endDate): array
    {
        $workOrders = WorkOrder::whereBetween('created_at', [$startDate, $endDate])->get();
        
        return [
            'total_work_orders' => $workOrders->count(),
            'by_category' => $this->getByCategory($workOrders),
            'by_status' => $this->getByStatus($workOrders),
            'by_priority' => $this->getByPriority($workOrders),
            'completion_rate' => $this->calculateCompletionRate($workOrders),
            'on_time_rate' => $this->calculateOnTimeRate($workOrders),
            'average_completion_time' => $this->calculateAverageCompletionTime($workOrders),
            'total_costs' => $this->calculateTotalCosts($workOrders),
        ];
    }
    
    /**
     * Get performance metrics
     */
    public function getPerformanceMetrics(Carbon $startDate, Carbon $endDate): array
    {
        return [
            'mtbf' => $this->calculateSystemMTBF($startDate, $endDate),
            'mttr' => $this->calculateSystemMTTR($startDate, $endDate),
            'pm_compliance' => $this->calculatePMCompliance($startDate, $endDate),
            'emergency_response_time' => $this->calculateEmergencyResponseTime($startDate, $endDate),
            'first_time_fix_rate' => $this->calculateFirstTimeFixRate($startDate, $endDate),
            'backlog' => $this->calculateBacklog(),
        ];
    }
    
    /**
     * Get technician performance metrics
     */
    public function getTechnicianMetrics(int $technicianId, Carbon $startDate, Carbon $endDate): array
    {
        $workOrders = WorkOrder::where('assigned_technician_id', $technicianId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
            
        $completed = $workOrders->whereIn('status', [
            WorkOrder::STATUS_COMPLETED,
            WorkOrder::STATUS_VERIFIED,
            WorkOrder::STATUS_CLOSED
        ]);
        
        return [
            'total_assigned' => $workOrders->count(),
            'total_completed' => $completed->count(),
            'completion_rate' => $workOrders->count() > 0 
                ? round(($completed->count() / $workOrders->count()) * 100, 2) 
                : 0,
            'average_completion_time' => $this->calculateAverageCompletionTime($completed),
            'total_hours_worked' => $completed->sum('actual_hours'),
            'efficiency_rate' => $this->calculateEfficiencyRate($completed),
            'by_category' => $completed->groupBy('work_order_category')->map->count(),
            'by_priority' => $completed->groupBy('priority')->map->count(),
        ];
    }
    
    /**
     * Get asset reliability metrics
     */
    public function getAssetMetrics(int $assetId, Carbon $startDate, Carbon $endDate): array
    {
        $workOrders = WorkOrder::where('asset_id', $assetId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
            
        return [
            'total_work_orders' => $workOrders->count(),
            'corrective_count' => $workOrders->where('work_order_category', 'corrective')->count(),
            'preventive_count' => $workOrders->where('work_order_category', 'preventive')->count(),
            'total_downtime' => $workOrders->sum('actual_hours'),
            'total_cost' => $workOrders->sum('actual_total_cost'),
            'mtbf' => $this->calculateAssetMTBF($assetId, $startDate, $endDate),
            'mttr' => $this->calculateAssetMTTR($assetId, $startDate, $endDate),
            'availability' => $this->calculateAssetAvailability($assetId, $startDate, $endDate),
        ];
    }
    
    private function getByCategory($workOrders): array
    {
        return $workOrders->groupBy('work_order_category')
            ->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'percentage' => round(($group->count() / $workOrders->count()) * 100, 2),
                ];
            })->toArray();
    }
    
    private function getByStatus($workOrders): array
    {
        return $workOrders->groupBy('status')
            ->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'percentage' => round(($group->count() / $workOrders->count()) * 100, 2),
                ];
            })->toArray();
    }
    
    private function getByPriority($workOrders): array
    {
        return $workOrders->groupBy('priority')
            ->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'percentage' => round(($group->count() / $workOrders->count()) * 100, 2),
                ];
            })->toArray();
    }
    
    private function calculateCompletionRate($workOrders): float
    {
        if ($workOrders->isEmpty()) {
            return 0;
        }
        
        $completed = $workOrders->whereIn('status', [
            WorkOrder::STATUS_COMPLETED,
            WorkOrder::STATUS_VERIFIED,
            WorkOrder::STATUS_CLOSED
        ])->count();
        
        return round(($completed / $workOrders->count()) * 100, 2);
    }
    
    private function calculateOnTimeRate($workOrders): float
    {
        $withDueDate = $workOrders->whereNotNull('requested_due_date');
        
        if ($withDueDate->isEmpty()) {
            return 0;
        }
        
        $onTime = $withDueDate->filter(function ($wo) {
            return $wo->status === WorkOrder::STATUS_CLOSED &&
                   $wo->closed_at &&
                   $wo->closed_at->lessThanOrEqualTo($wo->requested_due_date);
        })->count();
        
        return round(($onTime / $withDueDate->count()) * 100, 2);
    }
    
    private function calculateAverageCompletionTime($workOrders): float
    {
        $completed = $workOrders->filter(function ($wo) {
            return $wo->actual_start_date && $wo->actual_end_date;
        });
        
        if ($completed->isEmpty()) {
            return 0;
        }
        
        $totalHours = $completed->sum(function ($wo) {
            return $wo->actual_start_date->diffInHours($wo->actual_end_date);
        });
        
        return round($totalHours / $completed->count(), 2);
    }
    
    private function calculateTotalCosts($workOrders): array
    {
        return [
            'estimated_total' => $workOrders->sum('estimated_total_cost'),
            'actual_total' => $workOrders->sum('actual_total_cost'),
            'estimated_parts' => $workOrders->sum('estimated_parts_cost'),
            'actual_parts' => $workOrders->sum('actual_parts_cost'),
            'estimated_labor' => $workOrders->sum('estimated_labor_cost'),
            'actual_labor' => $workOrders->sum('actual_labor_cost'),
        ];
    }
    
    private function calculateSystemMTBF(Carbon $startDate, Carbon $endDate): float
    {
        $failures = WorkOrder::corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();
            
        if ($failures === 0) {
            return 0;
        }
        
        $totalHours = $startDate->diffInHours($endDate);
        
        return round($totalHours / $failures, 2);
    }
    
    private function calculateSystemMTTR(Carbon $startDate, Carbon $endDate): float
    {
        $correctiveWorkOrders = WorkOrder::corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('actual_hours')
            ->get();
            
        if ($correctiveWorkOrders->isEmpty()) {
            return 0;
        }
        
        return round($correctiveWorkOrders->avg('actual_hours'), 2);
    }
    
    private function calculatePMCompliance(Carbon $startDate, Carbon $endDate): float
    {
        $preventiveWorkOrders = WorkOrder::preventive()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
            
        if ($preventiveWorkOrders->isEmpty()) {
            return 0;
        }
        
        $completed = $preventiveWorkOrders->whereIn('status', [
            WorkOrder::STATUS_COMPLETED,
            WorkOrder::STATUS_VERIFIED,
            WorkOrder::STATUS_CLOSED
        ])->count();
        
        return round(($completed / $preventiveWorkOrders->count()) * 100, 2);
    }
    
    private function calculateEmergencyResponseTime(Carbon $startDate, Carbon $endDate): float
    {
        $emergencyWorkOrders = WorkOrder::where('priority', 'emergency')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('actual_start_date')
            ->get();
            
        if ($emergencyWorkOrders->isEmpty()) {
            return 0;
        }
        
        $totalResponseTime = $emergencyWorkOrders->sum(function ($wo) {
            return $wo->created_at->diffInMinutes($wo->actual_start_date);
        });
        
        return round($totalResponseTime / $emergencyWorkOrders->count() / 60, 2); // Return in hours
    }
    
    private function calculateFirstTimeFixRate(Carbon $startDate, Carbon $endDate): float
    {
        $completedWorkOrders = WorkOrder::corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('status', [
                WorkOrder::STATUS_COMPLETED,
                WorkOrder::STATUS_VERIFIED,
                WorkOrder::STATUS_CLOSED
            ])
            ->get();
            
        if ($completedWorkOrders->isEmpty()) {
            return 0;
        }
        
        // Check for follow-up work orders
        $withoutFollowUp = $completedWorkOrders->filter(function ($wo) {
            return !WorkOrder::where('related_work_order_id', $wo->id)
                ->where('relationship_type', 'follow_up')
                ->exists();
        })->count();
        
        return round(($withoutFollowUp / $completedWorkOrders->count()) * 100, 2);
    }
    
    private function calculateBacklog(): array
    {
        $openWorkOrders = WorkOrder::open()->get();
        
        return [
            'total_count' => $openWorkOrders->count(),
            'total_hours' => $openWorkOrders->sum('estimated_hours'),
            'by_category' => $openWorkOrders->groupBy('work_order_category')->map->count(),
            'by_priority' => $openWorkOrders->groupBy('priority')->map->count(),
            'overdue_count' => $openWorkOrders->filter(function ($wo) {
                return $wo->requested_due_date && $wo->requested_due_date->isPast();
            })->count(),
        ];
    }
    
    private function calculateEfficiencyRate($workOrders): float
    {
        $withEstimates = $workOrders->filter(function ($wo) {
            return $wo->estimated_hours && $wo->actual_hours;
        });
        
        if ($withEstimates->isEmpty()) {
            return 0;
        }
        
        $totalEstimated = $withEstimates->sum('estimated_hours');
        $totalActual = $withEstimates->sum('actual_hours');
        
        if ($totalActual === 0) {
            return 0;
        }
        
        return round(($totalEstimated / $totalActual) * 100, 2);
    }
    
    private function calculateAssetMTBF(int $assetId, Carbon $startDate, Carbon $endDate): float
    {
        $failures = WorkOrder::where('asset_id', $assetId)
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();
            
        if ($failures === 0) {
            return 0;
        }
        
        $totalHours = $startDate->diffInHours($endDate);
        $downtimeHours = WorkOrder::where('asset_id', $assetId)
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('actual_hours');
            
        $uptimeHours = $totalHours - $downtimeHours;
        
        return round($uptimeHours / $failures, 2);
    }
    
    private function calculateAssetMTTR(int $assetId, Carbon $startDate, Carbon $endDate): float
    {
        $correctiveWorkOrders = WorkOrder::where('asset_id', $assetId)
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('actual_hours')
            ->get();
            
        if ($correctiveWorkOrders->isEmpty()) {
            return 0;
        }
        
        return round($correctiveWorkOrders->avg('actual_hours'), 2);
    }
    
    private function calculateAssetAvailability(int $assetId, Carbon $startDate, Carbon $endDate): float
    {
        $totalHours = $startDate->diffInHours($endDate);
        $downtimeHours = WorkOrder::where('asset_id', $assetId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('actual_hours');
            
        if ($totalHours === 0) {
            return 0;
        }
        
        $uptimeHours = $totalHours - $downtimeHours;
        
        return round(($uptimeHours / $totalHours) * 100, 2);
    }
}