<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderStatusHistory;
use Illuminate\Support\Facades\DB;

abstract class BaseWorkOrderService
{
    /**
     * Create a new work order
     */
    public function create(array $data): WorkOrder
    {
        // Set discipline based on service implementation
        $data['discipline'] = $this->getDiscipline();
        
        // Set the requesting user and timestamp
        $data['requested_by'] = auth()->id();
        $data['requested_at'] = now();
        
        // Validate for specific discipline
        $this->validateForDiscipline($data);
        
        return DB::transaction(function () use ($data) {
            // Create work order
            $workOrder = WorkOrder::create($data);
            

            
            // Record creation in status history
            WorkOrderStatusHistory::create([
                'work_order_id' => $workOrder->id,
                'from_status' => null,
                'to_status' => 'requested',
                'changed_by' => auth()->id(),
                'metadata' => [
                    'source' => $data['source_type'] ?? 'manual',
                    'source_id' => $data['source_id'] ?? null,
                ],
            ]);
            
            return $workOrder;
        });
    }
    
    /**
     * Update a work order
     */
    public function update(WorkOrder $workOrder, array $data): WorkOrder
    {
        // Validate for specific discipline
        $this->validateForDiscipline(array_merge($workOrder->toArray(), $data));
        
        $workOrder->update($data);
        
        return $workOrder;
    }
    
    /**
     * Get the discipline this service handles
     */
    abstract protected function getDiscipline(): string;
    
    /**
     * Validate data for the specific discipline
     */
    abstract protected function validateForDiscipline(array $data): void;
    
    /**
     * Generate work order from source (routine, sensor, etc.)
     */
    abstract public function generateFromSource(string $sourceType, $source, array $additionalData = []): WorkOrder;
} 