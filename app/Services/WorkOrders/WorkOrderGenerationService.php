<?php

namespace App\Services\WorkOrders;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderCategory;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class WorkOrderGenerationService
{
    protected MaintenanceWorkOrderService $maintenanceService;
    
    public function __construct(MaintenanceWorkOrderService $maintenanceService)
    {
        $this->maintenanceService = $maintenanceService;
    }
    
    /**
     * Generate due work orders for routines in automatic execution mode
     */
    public function generateDueWorkOrders(): Collection
    {
        $generatedWorkOrders = collect();
        
        // Process runtime-based routines
        $runtimeRoutines = Routine::automatic()
            ->active()
            ->runtimeBased()
            ->with(['asset.latestRuntimeMeasurement', 'asset.shift', 'createdBy'])
            ->get();
            
        Log::info("Found {$runtimeRoutines->count()} active runtime-based routines");
        
        // Process calendar-based routines
        $calendarRoutines = Routine::automatic()
            ->active()
            ->calendarBased()
            ->with(['asset', 'createdBy'])
            ->get();
            
        Log::info("Found {$calendarRoutines->count()} active calendar-based routines");
        
        // Process all routines
        $allRoutines = $runtimeRoutines->merge($calendarRoutines);
        
        foreach ($allRoutines as $routine) {
            try {
                if ($routine->shouldGenerateWorkOrder()) {
                    $workOrder = $this->generateWorkOrderFromRoutine($routine);
                    
                    if ($workOrder) {
                        $generatedWorkOrders->push($workOrder);
                        $this->logGeneration($workOrder, $routine);
                    }
                } else {
                    // Log why work order was not generated
                    $this->logSkippedRoutine($routine);
                }
            } catch (\Exception $e) {
                Log::error('Failed to generate work order from routine', [
                    'routine_id' => $routine->id,
                    'routine_name' => $routine->name,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }
        
        Log::info("Generated {$generatedWorkOrders->count()} work orders");
        
        return $generatedWorkOrders;
    }
    
    /**
     * Generate work order from routine
     */
    protected function generateWorkOrderFromRoutine(Routine $routine): ?WorkOrder
    {
        $workOrder = $routine->generateWorkOrder();
        
        // Apply auto-approval if configured and user has permission
        if ($routine->auto_approve_work_orders) {
            $this->applyAutoApproval($workOrder, $routine);
        }
        
        return $workOrder;
    }
    
    /**
     * Apply auto-approval to work order if conditions are met
     */
    protected function applyAutoApproval(WorkOrder $workOrder, Routine $routine): void
    {
        $approver = $routine->createdBy;
        
        if (!$approver) {
            Log::warning("Auto-approval failed for routine {$routine->id}: No creator found");
            return;
        }
        
        if ($approver->can('work-orders.approve')) {
            $workOrder->update([
                'status' => WorkOrder::STATUS_APPROVED,
                'approved_at' => now(),
                'approved_by' => $approver->id,
            ]);
            
            // Record status change
            $workOrder->statusHistory()->create([
                'from_status' => WorkOrder::STATUS_REQUESTED,
                'to_status' => WorkOrder::STATUS_APPROVED,
                'changed_by' => $approver->id,
                'reason' => 'Auto-approved by routine configuration',
                'changed_at' => now(),
            ]);
            
            Log::info("Work order auto-approved", [
                'work_order_id' => $workOrder->id,
                'work_order_number' => $workOrder->work_order_number,
                'routine_id' => $routine->id,
                'approver_id' => $approver->id,
            ]);
        } else {
            Log::warning("Auto-approval failed for routine {$routine->id}: Creator lacks work-orders.approve permission");
        }
    }
    
    /**
     * Log why a routine was skipped
     */
    protected function logSkippedRoutine(Routine $routine): void
    {
        $reasons = [];
        
        if (!$routine->is_active) {
            $reasons[] = 'Routine is inactive';
        }
        
        if ($routine->hasOpenWorkOrder()) {
            $openWO = $routine->getOpenWorkOrder();
            $reasons[] = "Open work order exists: {$openWO->work_order_number} (Status: {$openWO->status})";
        }
        
        $hoursUntilDue = $routine->calculateHoursUntilDue();
        if ($hoursUntilDue !== null && $hoursUntilDue > $routine->advance_generation_days) {
            $reasons[] = "Not yet due: {$hoursUntilDue} hours until due (advance window: {$routine->advance_generation_days}h)";
        }
        
        if (empty($reasons)) {
            $reasons[] = 'Unknown reason';
        }
        
        Log::info("Skipped routine for work order generation", [
            'routine_id' => $routine->id,
            'routine_name' => $routine->name,
            'trigger_type' => $routine->trigger_type,
            'reasons' => $reasons,
        ]);
    }
    
    /**
     * Log work order generation
     */
    protected function logGeneration(WorkOrder $workOrder, Routine $routine): void
    {
        $triggerInfo = $routine->trigger_type === 'runtime_hours'
            ? "{$routine->trigger_runtime_hours}h runtime"
            : "{$routine->trigger_calendar_days} days";
            
        Log::info('Work order generated from routine', [
            'work_order_id' => $workOrder->id,
            'work_order_number' => $workOrder->work_order_number,
            'routine_id' => $routine->id,
            'routine_name' => $routine->name,
            'trigger_type' => $routine->trigger_type,
            'trigger_info' => $triggerInfo,
            'asset_id' => $routine->asset_id,
            'asset_tag' => $routine->asset->tag,
        ]);
    }
} 