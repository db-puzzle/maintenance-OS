<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\RouteTemplate;
use App\Models\Production\BillOfMaterial;
use Illuminate\Support\Facades\DB;

class ManufacturingOrderService
{
    /**
     * Create a new manufacturing order.
     */
    public function createOrder(array $data): ManufacturingOrder
    {
        return DB::transaction(function () use ($data) {
            // Generate order number if not provided
            if (!isset($data['order_number'])) {
                $data['order_number'] = $this->generateOrderNumber();
            }

            $order = ManufacturingOrder::create($data);
            
            // If BOM-based order, create child orders
            if ($order->bill_of_material_id) {
                $order->createChildOrders();
            }
            
            // Create route if template specified
            if (isset($data['route_template_id'])) {
                $this->createRouteFromTemplate($order, $data['route_template_id']);
            }
            
            return $order->fresh(['item', 'billOfMaterial', 'children']);
        });
    }

    /**
     * Create a manufacturing order from BOM.
     */
    public function createOrderFromBom(array $data): ManufacturingOrder
    {
        return DB::transaction(function () use ($data) {
            $bom = BillOfMaterial::with('currentVersion')->findOrFail($data['bill_of_material_id']);
            
            // The MO is for the BOM's output item
            $data['item_id'] = $bom->output_item_id;
            
            // Ensure we have the root BOM item's unit of measure
            $rootBomItem = $bom->currentVersion->items()
                ->whereNull('parent_item_id')
                ->first();
                
            $data['unit_of_measure'] = $data['unit_of_measure'] ?? $rootBomItem->unit_of_measure;
            
            // Generate order number if not provided
            if (!isset($data['order_number'])) {
                $data['order_number'] = $this->generateOrderNumber();
            }

            $order = ManufacturingOrder::create($data);
            
            // Create child orders for components
            $order->createChildOrders();
            
            return $order->fresh(['item', 'billOfMaterial', 'children']);
        });
    }

    /**
     * Generate a unique order number.
     */
    public function generateOrderNumber(): string
    {
        $year = now()->format('y'); // 2-digit year
        $month = now()->format('m'); // 2-digit month
        
        // Find the last order created in the current year and month
        $lastOrder = ManufacturingOrder::whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOrder) {
            // Extract the sequence number (5 digits after 'MO-YYMM-')
            $sequence = intval(substr($lastOrder->order_number, 8, 5)) + 1;
        } else {
            // No orders for current year and month, start at 1
            $sequence = 1;
        }
        
        return sprintf('MO-%s%s-%05d', $year, $month, $sequence);
    }

    /**
     * Create manufacturing route from template.
     */
    public function createRouteFromTemplate(ManufacturingOrder $order, int $templateId): void
    {
        $template = RouteTemplate::findOrFail($templateId);
        
        if (!$template->isCompatibleWithItem($order->item)) {
            throw new \Exception('Route template is not compatible with the item category');
        }

        $route = $order->manufacturingRoute()->create([
            'item_id' => $order->item_id,
            'route_template_id' => $templateId,
            'name' => $template->name,
            'description' => $template->description,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        $route->createFromTemplate($template);
    }

    /**
     * Release order for production.
     */
    public function releaseOrder(ManufacturingOrder $order): void
    {
        if (!$order->canBeReleased()) {
            throw new \Exception('Order cannot be released in current status');
        }

        // Check if order has a manufacturing route
        if (!$order->manufacturingRoute()->exists()) {
            throw new \Exception('Order must have a manufacturing route before it can be released');
        }

        // Check if route has at least one step
        if ($order->manufacturingRoute->steps()->count() === 0) {
            throw new \Exception('Manufacturing route must have at least one step before order can be released');
        }

        $order->update([
            'status' => 'released',
            'actual_start_date' => now(),
        ]);

        // Queue first steps that have no dependencies
        if ($order->manufacturingRoute) {
            $order->manufacturingRoute->steps()
                ->whereNull('depends_on_step_id')
                ->update(['status' => 'queued']);
        }
    }

    /**
     * Execute a manufacturing step.
     */
    public function executeStep(ManufacturingStep $step, array $data): ManufacturingStepExecution
    {
        // Validate step can be started
        if (!$step->canStart()) {
            throw new \Exception('Step dependencies not met');
        }
        
        // Handle different execution modes for quality checks
        if ($step->step_type === 'quality_check') {
            return $this->executeQualityCheck($step, $data);
        }
        
        // Standard step execution
        $execution = $step->startExecution(
            $data['part_number'] ?? null,
            $data['total_parts'] ?? null
        );
        
        // Execute associated form if exists
        if ($step->form_id) {
            $this->executeStepForm($execution, $step);
        }
        
        return $execution;
    }

    /**
     * Execute quality check step.
     */
    private function executeQualityCheck(ManufacturingStep $step, array $data): ManufacturingStepExecution
    {
        $productionQuantity = $step->manufacturingRoute->manufacturingOrder->quantity;
        $executions = [];
        
        switch ($step->quality_check_mode) {
            case 'every_part':
                // Create execution for each part
                for ($i = 1; $i <= $productionQuantity; $i++) {
                    $executions[] = $step->startExecution($i, $productionQuantity);
                }
                break;
                
            case 'entire_lot':
                // Single execution for entire lot
                $executions[] = $step->startExecution(null, $productionQuantity);
                break;
                
            case 'sampling':
                // Calculate sample size using ISO 2859
                $sampleSize = $this->calculateSampleSize($productionQuantity, $step->sampling_size);
                for ($i = 1; $i <= $sampleSize; $i++) {
                    $executions[] = $step->startExecution($i, $sampleSize);
                }
                break;
        }

        return $executions[0] ?? null; // Return first execution
    }

    /**
     * Calculate sample size based on ISO 2859.
     */
    private function calculateSampleSize(int $lotSize, ?int $specifiedSize): int
    {
        if ($specifiedSize) {
            return min($specifiedSize, $lotSize);
        }

        // ISO 2859 Level II sampling
        if ($lotSize <= 8) return $lotSize;
        if ($lotSize <= 15) return 5;
        if ($lotSize <= 25) return 8;
        if ($lotSize <= 50) return 13;
        if ($lotSize <= 90) return 20;
        if ($lotSize <= 150) return 32;
        if ($lotSize <= 280) return 50;
        if ($lotSize <= 500) return 80;
        if ($lotSize <= 1200) return 125;
        if ($lotSize <= 3200) return 200;
        
        return 315;
    }

    /**
     * Execute form associated with step.
     */
    private function executeStepForm(ManufacturingStepExecution $execution, ManufacturingStep $step): void
    {
        // This would integrate with the form execution system
        // For now, just record the association
        $execution->update(['form_execution_id' => null]); // TODO: Implement form execution
    }

    /**
     * Handle quality check failure.
     */
    public function handleQualityFailure(ManufacturingStepExecution $execution, string $action): void
    {
        if (!in_array($action, ['scrap', 'rework'])) {
            throw new \Exception('Invalid failure action');
        }

        $execution->update(['failure_action' => $action]);
        
        if ($action === 'rework') {
            // Create rework step if doesn't exist
            $step = $execution->manufacturingStep;
            $reworkStep = $step->manufacturingRoute->steps()
                ->where('step_type', 'rework')
                ->where('depends_on_step_id', $step->id)
                ->first();
                
            if (!$reworkStep) {
                $reworkStep = $step->createReworkStep();
            }
            
            // Queue rework step
            $reworkStep->update(['status' => 'queued']);
        } else {
            // Scrap - update production order quantity
            $order = $execution->manufacturingOrder;
            $order->increment('quantity_scrapped');
        }
    }

    /**
     * Complete a manufacturing step execution.
     */
    public function completeExecution(ManufacturingStepExecution $execution, array $data = []): void
    {
        $execution->complete($data);

        // Check if any dependent steps can now be queued
        $step = $execution->manufacturingStep;
        $dependentSteps = $step->dependentSteps()
            ->where('status', 'pending')
            ->get();

        foreach ($dependentSteps as $dependentStep) {
            if ($dependentStep->canStart()) {
                $dependentStep->update(['status' => 'queued']);
            }
        }
    }

    /**
     * Cancel a production order.
     */
    public function cancelOrder(ManufacturingOrder $order): void
    {
        if (!$order->canBeCancelled()) {
            if ($order->status === 'draft') {
                throw new \Exception('Draft orders cannot be cancelled. They should be deleted instead.');
            }
            throw new \Exception('Order cannot be cancelled in its current status.');
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'cancelled']);

            // Cancel all active step executions
            if ($order->manufacturingRoute) {
                $order->manufacturingRoute->steps()
                    ->whereIn('status', ['queued', 'in_progress', 'on_hold'])
                    ->update(['status' => 'skipped']);
            }

            // Cancel child orders
            $order->children()
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->update(['status' => 'cancelled']);
        });
    }
}