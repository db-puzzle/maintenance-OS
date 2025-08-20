# Manufacturing Order Routing - Progressive Flow Code Examples (Augmented)

This document contains all code examples and technical implementation details for the progressive flow manufacturing feature described in the main requirements document. It includes both step-level progressive flow within manufacturing orders and order-level progressive flow for hierarchical dependencies.

## Database Schema Changes

### Manufacturing Order Hierarchical Dependencies

```sql
-- Add hierarchical dependency fields to manufacturing_orders table
ALTER TABLE manufacturing_orders
ADD COLUMN dependency_type ENUM('none', 'all_children_released', 'children_quantity', 'children_percentage', 'progressive') DEFAULT 'none',
ADD COLUMN dependency_minimum_quantity DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN dependency_minimum_percentage DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN can_release_before_children BOOLEAN DEFAULT false,
ADD COLUMN cumulative_children_quantity_completed DECIMAL(10,2) DEFAULT 0,
ADD COLUMN cumulative_children_quantity_required DECIMAL(10,2) DEFAULT 0;

-- Create manufacturing order dependencies table
CREATE TABLE manufacturing_order_dependencies (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parent_order_id BIGINT UNSIGNED NOT NULL,
    child_order_id BIGINT UNSIGNED NOT NULL,
    dependency_type ENUM('required', 'optional') DEFAULT 'required',
    minimum_quantity DECIMAL(10,2) DEFAULT NULL,
    minimum_percentage DECIMAL(5,2) DEFAULT NULL,
    quantity_completed DECIMAL(10,2) DEFAULT 0,
    is_satisfied BOOLEAN DEFAULT false,
    satisfied_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    
    CONSTRAINT fk_mod_parent_order FOREIGN KEY (parent_order_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_mod_child_order FOREIGN KEY (child_order_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_parent_child (parent_order_id, child_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create order flow tracking table
CREATE TABLE manufacturing_order_flows (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    source_order_id BIGINT UNSIGNED NOT NULL,
    destination_order_id BIGINT UNSIGNED NOT NULL,
    quantity_transferred DECIMAL(10,2) NOT NULL,
    transferred_at TIMESTAMP NOT NULL,
    notes TEXT DEFAULT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    
    CONSTRAINT fk_mof_source FOREIGN KEY (source_order_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_mof_destination FOREIGN KEY (destination_order_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_mof_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_source_destination (source_order_id, destination_order_id),
    INDEX idx_transferred_at (transferred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Manufacturing Step Progressive Flow

```sql
-- Remove step_number from manufacturing_steps table
ALTER TABLE manufacturing_steps 
DROP COLUMN step_number,
DROP INDEX `manufacturing_route_id_step_number_unique`;

-- Add new columns to manufacturing_steps table
ALTER TABLE manufacturing_steps 
ADD COLUMN dependency_start_condition ENUM('completed', 'quantity_based', 'percentage_based', 'immediate') DEFAULT 'completed',
ADD COLUMN dependency_minimum_quantity INT DEFAULT NULL,
ADD COLUMN dependency_minimum_percentage DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN display_order INT DEFAULT 0,
ADD INDEX idx_display_order (manufacturing_route_id, display_order);

-- Add quantity tracking to step executions
ALTER TABLE manufacturing_step_executions
ADD COLUMN quantity_completed INT DEFAULT 0,
ADD COLUMN quantity_scrapped INT DEFAULT 0;

-- Add cumulative tracking to steps
ALTER TABLE manufacturing_steps
ADD COLUMN cumulative_quantity_completed INT DEFAULT 0,
ADD COLUMN cumulative_quantity_scrapped INT DEFAULT 0;
```

## Model Implementations

### ManufacturingOrder.php

```php
// Hierarchical dependency checking methods
public function canBeReleased(): bool
{
    // Existing status checks
    if (!in_array($this->status, ['draft', 'planned'])) {
        return false;
    }
    
    // New hierarchical dependency checks
    if ($this->dependency_type !== 'none' && !$this->can_release_before_children) {
        return $this->checkChildOrderDependencies();
    }
    
    // Existing route checks (now optional based on business rules)
    if ($this->manufacturingRoute()->exists() && 
        $this->manufacturingRoute->steps()->count() === 0) {
        return false;
    }
    
    return true;
}

// Check child order dependencies for release
protected function checkChildOrderDependencies(): bool
{
    switch ($this->dependency_type) {
        case 'all_children_released':
            return $this->children()
                ->whereNotIn('status', ['released', 'in_progress', 'completed'])
                ->count() === 0;
                
        case 'children_quantity':
        case 'children_percentage':
            // For release, we might have different rules than execution
            return true; // Can release but not execute
            
        case 'progressive':
            return $this->checkProgressiveReleaseDependencies();
    }
    
    return true;
}

// Check if order can start execution
public function canStartExecution(): bool
{
    if ($this->dependency_type === 'none') {
        return true;
    }
    
    switch ($this->dependency_type) {
        case 'all_children_released':
            return $this->children()
                ->whereNotIn('status', ['released', 'in_progress', 'completed'])
                ->count() === 0;
                
        case 'children_quantity':
            return $this->cumulative_children_quantity_completed >= 
                   $this->dependency_minimum_quantity;
                
        case 'children_percentage':
            if ($this->cumulative_children_quantity_required == 0) {
                return true; // No children quantities required
            }
            $requiredQuantity = ($this->cumulative_children_quantity_required * 
                                $this->dependency_minimum_percentage) / 100;
            return $this->cumulative_children_quantity_completed >= $requiredQuantity;
                
        case 'progressive':
            return $this->checkProgressiveDependencies();
    }
    
    return false;
}

// Check progressive dependencies (mixed rules per child)
protected function checkProgressiveDependencies(): bool
{
    $dependencies = ManufacturingOrderDependency::where('parent_order_id', $this->id)
        ->where('dependency_type', 'required')
        ->where('is_satisfied', false)
        ->count();
        
    return $dependencies === 0;
}

// Update from child order progress
public function updateFromChildProgress(ManufacturingOrder $childOrder, float $quantityCompleted): void
{
    DB::transaction(function () use ($childOrder, $quantityCompleted) {
        // Update cumulative tracking
        $this->increment('cumulative_children_quantity_completed', $quantityCompleted);
        
        // Update specific dependency tracking
        $dependency = ManufacturingOrderDependency::where('parent_order_id', $this->id)
            ->where('child_order_id', $childOrder->id)
            ->first();
            
        if ($dependency) {
            $dependency->increment('quantity_completed', $quantityCompleted);
            
            // Check if dependency is now satisfied
            if ($dependency->minimum_quantity && 
                $dependency->quantity_completed >= $dependency->minimum_quantity) {
                $dependency->update([
                    'is_satisfied' => true,
                    'satisfied_at' => now()
                ]);
            } elseif ($dependency->minimum_percentage) {
                $childTotal = $childOrder->quantity;
                $percentage = ($dependency->quantity_completed / $childTotal) * 100;
                if ($percentage >= $dependency->minimum_percentage) {
                    $dependency->update([
                        'is_satisfied' => true,
                        'satisfied_at' => now()
                    ]);
                }
            }
        }
        
        // Check if execution can now start
        if ($this->status === 'released' && $this->canStartExecution()) {
            $this->notifyExecutionReady();
            
            // Auto-queue first steps if route exists
            if ($this->manufacturingRoute) {
                $this->queueFirstSteps();
            }
        }
    });
}

// Queue first steps when dependencies are met
protected function queueFirstSteps(): void
{
    $firstSteps = $this->manufacturingRoute->steps()
        ->where('status', 'pending')
        ->whereNull('depends_on_step_id')
        ->get();
        
    foreach ($firstSteps as $step) {
        if ($step->canStart()) {
            $step->moveToQueued();
        }
    }
}

// Calculate hierarchical WIP
public function getHierarchicalWIPAttribute(): array
{
    $orderWip = $this->quantity_completed - $this->getShippedQuantity();
    $childrenWip = 0;
    
    foreach ($this->children as $child) {
        $childData = $child->hierarchical_wip;
        $childrenWip += $childData['total_hierarchy_wip'];
    }
    
    return [
        'order_level' => $orderWip,
        'children_wip' => $childrenWip,
        'total_hierarchy_wip' => $orderWip + $childrenWip
    ];
}

// Get total quantity that has been shipped
protected function getShippedQuantity(): float
{
    return $this->shipmentItems()
        ->whereHas('shipment', function ($query) {
            $query->where('status', 'shipped');
        })
        ->sum('quantity_shipped');
}

// Original WIP methods (enhanced for step-level progressive flow)
public function getWorkInProgressQuantityAttribute(): int
{
    // Handle orders without routes
    if (!$this->manufacturingRoute || $this->manufacturingRoute->steps->isEmpty()) {
        return 0;
    }
    
    // Get first steps (may be multiple with parallel execution)
    $firstSteps = $this->manufacturingRoute->steps()
        ->whereNull('depends_on_step_id')
        ->get();
        
    // Get last steps (no dependent steps)
    $lastSteps = $this->manufacturingRoute->steps()
        ->whereDoesntHave('dependentSteps')
        ->get();
    
    if ($firstSteps->isEmpty() || $lastSteps->isEmpty()) {
        return 0;
    }
    
    // For parallel first steps, sum their completed quantities
    $enteredProduction = $firstSteps->sum('cumulative_quantity_completed');
    
    // For parallel last steps, sum their completed quantities
    $exitedProduction = $lastSteps->sum('cumulative_quantity_completed');
    
    // WIP = Total entered - Total exited
    return max(0, $enteredProduction - $exitedProduction);
}

// Relationship for order dependencies
public function parentDependencies()
{
    return $this->hasMany(ManufacturingOrderDependency::class, 'child_order_id');
}

public function childDependencies()
{
    return $this->hasMany(ManufacturingOrderDependency::class, 'parent_order_id');
}
```

### ManufacturingStep.php

```php
// Enhanced canStart method that considers order-level dependencies for first steps
public function canStart(): bool
{
    // For first steps, check order-level dependencies
    if ($this->isFirstStep()) {
        $order = $this->manufacturingRoute->manufacturingOrder;
        if (!$order->canStartExecution()) {
            return false;
        }
    }
    
    // If no step dependency, can start
    if (!$this->depends_on_step_id) {
        return true;
    }
    
    $dependency = $this->dependency;
    
    switch ($this->dependency_start_condition) {
        case 'completed':
            return $dependency->status === 'completed';
            
        case 'quantity_based':
            return $dependency->cumulative_quantity_completed >= $this->dependency_minimum_quantity;
            
        case 'percentage_based':
            $targetQuantity = $dependency->manufacturingRoute->manufacturingOrder->quantity;
            $completedPercentage = ($dependency->cumulative_quantity_completed / $targetQuantity) * 100;
            return $completedPercentage >= $this->dependency_minimum_percentage;
            
        case 'immediate':
            return in_array($dependency->status, ['in_progress', 'completed']);
            
        default:
            return false;
    }
}

// Check if this is a first step (no dependencies)
public function isFirstStep(): bool
{
    return is_null($this->depends_on_step_id);
}

// Get the next step in the production sequence
public function getNextStep(): ?ManufacturingStep
{
    return $this->manufacturingRoute->steps()
        ->where('depends_on_step_id', $this->id)
        ->first();
}

// Get the previous step in the production sequence
public function getPreviousStep(): ?ManufacturingStep
{
    return $this->dependency;
}

// Check if the next step in sequence can start
public function checkNextStepActivation(): void
{
    $nextStep = $this->getNextStep();
    
    if ($nextStep && $nextStep->status === 'pending' && $nextStep->canStart()) {
        $nextStep->moveToQueued();
    }
}

// Get position in the production sequence
public function getSequencePosition(): int
{
    $position = 1;
    $currentStep = $this;
    
    while ($currentStep->depends_on_step_id) {
        $position++;
        $currentStep = $currentStep->dependency;
    }
    
    return $position;
}
```

### ManufacturingStepExecution.php

```php
// Add quantity tracking to executions
public function reportQuantity(int $completed, int $scrapped = 0): void
{
    $this->increment('quantity_completed', $completed);
    $this->increment('quantity_scrapped', $scrapped);
    
    // Update cumulative quantities on the step
    $this->manufacturingStep->increment('cumulative_quantity_completed', $completed);
    $this->manufacturingStep->increment('cumulative_quantity_scrapped', $scrapped);
    
    // Check if the next step in sequence can now be activated
    $this->manufacturingStep->checkNextStepActivation();
}
```

## Service Implementations

### ManufacturingOrderService.php

```php
// Release order with hierarchical dependency checking
public function releaseOrder(ManufacturingOrder $order): void
{
    if (!$order->canBeReleased()) {
        if ($order->dependency_type !== 'none') {
            throw new \Exception('Child order dependencies not met for release');
        }
        throw new \Exception('Order cannot be released in current status');
    }
    
    DB::transaction(function () use ($order) {
        $order->update([
            'status' => 'released',
            'actual_start_date' => now()
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

// Queue first steps when order can execute
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

// Handle child order completion and propagate to parent
public function handleChildOrderProgress(ManufacturingOrder $childOrder, float $quantityCompleted): void
{
    if (!$childOrder->parent_id) {
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
            'created_by' => auth()->id() ?? $childOrder->created_by
        ]);
        
        // Update parent order progress
        $parentOrder->updateFromChildProgress($childOrder, $quantityCompleted);
        
        // Check if parent should auto-complete
        if ($parentOrder->auto_complete_on_children) {
            $parentOrder->checkAutoCompletion();
        }
    });
}

// Updated completeExecution method with hierarchical flow
public function completeExecution(ManufacturingStepExecution $execution, array $data = []): void
{
    $step = $execution->manufacturingStep;
    
    // Track quantities at execution level
    if (isset($data['quantity_completed'])) {
        $execution->reportQuantity(
            $data['quantity_completed'],
            $data['quantity_scrapped'] ?? 0
        );
        
        // If this is a last step, propagate to parent order
        if (!$step->dependentSteps()->exists()) {
            $order = $step->manufacturingRoute->manufacturingOrder;
            $this->handleChildOrderProgress($order, $data['quantity_completed']);
        }
    }
    
    // Check if step is complete
    if ($this->isStepComplete($step)) {
        $step->complete();
    }
}

// New method for partial quantity reporting
public function reportStepProgress(ManufacturingStep $step, array $data): void
{
    DB::transaction(function () use ($step, $data) {
    // Create a progress report without completing the execution
    $step->increment('cumulative_quantity_completed', $data['quantity_completed']);
    
    if (isset($data['quantity_scrapped'])) {
        $step->increment('cumulative_quantity_scrapped', $data['quantity_scrapped']);
    }
    
    // Update order quantities
    $order = $step->manufacturingRoute->manufacturingOrder;
    $order->increment('quantity_completed', $data['quantity_completed']);
    
    if (isset($data['quantity_scrapped'])) {
        $order->increment('quantity_scrapped', $data['quantity_scrapped']);
    }
    
    // Check if the next step can start
    $step->checkNextStepActivation();
        
        // If this is a last step, propagate to parent order
        if (!$step->dependentSteps()->exists()) {
            $this->handleChildOrderProgress($order, $data['quantity_completed']);
        }
    });
}

// Create initial order dependencies based on BOM
public function createOrderDependencies(ManufacturingOrder $parentOrder): void
{
    foreach ($parentOrder->children as $childOrder) {
        ManufacturingOrderDependency::create([
            'parent_order_id' => $parentOrder->id,
            'child_order_id' => $childOrder->id,
            'dependency_type' => 'required',
            'minimum_percentage' => 100.00 // Default to traditional batch completion
        ]);
    }
    
    // Calculate total required quantity from children
    $totalRequired = $parentOrder->children()
        ->join('bom_items', 'manufacturing_orders.item_id', '=', 'bom_items.item_id')
        ->where('bom_items.bom_version_id', $parentOrder->billOfMaterial->currentVersion->id)
        ->sum(DB::raw('bom_items.quantity * manufacturing_orders.quantity'));
        
    $parentOrder->update(['cumulative_children_quantity_required' => $totalRequired]);
}

// Updated method for creating rework steps without step_number
public function createReworkStep(ManufacturingStep $failedStep): ManufacturingStep
{
    $route = $failedStep->manufacturingRoute;
    
    // Create rework step that depends on the failed step
    return $route->steps()->create([
        'step_type' => 'rework',
        'name' => "Rework for {$failedStep->name}",
        'description' => "Rework step for failed quality check on {$failedStep->name}",
        'work_cell_id' => $failedStep->work_cell_id,
        'setup_time_minutes' => 0,
        'cycle_time_minutes' => $failedStep->cycle_time_minutes * 2, // Estimate
        'depends_on_step_id' => $failedStep->id,
        'dependency_start_condition' => 'completed', // Rework always waits for full completion
        'status' => 'pending',
        'display_order' => $route->steps()->max('display_order') + 10, // For UI ordering
    ]);
}
```

## API Response Structure

### ManufacturingOrderController.php

```php
public function show(ManufacturingOrder $order)
{
    $order->load([
        'manufacturingRoute.steps', 
        'item',
        'children' => function ($query) {
            $query->with(['item', 'manufacturingRoute'])
                  ->withCount('children as child_count');
        },
        'parent.item',
        'childDependencies.childOrder.item'
    ]);
    
    return Inertia::render('production/manufacturing-orders/show', [
        'order' => [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'quantity' => $order->quantity,
            'quantity_completed' => $order->quantity_completed,
            'quantity_scrapped' => $order->quantity_scrapped,
            
            // Hierarchical dependency fields
            'dependency_type' => $order->dependency_type,
            'dependency_minimum_percentage' => $order->dependency_minimum_percentage,
            'dependency_minimum_quantity' => $order->dependency_minimum_quantity,
            'cumulative_children_quantity_completed' => $order->cumulative_children_quantity_completed,
            'cumulative_children_quantity_required' => $order->cumulative_children_quantity_required,
            'can_execute' => $order->canStartExecution(),
            'can_release' => $order->canBeReleased(),
            
            // Work in progress tracking
            'work_in_progress_quantity' => $order->work_in_progress_quantity,
            'detailed_wip' => $order->detailed_work_in_progress,
            'hierarchical_wip' => $order->hierarchical_wip,
            
            // Production flow metrics
            'production_flow' => [
                'entered_production' => $order->first_step_completed_quantity,
                'in_process' => $order->work_in_progress_quantity,
                'completed' => $order->last_step_completed_quantity,
            ],
            
            // Relationships
            'item' => $order->item,
            'parent' => $order->parent ? [
                'id' => $order->parent->id,
                'order_number' => $order->parent->order_number,
                'item' => $order->parent->item
            ] : null,
            
            'children' => $order->children->map(function ($child) {
                return [
                    'id' => $child->id,
                    'order_number' => $child->order_number,
                    'item' => $child->item,
                    'quantity' => $child->quantity,
                    'quantity_completed' => $child->quantity_completed,
                    'completion_percentage' => $child->quantity > 0 
                        ? round(($child->quantity_completed / $child->quantity) * 100, 2) 
                        : 0,
                    'status' => $child->status,
                    'has_route' => $child->has_route,
                    'child_count' => $child->child_count
                ];
            }),
            
            'dependencies' => $order->childDependencies->map(function ($dep) {
                return [
                    'child_order_id' => $dep->child_order_id,
                    'child_order_number' => $dep->childOrder->order_number,
                    'dependency_type' => $dep->dependency_type,
                    'minimum_quantity' => $dep->minimum_quantity,
                    'minimum_percentage' => $dep->minimum_percentage,
                    'quantity_completed' => $dep->quantity_completed,
                    'current_percentage' => $dep->childOrder->quantity > 0
                        ? round(($dep->quantity_completed / $dep->childOrder->quantity) * 100, 2)
                        : 0,
                    'is_satisfied' => $dep->is_satisfied,
                    'satisfied_at' => $dep->satisfied_at
                ];
            })
        ]
    ]);
}

// Index method with hierarchy information
public function index(Request $request)
{
    $query = ManufacturingOrder::with(['item', 'parent', 'children'])
        ->withCount('children')
        ->when($request->get('hierarchy_view'), function ($query) {
            $query->rootOrders(); // Only show root orders in hierarchy view
        });
        
    $orders = $query->paginate(20);
    
    return Inertia::render('production/manufacturing-orders/index', [
        'orders' => ManufacturingOrderResource::collection($orders),
        'filters' => $request->only(['search', 'status', 'hierarchy_view'])
    ]);
}
```

### ManufacturingOrderResource.php

```php
public function toArray($request)
{
    return [
        'id' => $this->id,
        'order_number' => $this->order_number,
        'parent_id' => $this->parent_id,
        'status' => $this->status,
        'quantity' => $this->quantity,
        'quantity_completed' => $this->quantity_completed,
        'quantity_scrapped' => $this->quantity_scrapped,
        'unit_of_measure' => $this->unit_of_measure,
        
        // Progress tracking
        'completion_percentage' => $this->progress_percentage,
        'work_in_progress_quantity' => $this->work_in_progress_quantity,
        'wip_percentage' => $this->quantity > 0 
            ? round(($this->work_in_progress_quantity / $this->quantity) * 100, 2) 
            : 0,
            
        // Hierarchical information
        'dependency_type' => $this->dependency_type,
        'can_execute' => $this->when($this->status === 'released', $this->canStartExecution()),
        'children_count' => $this->whenLoaded('children', $this->children->count()),
        'completed_children_count' => $this->completed_child_orders_count,
        
        // Relationships
        'item' => new ItemResource($this->whenLoaded('item')),
        'parent' => new ManufacturingOrderResource($this->whenLoaded('parent')),
        'children' => ManufacturingOrderResource::collection($this->whenLoaded('children')),
        
        // Timestamps
        'requested_date' => $this->requested_date?->format('Y-m-d'),
        'actual_start_date' => $this->actual_start_date?->format('Y-m-d H:i:s'),
        'actual_end_date' => $this->actual_end_date?->format('Y-m-d H:i:s'),
        'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
    ];
}
```

## Frontend TypeScript Interfaces

### Manufacturing Order Interfaces

```typescript
// Manufacturing order dependency configuration
interface ManufacturingOrderDependency {
    child_order_id: number;
    child_order_number: string;
    dependency_type: 'required' | 'optional';
    minimum_quantity?: number;
    minimum_percentage?: number;
    quantity_completed: number;
    current_percentage: number;
    is_satisfied: boolean;
    satisfied_at?: string;
}

// Hierarchical WIP display
interface HierarchicalWIP {
    order_level: number;
    children_wip: number;
    total_hierarchy_wip: number;
}

// Manufacturing order with hierarchy
interface ManufacturingOrderWithHierarchy {
    id: number;
    order_number: string;
    status: string;
    dependency_type: 'none' | 'all_children_released' | 'children_quantity' | 'children_percentage' | 'progressive';
    dependency_minimum_quantity?: number;
    dependency_minimum_percentage?: number;
    cumulative_children_quantity_completed: number;
    cumulative_children_quantity_required: number;
    can_execute: boolean;
    can_release: boolean;
    hierarchical_wip: HierarchicalWIP;
    parent?: {
        id: number;
        order_number: string;
        item: Item;
    };
    children: ManufacturingOrderChild[];
    dependencies: ManufacturingOrderDependency[];
}

interface ManufacturingOrderChild {
    id: number;
    order_number: string;
    item: Item;
    quantity: number;
    quantity_completed: number;
    completion_percentage: number;
    status: string;
    has_route: boolean;
    child_count: number;
}
```

### Step Progressive Flow Interfaces

```typescript
// WIP display component
interface WIPDisplay {
    totalWIP: number;
    orderQuantity: number;
    completedQuantity: number;
    inProgressPercentage: number;
}

// Step dependency configuration component
interface StepDependencyConfig {
    depends_on_step_id: number | null;
    dependency_start_condition: 'completed' | 'quantity_based' | 'percentage_based' | 'immediate';
    dependency_minimum_quantity?: number;
    dependency_minimum_percentage?: number;
}

// Progress reporting component
interface ProgressReport {
    quantity_completed: number;
    quantity_scrapped?: number;
    enable_dependent_steps: boolean; // Checkbox to trigger dependent step checks
}

// Manufacturing flow between orders
interface ManufacturingOrderFlow {
    source_order_id: number;
    destination_order_id: number;
    quantity_transferred: number;
    transferred_at: string;
    notes?: string;
}
```

### React Component Examples

```typescript
// Order dependency configuration component
const OrderDependencyConfig: React.FC<{order: ManufacturingOrder}> = ({ order }) => {
    const [dependencyType, setDependencyType] = useState(order.dependency_type || 'none');
    const [minimumQuantity, setMinimumQuantity] = useState(order.dependency_minimum_quantity);
    const [minimumPercentage, setMinimumPercentage] = useState(order.dependency_minimum_percentage);
    
    return (
        <div>
            <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No Dependencies</SelectItem>
                    <SelectItem value="all_children_released">All Children Released</SelectItem>
                    <SelectItem value="children_quantity">Quantity Based</SelectItem>
                    <SelectItem value="children_percentage">Percentage Based</SelectItem>
                    <SelectItem value="progressive">Progressive (Mixed)</SelectItem>
                </SelectContent>
            </Select>
            
            {dependencyType === 'children_quantity' && (
                <Input 
                    type="number"
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(Number(e.target.value))}
                    placeholder="Minimum quantity from children"
                />
            )}
            
            {dependencyType === 'children_percentage' && (
                <div className="flex items-center gap-2">
                    <Slider
                        value={[minimumPercentage || 0]}
                        onValueChange={([value]) => setMinimumPercentage(value)}
                        max={100}
                        step={5}
                    />
                    <span>{minimumPercentage}%</span>
                </div>
            )}
        </div>
    );
};
```

## Migration Scripts

### Manufacturing Order Hierarchical Dependencies Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddHierarchicalDependenciesToManufacturingOrders extends Migration
{
    public function up()
    {
        // Add hierarchical dependency fields to manufacturing_orders
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->enum('dependency_type', ['none', 'all_children_released', 'children_quantity', 'children_percentage', 'progressive'])
                  ->default('none')
                  ->after('auto_complete_on_children');
            $table->decimal('dependency_minimum_quantity', 10, 2)->nullable()->after('dependency_type');
            $table->decimal('dependency_minimum_percentage', 5, 2)->nullable()->after('dependency_minimum_quantity');
            $table->boolean('can_release_before_children')->default(false)->after('dependency_minimum_percentage');
            $table->decimal('cumulative_children_quantity_completed', 10, 2)->default(0)->after('can_release_before_children');
            $table->decimal('cumulative_children_quantity_required', 10, 2)->default(0)->after('cumulative_children_quantity_completed');
            
            $table->index('dependency_type');
        });
        
        // Create manufacturing order dependencies table
        Schema::create('manufacturing_order_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('child_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->enum('dependency_type', ['required', 'optional'])->default('required');
            $table->decimal('minimum_quantity', 10, 2)->nullable();
            $table->decimal('minimum_percentage', 5, 2)->nullable();
            $table->decimal('quantity_completed', 10, 2)->default(0);
            $table->boolean('is_satisfied')->default(false);
            $table->timestamp('satisfied_at')->nullable();
            $table->timestamps();
            
            $table->unique(['parent_order_id', 'child_order_id'], 'unique_parent_child');
            $table->index(['parent_order_id', 'is_satisfied']);
        });
        
        // Create order flow tracking table
        Schema::create('manufacturing_order_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('destination_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->decimal('quantity_transferred', 10, 2);
            $table->timestamp('transferred_at');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            
            $table->index(['source_order_id', 'destination_order_id']);
            $table->index('transferred_at');
        });
        
        // Populate dependencies for existing parent-child relationships
        DB::statement("
            INSERT INTO manufacturing_order_dependencies (
                parent_order_id, 
                child_order_id, 
                dependency_type, 
                minimum_percentage,
                created_at,
                updated_at
            )
            SELECT 
                p.id as parent_order_id,
                c.id as child_order_id,
                'required' as dependency_type,
                100.00 as minimum_percentage,
                NOW() as created_at,
                NOW() as updated_at
            FROM manufacturing_orders p
            JOIN manufacturing_orders c ON c.parent_id = p.id
            WHERE p.children_count > 0
        ");
    }
    
    public function down()
    {
        Schema::dropIfExists('manufacturing_order_flows');
        Schema::dropIfExists('manufacturing_order_dependencies');
        
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->dropColumn([
                'dependency_type',
                'dependency_minimum_quantity',
                'dependency_minimum_percentage',
                'can_release_before_children',
                'cumulative_children_quantity_completed',
                'cumulative_children_quantity_required'
            ]);
        });
    }
}
```

### Manufacturing Step Progressive Flow Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddProgressiveFlowToManufacturingSteps extends Migration
{
    public function up()
    {
Schema::table('manufacturing_steps', function (Blueprint $table) {
            // First, add display_order and populate from existing step_number
    $table->integer('display_order')->default(0)->after('manufacturing_route_id');
});

        // Copy step_number values to display_order (multiplied by 10 for future insertions)
        DB::statement("UPDATE manufacturing_steps SET display_order = COALESCE(step_number, 0) * 10");

Schema::table('manufacturing_steps', function (Blueprint $table) {
    // Drop step_number and its unique constraint
    $table->dropUnique(['manufacturing_route_id', 'step_number']);
    $table->dropColumn('step_number');
    
    // Add new dependency fields
            $table->enum('dependency_start_condition', ['completed', 'quantity_based', 'percentage_based', 'immediate'])
          ->default('completed')
          ->after('can_start_when_dependency');
    $table->integer('dependency_minimum_quantity')->nullable()->after('dependency_start_condition');
    $table->decimal('dependency_minimum_percentage', 5, 2)->nullable()->after('dependency_minimum_quantity');
    $table->integer('cumulative_quantity_completed')->default(0)->after('actual_end_time');
    $table->integer('cumulative_quantity_scrapped')->default(0)->after('cumulative_quantity_completed');
    
    // Add index for display ordering
    $table->index(['manufacturing_route_id', 'display_order']);
});
        
        // Update quantity tracking for step executions
        Schema::table('manufacturing_step_executions', function (Blueprint $table) {
            $table->integer('quantity_completed')->default(0)->after('completed_at');
            $table->integer('quantity_scrapped')->default(0)->after('quantity_completed');
        });

// Update existing dependencies based on old step sequence
DB::statement("
    UPDATE manufacturing_steps s1
    JOIN manufacturing_steps s2 ON s1.manufacturing_route_id = s2.manufacturing_route_id 
        AND s2.display_order = (s1.display_order - 10)
    SET s1.depends_on_step_id = s2.id
    WHERE s1.depends_on_step_id IS NULL AND s1.display_order > 10
");

// Set all existing steps to use 'completed' dependency condition
DB::statement("UPDATE manufacturing_steps SET dependency_start_condition = 'completed'");
    }
    
    public function down()
    {
        Schema::table('manufacturing_step_executions', function (Blueprint $table) {
            $table->dropColumn(['quantity_completed', 'quantity_scrapped']);
        });
        
        Schema::table('manufacturing_steps', function (Blueprint $table) {
            // Re-add step_number
            $table->integer('step_number')->after('manufacturing_route_id');
            
            // Restore from display_order
            DB::statement("UPDATE manufacturing_steps SET step_number = display_order / 10");
            
            // Re-add unique constraint
            $table->unique(['manufacturing_route_id', 'step_number']);
            
            // Drop progressive flow fields
            $table->dropColumn([
                'display_order',
                'dependency_start_condition',
                'dependency_minimum_quantity',
                'dependency_minimum_percentage',
                'cumulative_quantity_completed',
                'cumulative_quantity_scrapped'
            ]);
        });
    }
}
```

## Constants and Enumerations

### PHP Constants

```php
// Manufacturing order dependency types
public const ORDER_DEPENDENCY_TYPES = [
    'none' => 'No dependencies - can release/execute independently',
    'all_children_released' => 'All child orders must be released',
    'children_quantity' => 'Child orders must complete specific quantity',
    'children_percentage' => 'Child orders must complete specific percentage',
    'progressive' => 'Mixed dependencies per child order'
];

// Step start conditions for progressive flow
public const STEP_START_CONDITIONS = [
    'completed' => 'Previous step must complete all units',      // Traditional batch processing
    'quantity_based' => 'Start after specific quantity',         // Progressive flow - quantity threshold
    'percentage_based' => 'Start after percentage complete',     // Progressive flow - percentage threshold
    'immediate' => 'Start as soon as previous step begins',      // Maximum progressive flow
];
```

### Configuration Examples

```php
// Order-level dependencies
[
    'dependency_type' => 'children_percentage',
    'dependency_minimum_percentage' => 25.00,
    'can_release_before_children' => true,  // Can release but not execute
]

// Step-level quantity-based dependency
[
    'dependency_start_condition' => 'quantity_based',
    'dependency_minimum_quantity' => 10,
]

// Step-level percentage-based dependency
[
    'dependency_start_condition' => 'percentage_based',
    'dependency_minimum_percentage' => 25.00,
]

// Progressive order with mixed child dependencies
ManufacturingOrderDependency::create([
    'parent_order_id' => $parentOrder->id,
    'child_order_id' => $criticalChild->id,
    'dependency_type' => 'required',
    'minimum_percentage' => 100.00,  // Critical component needs full completion
]);

ManufacturingOrderDependency::create([
    'parent_order_id' => $parentOrder->id,
    'child_order_id' => $nonCriticalChild->id,
    'dependency_type' => 'required',
    'minimum_percentage' => 50.00,   // Non-critical can start assembly at 50%
]);
```

## Audit Log Structure

```php
// Order hierarchy flow audit
[
    'action' => 'material_flow_from_child_to_parent',
    'source_order_id' => 123,
    'destination_order_id' => 100,
    'quantity_transferred' => 25,
    'child_completion_percentage' => 50.0,
    'parent_dependency_satisfied' => true,
    'timestamp' => '2024-01-15 10:30:00'
]

// Step progressive flow activation
[
    'action' => 'next_step_activated_by_progressive_flow',
    'activated_step_id' => 124,
    'previous_step_id' => 123,
    'trigger_condition' => 'quantity_based',
    'trigger_quantity' => 50,
    'trigger_percentage' => 25.5,
    'timestamp' => '2024-01-15 10:30:00'
]

// Parent order execution enabled
[
    'action' => 'parent_order_execution_enabled',
    'order_id' => 100,
    'dependency_type' => 'children_percentage',
    'required_percentage' => 25.00,
    'achieved_percentage' => 26.50,
    'child_orders_ready' => [101, 102, 103],
    'timestamp' => '2024-01-15 10:45:00'
]
```

## Model Relationships

```php
// ManufacturingOrderDependency Model
class ManufacturingOrderDependency extends Model
{
    protected $fillable = [
        'parent_order_id',
        'child_order_id',
        'dependency_type',
        'minimum_quantity',
        'minimum_percentage',
        'quantity_completed',
        'is_satisfied',
        'satisfied_at'
    ];
    
    protected $casts = [
        'minimum_quantity' => 'decimal:2',
        'minimum_percentage' => 'decimal:2',
        'quantity_completed' => 'decimal:2',
        'is_satisfied' => 'boolean',
        'satisfied_at' => 'datetime'
    ];
    
    public function parentOrder()
    {
        return $this->belongsTo(ManufacturingOrder::class, 'parent_order_id');
    }
    
    public function childOrder()
    {
        return $this->belongsTo(ManufacturingOrder::class, 'child_order_id');
    }
    
    public function updateProgress(float $additionalQuantity): void
    {
        $this->increment('quantity_completed', $additionalQuantity);
        
        // Check if dependency is now satisfied
        if ($this->shouldBeSatisfied()) {
            $this->update([
                'is_satisfied' => true,
                'satisfied_at' => now()
            ]);
        }
    }
    
    protected function shouldBeSatisfied(): bool
    {
        if ($this->minimum_quantity) {
            return $this->quantity_completed >= $this->minimum_quantity;
        }
        
        if ($this->minimum_percentage) {
            $childTotal = $this->childOrder->quantity;
            $percentage = ($this->quantity_completed / $childTotal) * 100;
            return $percentage >= $this->minimum_percentage;
        }
        
        return false;
    }
}

// ManufacturingOrderFlow Model
class ManufacturingOrderFlow extends Model
{
    protected $fillable = [
        'source_order_id',
        'destination_order_id',
        'quantity_transferred',
        'transferred_at',
        'notes',
        'created_by'
    ];
    
    protected $casts = [
        'quantity_transferred' => 'decimal:2',
        'transferred_at' => 'datetime'
    ];
    
    public function sourceOrder()
    {
        return $this->belongsTo(ManufacturingOrder::class, 'source_order_id');
    }
    
    public function destinationOrder()
    {
        return $this->belongsTo(ManufacturingOrder::class, 'destination_order_id');
    }
    
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
```
