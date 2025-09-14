# Enhanced Route Steps Specification with Production Dependencies

## Executive Summary

This document specifies the enhanced route step system that incorporates production start dependencies previously managed at the Manufacturing Order level. This change provides more granular control over production flow, allowing each step to define when it can begin based on the progress of child manufacturing orders.

### Key Clarification: Dependencies Apply to Steps, Not Orders

**Manufacturing Orders (MOs)**:
- Have NO start dependencies
- Can be released at any time
- Release is a business decision, not a system constraint
- Parent orders don't wait for child orders

**Manufacturing Steps (within routes)**:
- CAN have child order dependencies
- Individual steps wait for child order completion
- Each step can have different dependency requirements
- Provides granular control over production flow

## Key Enhancements

### 1. New Step-Level Dependencies

Route steps will now support dependencies on child manufacturing orders, enabling progressive flow based on child order completion. This replaces the MO-level dependency system with step-specific controls.

### 2. Enhanced Step Dependency Model

#### 2.1 Dependency Types

Each manufacturing step can have two types of dependencies:

1. **Step Dependencies** (existing): Dependencies on other steps within the same route
2. **Child Order Dependencies** (new): Dependencies on child manufacturing orders

#### 2.2 Database Schema Updates

```sql
-- Add new columns to manufacturing_steps table
ALTER TABLE manufacturing_steps ADD COLUMN child_order_dependency_type 
  ENUM('none', 'all_children_completed', 'children_quantity', 'children_percentage') 
  DEFAULT 'none' AFTER dependency_minimum_percentage;

ALTER TABLE manufacturing_steps ADD COLUMN child_order_minimum_quantity 
  DECIMAL(10, 2) NULL AFTER child_order_dependency_type;

ALTER TABLE manufacturing_steps ADD COLUMN child_order_minimum_percentage 
  DECIMAL(5, 2) NULL AFTER child_order_minimum_quantity;

-- Add indexes for performance
CREATE INDEX idx_child_order_dependency_type ON manufacturing_steps(child_order_dependency_type);
```

### 3. Step Start Logic (Route Steps Only)

**IMPORTANT**: All dependency logic described in this section applies ONLY to **Manufacturing Steps** within routes. Manufacturing Orders themselves have NO start dependencies - they can be released and begin execution at any time based on business decisions.

#### 3.1 Key Concept: Minimum-Based Dependencies for Route Steps

The child order dependency system for **route steps** uses a **minimum-based approach** rather than cumulative totals. This ensures that we have sufficient quantities of ALL required components before a specific step can begin processing:

- **For Quantity Dependencies**: The step checks the MINIMUM quantity completed across all child orders. This guarantees that we have at least that many complete sets of components available for this step.
- **For Percentage Dependencies**: The step checks the MINIMUM completion percentage across all child orders. This ensures all components have reached at least the specified progress level before this step can begin.

**Example**: For a parent order's first manufacturing step that requires 3 different components (A, B, C):
- Component A: 100 units completed
- Component B: 50 units completed  
- Component C: 75 units completed

With a minimum quantity dependency of 40 units configured on the step, the step CAN start because all components have at least 40 units ready (minimum is 50 from Component B).

#### 3.2 Combined Dependency Checking for Steps

A **manufacturing step** can start when BOTH conditions are met:
1. **Step dependencies** are satisfied (dependencies on other steps within the same route)
2. **Child order dependencies** are satisfied (dependencies on child manufacturing orders)

**Note**: The parent Manufacturing Order itself has NO such restrictions and can be released immediately.

#### 3.2 Child Order Dependency Types

**none**: No dependency on child orders (default)
- Step can start regardless of child order status

**all_children_completed**: All child orders must be completed
- Every child order of the parent MO must have status = 'completed'

**children_quantity**: Minimum quantity from child orders required
- Minimum `quantity_completed` across all child orders ≥ `child_order_minimum_quantity`
- This ensures we have at least the specified quantity of EACH child component available

**children_percentage**: Minimum percentage from child orders required  
- Minimum completion percentage across all child orders ≥ `child_order_minimum_percentage`
- Each child order must have completed at least this percentage of its total quantity
- Calculated as: MIN((child.quantity_completed / child.quantity) * 100) ≥ `child_order_minimum_percentage`

### 4. Model Updates

#### 4.1 ManufacturingStep Model

```php
// Add to $fillable array:
'child_order_dependency_type',
'child_order_minimum_quantity',
'child_order_minimum_percentage',

// Add to $casts array:
'child_order_dependency_type' => 'string',
'child_order_minimum_quantity' => 'decimal:2',
'child_order_minimum_percentage' => 'decimal:2',

// Add constant:
const CHILD_ORDER_DEPENDENCY_TYPES = [
    'none' => 'No child order dependencies',
    'all_children_completed' => 'All child orders must be completed',
    'children_quantity' => 'Minimum quantity from child orders',
    'children_percentage' => 'Minimum percentage from child orders',
];
```

#### 4.2 Enhanced canStart() Method

The `canStart()` method will be updated to check both step and child order dependencies:

```php
public function canStart(): bool
{
    // Check step dependencies first (existing logic)
    if (!$this->checkStepDependencies()) {
        return false;
    }
    
    // Then check child order dependencies (new logic)
    if (!$this->checkChildOrderDependencies()) {
        return false;
    }
    
    return true;
}

protected function checkChildOrderDependencies(): bool
{
    // If no child order dependency, can start
    if ($this->child_order_dependency_type === 'none') {
        return true;
    }
    
    $manufacturingOrder = $this->manufacturingRoute->manufacturingOrder;
    
    // Check if MO has child orders
    if ($manufacturingOrder->child_orders_count === 0) {
        return true; // No children to wait for
    }
    
    switch ($this->child_order_dependency_type) {
        case 'all_children_completed':
            return $manufacturingOrder->completed_child_orders_count === 
                   $manufacturingOrder->child_orders_count;
                   
        case 'children_quantity':
            // Check minimum quantity completed across ALL child orders
            $childOrders = $manufacturingOrder->children()
                ->where('status', '!=', 'cancelled')
                ->get();
            
            if ($childOrders->isEmpty()) {
                return true;
            }
            
            // Find the minimum quantity completed among all child orders
            $minQuantityCompleted = $childOrders->min('quantity_completed');
            
            return $minQuantityCompleted >= $this->child_order_minimum_quantity;
                   
        case 'children_percentage':
            // Check minimum percentage completed across ALL child orders
            $childOrders = $manufacturingOrder->children()
                ->where('status', '!=', 'cancelled')
                ->get();
            
            if ($childOrders->isEmpty()) {
                return true;
            }
            
            // Find the minimum completion percentage among all child orders
            $minPercentage = $childOrders->map(function ($child) {
                if ($child->quantity == 0) {
                    return 100; // Consider zero-quantity orders as complete
                }
                return ($child->quantity_completed / $child->quantity) * 100;
            })->min();
            
            return $minPercentage >= $this->child_order_minimum_percentage;
            
        default:
            return true;
    }
}
```

### 5. Automatic Dependency Checking

#### 5.1 Child Order Progress Updates

When a child manufacturing order updates its `quantity_completed`:

1. Find all parent order route steps with child order dependencies
2. Re-evaluate if any pending steps can now be queued
3. Queue steps that meet their dependency requirements

#### 5.2 Observer Implementation

```php
// In ManufacturingOrderObserver
public function updated(ManufacturingOrder $order)
{
    if ($order->isDirty('quantity_completed') && $order->parent_id) {
        $this->checkParentStepDependencies($order);
    }
}

protected function checkParentStepDependencies(ManufacturingOrder $childOrder)
{
    $parentOrder = $childOrder->parent;
    if (!$parentOrder->manufacturingRoute) {
        return;
    }
    
    // Check all pending steps with child order dependencies
    $parentOrder->manufacturingRoute->steps()
        ->where('status', 'pending')
        ->where('child_order_dependency_type', '!=', 'none')
        ->each(function ($step) {
            if ($step->canStart()) {
                $step->moveToQueued();
            }
        });
}
```

### 6. Step Configuration UI

#### 6.1 Route Builder Interface

The route builder will include a new section for configuring child order dependencies:

**Location**: Step Configuration Dialog

**UI Elements**:
1. **Dependency Tab**: Split into "Step Dependencies" and "Child Order Dependencies"
2. **Child Order Dependency Section**:
   - Radio buttons for dependency type selection
   - Conditional input fields based on selected type
   - Visual indicators showing current child order status
   - Preview of when the step will be able to start

#### 6.2 Visual Indicators

```typescript
interface StepChildOrderDependencyConfig {
  type: 'none' | 'all_children_completed' | 'children_quantity' | 'children_percentage';
  minimumQuantity?: number;
  minimumPercentage?: number;
  
  // Display helpers
  currentChildOrdersCompleted: number;
  totalChildOrders: number;
  minQuantityCompleted: number;
  minPercentageCompleted: number;
  childOrdersStatus: Array<{
    orderId: number;
    itemName: string;
    quantityCompleted: number;
    quantityRequired: number;
    percentageCompleted: number;
  }>;
}
```

### 7. Route Visualization Updates

#### 7.1 Enhanced Step Cards

Step cards in the route visualization will show:
- Step dependencies (existing)
- Child order dependencies (new)
- Current progress toward meeting dependencies
- Estimated time until dependencies are met

#### 7.2 Dependency Flow Diagram

A new visualization showing:
- Child orders feeding into parent route steps
- Progress bars for quantity/percentage thresholds
- Which steps are blocked by child order dependencies
- Real-time updates as child orders progress

### 8. First Step Special Handling

For steps identified as "first steps" (no step dependencies):
- These are the primary candidates for child order dependencies
- UI will suggest child order dependencies when configuring first steps
- First steps control when actual production work begins (not when the MO is released)
- Multiple first steps can have different child order dependencies

**Example Scenario**:
- Manufacturing Order is released immediately (no restrictions)
- First Step A: Requires 50% of all child orders complete (starts earlier)
- First Step B: Requires 100% of all child orders complete (starts later)
- This allows partial production flow while ensuring critical steps wait for all components

### 9. Template and Auto-Creation Updates

#### 9.1 Route Templates

Route templates can now include child order dependency configurations:
- Templates can define standard child order dependencies
- When applied, dependencies are set based on the template
- Templates can use percentage-based dependencies for scalability

#### 9.2 Auto-Route Creation

When routes are created automatically from templates:
1. First steps inherit child order dependencies from templates
2. Dependencies are adjusted based on the item category
3. Percentage-based dependencies are preferred for flexibility

### 10. API Updates

#### 10.1 Step Creation/Update

```typescript
interface ManufacturingStepRequest {
  // Existing fields...
  
  // New child order dependency fields
  child_order_dependency_type?: 'none' | 'all_children_completed' | 'children_quantity' | 'children_percentage';
  child_order_minimum_quantity?: number;
  child_order_minimum_percentage?: number;
}
```

#### 10.2 Step Response

Include child order dependency status in responses:

```typescript
interface ManufacturingStepResponse {
  // Existing fields...
  
  // Child order dependencies
  child_order_dependency: {
    type: string;
    minimum_quantity?: number;
    minimum_percentage?: number;
    current_progress: {
      min_quantity_completed: number;
      min_percentage_completed: number;
      can_start: boolean;
      child_orders: Array<{
        order_number: string;
        item_name: string;
        quantity_completed: number;
        quantity_total: number;
        percentage: number;
        is_limiting_factor: boolean;
      }>;
    };
  };
}
```

### 11. Benefits of Step-Level Dependencies

1. **Granular Control**: Each step can have different child order requirements
2. **Flexible Flow**: Some steps can start early while others wait
3. **Optimized Production**: Reduce idle time by starting steps as soon as possible
4. **Clear Visualization**: See exactly which steps are waiting for what
5. **Better Planning**: Understand bottlenecks at the step level

### 12. Migration Strategy

#### 12.1 Data Migration

For existing orders with MO-level dependencies:

```sql
-- Migrate MO dependencies to first steps of routes
UPDATE manufacturing_steps ms
INNER JOIN manufacturing_routes mr ON ms.manufacturing_route_id = mr.id
INNER JOIN manufacturing_orders mo ON mr.manufacturing_order_id = mo.id
SET 
  ms.child_order_dependency_type = 
    CASE 
      WHEN mo.dependency_type = 'all_children_released' THEN 'all_children_completed'
      WHEN mo.dependency_type = 'children_quantity' THEN 'children_quantity'
      WHEN mo.dependency_type = 'children_percentage' THEN 'children_percentage'
      ELSE 'none'
    END,
  ms.child_order_minimum_quantity = mo.dependency_minimum_quantity,
  ms.child_order_minimum_percentage = mo.dependency_minimum_percentage
WHERE ms.depends_on_step_id IS NULL  -- First steps only
  AND mo.dependency_type != 'none';
```

#### 12.2 Backward Compatibility

- Existing steps without child order dependencies continue to work
- Default value of 'none' ensures no breaking changes
- Gradual adoption possible

## Conclusion

Moving production dependencies to the route step level provides significantly more flexibility and control over manufacturing flow. This enhancement enables true progressive flow manufacturing where different production steps can have different requirements for when they can begin processing based on child order completion.
