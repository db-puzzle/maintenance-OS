<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WorkOrderSchedulingService
{
    /**
     * Get the scheduling calendar for a date range
     */
    public function getSchedulingCalendar(Carbon $startDate, Carbon $endDate, array $filters = []): Collection
    {
        $query = WorkOrder::with(['asset', 'assignedTechnician', 'type'])
            ->whereBetween('scheduled_start_date', [$startDate, $endDate]);
            
        // Apply filters
        if (!empty($filters['technician_id'])) {
            $query->where('assigned_technician_id', $filters['technician_id']);
        }
        
        if (!empty($filters['asset_id'])) {
            $query->where('asset_id', $filters['asset_id']);
        }
        
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        
        return $query->get()->groupBy(function ($workOrder) {
            return $workOrder->scheduled_start_date->format('Y-m-d');
        });
    }
    
    /**
     * Schedule multiple work orders
     */
    public function scheduleBatch(array $scheduleData, User $scheduler): Collection
    {
        $scheduled = collect();
        
        foreach ($scheduleData as $data) {
            $workOrder = WorkOrder::find($data['work_order_id']);
            
            if ($workOrder && $this->canSchedule($workOrder)) {
                $workOrder->update([
                    'scheduled_start_date' => Carbon::parse($data['start_date']),
                    'scheduled_end_date' => Carbon::parse($data['end_date']),
                    'assigned_technician_id' => $data['technician_id'] ?? null,
                    'assigned_team_id' => $data['team_id'] ?? null,
                ]);
                
                // Transition to scheduled status
                if ($workOrder->status === WorkOrder::STATUS_READY) {
                    $workOrder->transitionTo(WorkOrder::STATUS_SCHEDULED, $scheduler, 'Scheduled by batch operation');
                }
                
                $scheduled->push($workOrder);
            }
        }
        
        return $scheduled;
    }
    
    /**
     * Check technician availability
     */
    public function checkTechnicianAvailability(int $technicianId, Carbon $startDate, Carbon $endDate): array
    {
        $conflictingWorkOrders = WorkOrder::where('assigned_technician_id', $technicianId)
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('scheduled_start_date', [$startDate, $endDate])
                    ->orWhereBetween('scheduled_end_date', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('scheduled_start_date', '<=', $startDate)
                          ->where('scheduled_end_date', '>=', $endDate);
                    });
            })
            ->whereIn('status', [
                WorkOrder::STATUS_SCHEDULED,
                WorkOrder::STATUS_IN_PROGRESS
            ])
            ->get();
            
        return [
            'available' => $conflictingWorkOrders->isEmpty(),
            'conflicts' => $conflictingWorkOrders,
            'workload_hours' => $conflictingWorkOrders->sum('estimated_hours'),
        ];
    }
    
    /**
     * Get technician workload for a period
     */
    public function getTechnicianWorkload(int $technicianId, Carbon $startDate, Carbon $endDate): array
    {
        $workOrders = WorkOrder::where('assigned_technician_id', $technicianId)
            ->whereBetween('scheduled_start_date', [$startDate, $endDate])
            ->whereNotIn('status', [
                WorkOrder::STATUS_CLOSED,
                WorkOrder::STATUS_CANCELLED
            ])
            ->get();
            
        $totalHours = $workOrders->sum('estimated_hours');
        $workDays = $startDate->diffInWeekdays($endDate);
        $hoursPerDay = $workDays > 0 ? $totalHours / $workDays : 0;
        
        return [
            'total_work_orders' => $workOrders->count(),
            'total_hours' => $totalHours,
            'hours_per_day' => round($hoursPerDay, 2),
            'utilization_percentage' => round(($hoursPerDay / 8) * 100, 2), // Assuming 8-hour workday
            'work_orders_by_priority' => $workOrders->groupBy('priority')->map->count(),
            'work_orders_by_category' => $workOrders->groupBy('work_order_category')->map->count(),
        ];
    }
    
    /**
     * Optimize scheduling for a set of work orders
     */
    public function optimizeSchedule(Collection $workOrders, array $technicians, Carbon $startDate, Carbon $endDate): array
    {
        // Simple optimization: distribute work orders evenly among technicians
        // based on their current workload and skills
        
        $schedule = [];
        $technicianWorkloads = [];
        
        // Initialize technician workloads
        foreach ($technicians as $technician) {
            $technicianWorkloads[$technician['id']] = 0;
        }
        
        // Sort work orders by priority
        $sortedWorkOrders = $workOrders->sortByDesc(function ($wo) {
            return $wo->priority_score;
        });
        
        foreach ($sortedWorkOrders as $workOrder) {
            // Find technician with lowest workload
            $selectedTechnicianId = array_search(min($technicianWorkloads), $technicianWorkloads);
            
            // Schedule the work order
            $estimatedHours = $workOrder->estimated_hours ?? 4; // Default 4 hours
            $scheduledStart = $this->findNextAvailableSlot(
                $selectedTechnicianId,
                $startDate,
                $endDate,
                $estimatedHours
            );
            
            if ($scheduledStart) {
                $schedule[] = [
                    'work_order_id' => $workOrder->id,
                    'technician_id' => $selectedTechnicianId,
                    'start_date' => $scheduledStart,
                    'end_date' => $scheduledStart->copy()->addHours($estimatedHours),
                ];
                
                $technicianWorkloads[$selectedTechnicianId] += $estimatedHours;
            }
        }
        
        return [
            'schedule' => $schedule,
            'technician_workloads' => $technicianWorkloads,
            'unscheduled_count' => $workOrders->count() - count($schedule),
        ];
    }
    
    private function canSchedule(WorkOrder $workOrder): bool
    {
        return in_array($workOrder->status, [
            WorkOrder::STATUS_APPROVED,
            WorkOrder::STATUS_PLANNED,
            WorkOrder::STATUS_READY,
        ]);
    }
    
    private function findNextAvailableSlot(int $technicianId, Carbon $startDate, Carbon $endDate, float $hours): ?Carbon
    {
        // Simple implementation: find first available slot
        // In production, this would consider existing schedule, working hours, etc.
        
        $currentDate = $startDate->copy();
        
        while ($currentDate->lessThan($endDate)) {
            $availability = $this->checkTechnicianAvailability(
                $technicianId,
                $currentDate,
                $currentDate->copy()->addHours($hours)
            );
            
            if ($availability['available']) {
                return $currentDate;
            }
            
            $currentDate->addDay();
        }
        
        return null;
    }
}