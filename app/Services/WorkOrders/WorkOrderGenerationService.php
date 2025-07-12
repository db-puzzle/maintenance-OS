<?php

namespace App\Services\WorkOrders;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class WorkOrderGenerationService
{
    /**
     * Generate work orders for all active routines that are due
     */
    public function generateDueWorkOrders(): Collection
    {
        $generatedWorkOrders = collect();
        
        $routines = Routine::active()
            ->with(['asset', 'form'])
            ->get();
            
        foreach ($routines as $routine) {
            if ($routine->shouldGenerateWorkOrder()) {
                try {
                    $workOrder = $routine->generateWorkOrder();
                    $generatedWorkOrders->push($workOrder);
                    
                    Log::info('Generated work order', [
                        'routine_id' => $routine->id,
                        'work_order_id' => $workOrder->id,
                        'work_order_number' => $workOrder->work_order_number,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to generate work order', [
                        'routine_id' => $routine->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }
        }
        
        return $generatedWorkOrders;
    }
    
    /**
     * Preview upcoming work orders for planning
     */
    public function previewUpcomingWorkOrders(int $daysAhead = 30): Collection
    {
        $upcoming = collect();
        
        $routines = Routine::active()
            ->with(['asset', 'form'])
            ->get();
            
        foreach ($routines as $routine) {
            $nextDue = $routine->getNextDueDate();
            
            if ($nextDue->lessThanOrEqualTo(now()->addDays($daysAhead))) {
                // Check if work order already exists
                $exists = $routine->workOrders()
                    ->open()
                    ->exists();
                    
                if (!$exists) {
                    $upcoming->push([
                        'routine' => $routine,
                        'asset' => $routine->asset,
                        'due_date' => $nextDue,
                        'days_until_due' => now()->diffInDays($nextDue, false),
                        'priority' => $this->calculatePriority($routine, $nextDue),
                    ]);
                }
            }
        }
        
        return $upcoming->sortBy('due_date');
    }
    
    /**
     * Generate work order for a specific routine
     */
    public function generateForRoutine(Routine $routine, ?Carbon $dueDate = null): WorkOrder
    {
        if (!$routine->shouldGenerateWorkOrder() && !$dueDate) {
            throw new \Exception('Work order is not due for generation');
        }
        
        return $routine->generateWorkOrder($dueDate);
    }
    
    /**
     * Generate work orders for multiple routines
     */
    public function generateForRoutines(Collection $routines): Collection
    {
        $generatedWorkOrders = collect();
        
        foreach ($routines as $routine) {
            try {
                if ($routine->shouldGenerateWorkOrder()) {
                    $workOrder = $routine->generateWorkOrder();
                    $generatedWorkOrders->push($workOrder);
                }
            } catch (\Exception $e) {
                Log::error('Failed to generate work order for routine', [
                    'routine_id' => $routine->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        return $generatedWorkOrders;
    }
    
    /**
     * Calculate priority based on due date
     */
    private function calculatePriority(Routine $routine, Carbon $dueDate): string
    {
        $daysUntilDue = now()->diffInDays($dueDate, false);
        
        if ($daysUntilDue < 0) {
            return 'urgent'; // Overdue
        } elseif ($daysUntilDue <= 3) {
            return 'high';
        } elseif ($daysUntilDue <= 7) {
            return 'normal';
        }
        
        return 'low';
    }
}