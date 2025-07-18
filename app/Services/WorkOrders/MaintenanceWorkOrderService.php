<?php

namespace App\Services\WorkOrders;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use App\Models\WorkOrders\WorkOrderCategory;
use Illuminate\Validation\ValidationException;

class MaintenanceWorkOrderService extends BaseWorkOrderService
{
    /**
     * Get the discipline this service handles
     */
    protected function getDiscipline(): string
    {
        return 'maintenance';
    }
    
    /**
     * Validate data for maintenance discipline
     */
    protected function validateForDiscipline(array $data): void
    {
        // Maintenance requires asset
        if (empty($data['asset_id'])) {
            throw ValidationException::withMessages([
                'asset_id' => ['Asset is required for maintenance work orders']
            ]);
        }
        
        // Validate category is allowed for maintenance
        $category = WorkOrderCategory::find($data['work_order_category_id']);
        if (!$category || $category->discipline !== 'maintenance') {
            throw ValidationException::withMessages([
                'work_order_category_id' => ['Invalid category for maintenance discipline']
            ]);
        }
        
        // Validate source type is allowed for this category
        if (isset($data['source_type']) && !$category->isSourceAllowed($data['source_type'])) {
            throw ValidationException::withMessages([
                'source_type' => ['Invalid source type for this category']
            ]);
        }
        
        // Validate routine source if applicable
        if (isset($data['source_type']) && $data['source_type'] === 'routine') {
            $this->validateRoutineSource($data);
        }
    }
    
    /**
     * Validate routine source
     */
    private function validateRoutineSource(array $data): void
    {
        if (empty($data['source_id'])) {
            throw ValidationException::withMessages([
                'source_id' => ['Routine ID is required when source type is routine']
            ]);
        }
        
        $routine = Routine::find($data['source_id']);
        if (!$routine) {
            throw ValidationException::withMessages([
                'source_id' => ['Invalid routine ID']
            ]);
        }
        
        // Check if routine already has an active work order
        $activeWorkOrder = WorkOrder::where('source_type', 'routine')
            ->where('source_id', $routine->id)
            ->whereNotIn('status', [WorkOrder::STATUS_CLOSED, WorkOrder::STATUS_CANCELLED])
            ->first();
            
        if ($activeWorkOrder && $routine->execution_mode === 'automatic') {
            throw ValidationException::withMessages([
                'source_id' => ['This routine already has an active work order']
            ]);
        }
    }
    
    /**
     * Generate work order from source
     */
    public function generateFromSource(string $sourceType, $source, array $additionalData = []): WorkOrder
    {
        switch ($sourceType) {
            case 'routine':
                return $this->generateFromRoutine($source, $additionalData);
            case 'sensor':
                return $this->generateFromSensor($source, $additionalData);
            case 'inspection':
                return $this->generateFromInspection($source, $additionalData);
            default:
                throw new \InvalidArgumentException("Unsupported source type: {$sourceType}");
        }
    }
    
    /**
     * Generate work order from routine
     */
    private function generateFromRoutine(Routine $routine, array $additionalData = []): WorkOrder
    {
        // Get preventive category
        $preventiveCategory = WorkOrderCategory::where('code', 'preventive')
            ->where('discipline', 'maintenance')
            ->first();
            
        if (!$preventiveCategory) {
            throw new \RuntimeException('No preventive category found for maintenance');
        }
        
        // Get preventive work order type
        $workOrderType = WorkOrderType::where('work_order_category_id', $preventiveCategory->id)
            ->where('is_active', true)
            ->first();
            
        if (!$workOrderType) {
            throw new \RuntimeException('No active preventive work order type found');
        }
        
        $data = array_merge([
            'title' => "Manutenção Preventiva - {$routine->name}",
            'description' => $routine->description ?? "Executar rotina de manutenção preventiva conforme procedimento padrão.",
            'work_order_type_id' => $workOrderType->id,
            'work_order_category_id' => $preventiveCategory->id,
            'priority' => $routine->getPriorityFromScore(),
            'asset_id' => $routine->asset_id,
            'form_id' => $routine->form_id,
            'form_version_id' => $routine->active_form_version_id,
            'source_type' => 'routine',
            'source_id' => $routine->id,
            'requested_by' => auth()->id() ?? 1, // System user if not authenticated
            'requested_due_date' => now()->addHours(48), // Default 48 hours
        ], $additionalData);
        
        $workOrder = $this->create($data);
        
        // Auto-approve if configured
        if ($routine->auto_approve_work_orders && $workOrder->type->auto_approve_from_routine) {
            $workOrder->transitionTo(WorkOrder::STATUS_APPROVED, auth()->user() ?? \App\Models\User::find(1));
        }
        
        return $workOrder;
    }
    
    /**
     * Generate work order from sensor alert
     */
    private function generateFromSensor($sensor, array $additionalData = []): WorkOrder
    {
        // Implementation for sensor-based work orders
        throw new \RuntimeException('Sensor-based work order generation not yet implemented');
    }
    
    /**
     * Generate work order from inspection finding
     */
    private function generateFromInspection($inspection, array $additionalData = []): WorkOrder
    {
        // Implementation for inspection-based work orders
        throw new \RuntimeException('Inspection-based work order generation not yet implemented');
    }
} 