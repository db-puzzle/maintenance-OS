<?php

namespace App\Services\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingOrderDependency;
use App\Models\Production\ManufacturingOrderFlow;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
// RouteTemplate is deprecated - using unified ManufacturingRoute model
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
            if (! isset($data['order_number'])) {
                $data['order_number'] = $this->generateOrderNumber();
            }

            $order = ManufacturingOrder::create($data);

            // If BOM-based order, create child orders
            if ($order->bill_of_material_id) {
                $order->createChildOrders();
            }

            // Create route if template specified
            if (isset($data['route_template_id']) || isset($data['template_source_id'])) {
                $templateId = $data['template_source_id'] ?? $data['route_template_id'];
                $this->createRouteFromTemplate($order, $templateId);
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
            if (! isset($data['order_number'])) {
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
     * Format: MO-YYDDD-### where:
     * - YY = 2-digit year
     * - DDD = Julian day (001-365/366)
     * - ### = Daily sequential counter (001-999).
     */
    public function generateOrderNumber(): string
    {
        $now = now();
        $year = $now->format('y'); // 2-digit year
        $julianDay = $now->format('z') + 1; // Julian day (0-indexed, so add 1)

        // Find the last order created today
        $lastOrder = ManufacturingOrder::whereDate('created_at', $now->toDateString())
            ->where('order_number', 'like', sprintf('MO-%s%03d-%%', $year, $julianDay))
            ->whereNull('parent_id') // Only root orders for sequence counting
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOrder) {
            // Extract the sequence number (3 digits after 'MO-YYDDD-')
            $matches = [];
            if (preg_match('/MO-\d{5}-(\d{3})$/', $lastOrder->order_number, $matches)) {
                $sequence = intval($matches[1]) + 1;
            } else {
                $sequence = 1;
            }
        } else {
            // No orders for today, start at 1
            $sequence = 1;
        }

        return sprintf('MO-%s%03d-%03d', $year, $julianDay, $sequence);
    }

    /**
     * Create manufacturing route from template.
     */
    public function createRouteFromTemplate(ManufacturingOrder $order, int $templateId): void
    {
        $template = ManufacturingRoute::templates()->findOrFail($templateId);

        // Check compatibility
        if ($template->item_category_id &&
            $order->item->item_category_id !== $template->item_category_id) {
            throw new \Exception('Route template is not compatible with the item category');
        }

        $route = $order->manufacturingRoute()->create([
            'item_id' => $order->item_id,
            'template_source_id' => $templateId,
            'name' => $template->name,
            'description' => $template->description,
            'is_active' => true,
            'is_template' => false,
            'created_by' => auth()->id(),
        ]);

        $route->createFromTemplate($template);
    }

    /**
     * Release order for production.
     *
     * State Transition Rule: MO released → All first steps move to queued
     */
    public function releaseOrder(ManufacturingOrder $order): void
    {
        if (! $order->canBeReleased()) {
            if ($order->dependency_type !== 'none') {
                throw new \Exception('Child order dependencies not met for release');
            }
            throw new \Exception('Order cannot be released in current status');
        }

        DB::transaction(function () use ($order) {
            $order->update([
                'status' => 'released',
                'actual_start_date' => now(),
            ]);

            // Only queue steps if execution can start
            if ($order->canStartExecution() && $order->manufacturingRoute) {
                $this->queueFirstSteps($order);
            }

            // Log the release
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties(['previous_status' => $order->getOriginal('status')])
                ->log('Manufacturing order released');
        });
    }

    /**
     * Queue first steps when order can execute.
     */
    protected function queueFirstSteps(ManufacturingOrder $order): void
    {
        $firstSteps = $order->manufacturingRoute->steps()
            ->where('status', 'pending')
            ->whereNull('depends_on_step_id')
            ->get();

        foreach ($firstSteps as $step) {
            if ($step->canStart()) {
                $step->moveToQueued();
            }
        }
    }

    /**
     * Execute a manufacturing step.
     */
    public function executeStep(ManufacturingStep $step, array $data): ManufacturingStepExecution
    {
        // Validate step can be started
        if (! $step->canStart()) {
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

        // If this is the first started step, mark order as in_progress
        $order = $step->manufacturingRoute->manufacturingOrder;
        if (in_array($order->status, ['released', 'planned'])) {
            $order->update(['status' => 'in_progress', 'actual_start_date' => $order->actual_start_date ?? now()]);
        }

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
        if ($lotSize <= 8) {
            return $lotSize;
        }
        if ($lotSize <= 15) {
            return 5;
        }
        if ($lotSize <= 25) {
            return 8;
        }
        if ($lotSize <= 50) {
            return 13;
        }
        if ($lotSize <= 90) {
            return 20;
        }
        if ($lotSize <= 150) {
            return 32;
        }
        if ($lotSize <= 280) {
            return 50;
        }
        if ($lotSize <= 500) {
            return 80;
        }
        if ($lotSize <= 1200) {
            return 125;
        }
        if ($lotSize <= 3200) {
            return 200;
        }

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
        if (! in_array($action, ['scrap', 'rework'])) {
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

            if (! $reworkStep) {
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
        $step = $execution->manufacturingStep;

        // For quality check steps, move to awaiting_quality instead of completed
        if ($step->step_type === 'quality_check' && ! isset($data['quality_result'])) {
            $execution->update(['status' => 'completed']);
            $step->moveToAwaitingQuality();

            return;
        }

        // Track quantities at execution level for progressive flow
        if (isset($data['quantity_completed'])) {
            $execution->reportQuantity(
                $data['quantity_completed'],
                $data['quantity_scrapped'] ?? 0
            );

            // If this is a last step, propagate to parent order
            if ($step->isLastStep()) {
                $order = $step->manufacturingRoute->manufacturingOrder;
                $this->handleChildOrderProgress($order, $data['quantity_completed']);
            }
        }

        $execution->complete($data);

        // Check if step is complete
        if ($this->isStepComplete($step)) {
            $step->complete();
        }

        // If first execution of the first step started, mark order in progress
        $order = $step->manufacturingRoute->manufacturingOrder;
        if ($order->status === 'released' && $step->isFirstStep()) {
            $order->update(['status' => 'in_progress']);
        }
    }

    /**
     * Record quality check result.
     *
     * Transitions step from awaiting_quality to completed (passed) or handles failure
     */
    public function recordQualityResult(ManufacturingStep $step, array $data): void
    {
        if ($step->status !== 'awaiting_quality') {
            throw new \Exception('Step must be awaiting quality check results.');
        }

        if (! in_array($data['quality_result'], ['passed', 'failed'])) {
            throw new \Exception('Invalid quality result.');
        }

        DB::transaction(function () use ($step, $data) {
            // Update step with quality result
            $step->update([
                'quality_result' => $data['quality_result'],
            ]);

            if ($data['quality_result'] === 'passed') {
                // Quality passed, complete the step
                $step->complete();
            } else {
                // Quality failed, handle failure action
                if (! isset($data['failure_action'])) {
                    throw new \Exception('Failure action required for failed quality check.');
                }

                $step->update(['failure_action' => $data['failure_action']]);

                if ($data['failure_action'] === 'rework') {
                    // Create or queue rework step
                    $reworkStep = $step->dependentSteps()
                        ->where('step_type', 'rework')
                        ->first();

                    if (! $reworkStep) {
                        $reworkStep = $step->createReworkStep();
                    }

                    $reworkStep->moveToQueued();
                } else {
                    // Scrap - update order quantities
                    $order = $step->manufacturingRoute->manufacturingOrder;
                    $scrappedQuantity = $data['scrapped_quantity'] ?? 1;
                    $order->increment('quantity_scrapped', $scrappedQuantity);

                    // Mark step as completed even though it failed
                    $step->complete();
                }
            }
        });
    }

    /**
     * Cancel a production order.
     *
     * State Transition Rule: MO cancelled → All non-completed steps move to cancelled
     */
    public function cancelOrder(ManufacturingOrder $order): void
    {
        if (! $order->canBeCancelled()) {
            if ($order->status === 'draft') {
                throw new \Exception('Draft orders cannot be cancelled. They should be deleted instead.');
            }
            throw new \Exception('Order cannot be cancelled in its current status.');
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'cancelled']);

            // Cancel all non-completed steps
            if ($order->manufacturingRoute) {
                $cancellableSteps = $order->manufacturingRoute->steps()
                    ->cancellable()
                    ->get();

                foreach ($cancellableSteps as $step) {
                    $step->cancel();
                }
            }

            // Cancel child orders
            $childOrders = $order->children()
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->get();

            foreach ($childOrders as $childOrder) {
                $this->cancelOrder($childOrder);
            }
        });
    }

    /**
     * Put order on hold.
     *
     * State Transition Rule: MO on_hold → All active steps move to on_hold
     */
    public function putOrderOnHold(ManufacturingOrder $order, ?string $reason = null): void
    {
        if (! in_array($order->status, ['released', 'in_progress'])) {
            throw new \Exception('Order cannot be put on hold in its current status.');
        }

        DB::transaction(function () use ($order, $reason) {
            $order->update([
                'status' => 'on_hold',
                'hold_reason' => $reason,
                'hold_at' => now(),
            ]);

            // Put all active steps on hold
            if ($order->manufacturingRoute) {
                $activeSteps = $order->manufacturingRoute->steps()
                    ->active()
                    ->whereIn('status', ['in_progress', 'awaiting_quality'])
                    ->get();

                foreach ($activeSteps as $step) {
                    $step->putOnHold();
                }
            }
        });
    }

    /**
     * Resume order from hold.
     *
     * State Transition Rule: Resume on_hold steps back to their previous state
     */
    public function resumeOrderFromHold(ManufacturingOrder $order): void
    {
        if ($order->status !== 'on_hold') {
            throw new \Exception('Order is not on hold.');
        }

        DB::transaction(function () use ($order) {
            // Determine what status to return to
            $newStatus = 'released';

            // If any step was in progress, return to in_progress
            if ($order->manufacturingRoute) {
                $hasInProgressSteps = $order->manufacturingRoute->steps()
                    ->where('status', 'on_hold')
                    ->exists();

                if ($hasInProgressSteps) {
                    $newStatus = 'in_progress';
                }
            }

            $order->update([
                'status' => $newStatus,
                'hold_reason' => null,
                'hold_at' => null,
            ]);

            // Resume all on_hold steps
            if ($order->manufacturingRoute) {
                $onHoldSteps = $order->manufacturingRoute->steps()
                    ->where('status', 'on_hold')
                    ->get();

                foreach ($onHoldSteps as $step) {
                    $step->resumeFromHold();
                }
            }
        });
    }

    /**
     * Handle child order completion and propagate to parent.
     */
    public function handleChildOrderProgress(ManufacturingOrder $childOrder, float $quantityCompleted): void
    {
        if (! $childOrder->parent_id) {
            return;
        }

        DB::transaction(function () use ($childOrder, $quantityCompleted) {
            $parentOrder = $childOrder->parent;

            // Record the material flow
            ManufacturingOrderFlow::create([
                'source_order_id' => $childOrder->id,
                'destination_order_id' => $parentOrder->id,
                'quantity_transferred' => $quantityCompleted,
                'transferred_at' => now(),
                'created_by' => auth()->id() ?? $childOrder->created_by,
            ]);

            // Update parent order progress
            $parentOrder->updateFromChildProgress($childOrder, $quantityCompleted);

            // Check if parent should auto-complete
            if ($parentOrder->auto_complete_on_children) {
                $parentOrder->checkAutoCompletion();
            }
        });
    }

    /**
     * Report step progress without completing execution.
     */
    public function reportStepProgress(ManufacturingStep $step, array $data): void
    {
        DB::transaction(function () use ($step, $data) {
            // Create a progress report without completing the execution
            $step->updateCumulativeQuantities(
                $data['quantity_completed'],
                $data['quantity_scrapped'] ?? 0
            );

            // Update order quantities
            $order = $step->manufacturingRoute->manufacturingOrder;
            $order->increment('quantity_completed', $data['quantity_completed']);

            if (isset($data['quantity_scrapped'])) {
                $order->increment('quantity_scrapped', $data['quantity_scrapped']);
            }

            // If this is a last step, propagate to parent order
            if ($step->isLastStep()) {
                $this->handleChildOrderProgress($order, $data['quantity_completed']);
            }
        });
    }

    /**
     * Check if step is complete based on quantity.
     */
    protected function isStepComplete(ManufacturingStep $step): bool
    {
        $order = $step->manufacturingRoute->manufacturingOrder;

        return $step->cumulative_quantity_completed >= $order->quantity;
    }

    /**
     * Create initial order dependencies based on BOM.
     */
    public function createOrderDependencies(ManufacturingOrder $parentOrder): void
    {
        foreach ($parentOrder->children as $childOrder) {
            ManufacturingOrderDependency::create([
                'parent_order_id' => $parentOrder->id,
                'child_order_id' => $childOrder->id,
                'dependency_type' => 'required',
                'minimum_percentage' => 100.00, // Default to traditional batch completion
            ]);
        }

        // Calculate total required quantity from children
        $totalRequired = $parentOrder->children()
            ->join('bom_items', 'manufacturing_orders.item_id', '=', 'bom_items.item_id')
            ->where('bom_items.bom_version_id', $parentOrder->billOfMaterial->currentVersion->id)
            ->sum(DB::raw('bom_items.quantity * manufacturing_orders.quantity'));

        $parentOrder->update(['cumulative_children_quantity_required' => $totalRequired]);
    }

    /**
     * Update dependency configuration.
     */
    public function updateOrderDependency(ManufacturingOrder $order, array $data): void
    {
        $order->update([
            'dependency_type' => $data['dependency_type'],
            'dependency_minimum_quantity' => $data['dependency_minimum_quantity'] ?? null,
            'dependency_minimum_percentage' => $data['dependency_minimum_percentage'] ?? null,
            'can_release_before_children' => $data['can_release_before_children'] ?? false,
        ]);

        // If progressive dependencies, update individual child dependencies
        if ($data['dependency_type'] === 'progressive' && isset($data['child_dependencies'])) {
            foreach ($data['child_dependencies'] as $childDep) {
                ManufacturingOrderDependency::updateOrCreate(
                    [
                        'parent_order_id' => $order->id,
                        'child_order_id' => $childDep['child_order_id'],
                    ],
                    [
                        'dependency_type' => $childDep['dependency_type'] ?? 'required',
                        'minimum_quantity' => $childDep['minimum_quantity'] ?? null,
                        'minimum_percentage' => $childDep['minimum_percentage'] ?? null,
                    ]
                );
            }
        }
    }
}
