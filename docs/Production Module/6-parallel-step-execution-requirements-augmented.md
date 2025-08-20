# Manufacturing Order Routing - Progressive Flow Requirements (Augmented)

> **Note**: For all code examples and technical implementation details, please refer to the companion document: [6a-progressive-flow-code-examples.md](./6a-progressive-flow-code-examples.md)

## Executive Summary

This document specifies the requirements for implementing progressive flow manufacturing at two levels:
1. **Step-Level Progressive Flow**: Products can move to the next step in the production sequence before the entire order quantity completes the current step
2. **Order-Level Progressive Flow**: Child manufacturing orders can begin execution before their parent orders are fully completed, respecting the hierarchical dependencies inherent in the Bill of Materials (BOM) structure

Currently, the system enforces a strict batch completion model where a step must process 100% of the order quantity before the next step can begin, and manufacturing orders execute independently without regard to their hierarchical relationships. This enhancement will introduce configurable rules at both levels, enabling continuous flow through the entire production hierarchy.

## Current System Analysis

### 1. Current Behavior

#### 1.1 Step Dependency Model
- **Strict Linear Execution**: Steps must be fully completed (100% of quantity) before dependent steps can start
- **Automatic Dependency Assignment**: Steps are automatically linked to the previous step if no explicit dependency is set
- **Single Dependency Type**: Only supports "completed" as the dependency condition (`can_start_when_dependency = 'completed'`)
- **Status-Based Gating**: The `canStart()` method only checks if the dependency step status equals 'completed'

#### 1.2 Manufacturing Order Hierarchy Model
- **Independent Execution**: Child orders can be released and executed independently of parent order status
- **No Sequential Enforcement**: Components can theoretically be manufactured after their parent assemblies
- **Auto-completion Only**: The only hierarchical interaction is parent orders auto-completing when all children complete
- **Missing Dependency Logic**: No validation that ensures proper build sequence (components before assemblies)

#### 1.3 Current Database Schema
```sql
-- manufacturing_steps table
can_start_when_dependency ENUM('completed', 'in_progress') DEFAULT 'completed'
depends_on_step_id BIGINT NULLABLE

-- manufacturing_orders table
parent_id BIGINT NULLABLE
child_orders_count INT DEFAULT 0
completed_child_orders_count INT DEFAULT 0
auto_complete_on_children BOOLEAN DEFAULT true
```

#### 1.4 Execution Tracking
- **Step-Level Tracking**: Each step tracks its overall status (pending → queued → in_progress → completed)
- **Execution-Level Tracking**: Individual executions track part numbers and total parts, but no quantity completion
- **Order-Level Quantities**: Manufacturing orders track `quantity_completed` and `quantity_scrapped`
- **No Cross-Order Tracking**: No mechanism to track quantities flowing between parent and child orders

### 2. Limitations of Current System

#### 2.1 Step-Level Limitations
1. **Batch Processing Delays**: The entire order quantity must complete a step before any units can proceed to the next step
2. **Idle Time**: Downstream work cells remain idle waiting for the full batch to complete upstream steps
3. **Increased Lead Time**: Total production time is extended due to batch waiting periods between steps
4. **Large WIP Accumulation**: Products accumulate between steps instead of flowing continuously
5. **Reduced Flexibility**: Cannot respond quickly to priority changes or expedite partial quantities

#### 2.2 Order-Level Limitations
1. **No Build Sequence Enforcement**: Child orders (components) can be manufactured after parent orders (assemblies)
2. **Resource Waste**: Assemblies might be started before all required components are available
3. **Inventory Issues**: Components might be produced too early, increasing inventory holding costs
4. **Planning Complexity**: No systematic way to ensure proper material flow through the hierarchy
5. **Missing Dependencies**: Cannot express that a parent order needs X% of child components before starting

## Proposed System Design

### Key Design Decisions

The system will implement progressive flow at two interconnected levels:

1. **Hierarchical Progressive Flow**: Manufacturing orders will respect their BOM hierarchy, with configurable rules defining when parent orders can begin based on child order completion
2. **Step-Level Progressive Flow**: Within each manufacturing order, steps can overlap execution based on quantity or percentage thresholds
3. **Integrated Flow Management**: The two levels work together to enable continuous flow from raw materials through final assembly

Key aspects of this design:
1. **Hierarchical Dependencies**: Child orders must reach certain completion thresholds before parent orders can proceed
2. **Continuous Flow**: Products flow both within orders (between steps) and between orders (child to parent)
3. **Configurable Thresholds**: Each level can define its own progression rules
4. **Material Availability**: Ensures materials are available when needed, reducing both shortages and excess inventory

### 1. Enhanced Dependency Model

#### 1.1 Manufacturing Order Dependencies

The system will introduce order-level dependencies that mirror the BOM hierarchy:

- **Order Release Dependencies**: Parent orders cannot be released until child orders reach a configurable state
- **Order Start Dependencies**: Parent order execution can begin when child orders reach specified completion thresholds
- **Progressive Assembly**: Parent orders can start assembly as soon as minimum component quantities are available
- **Batch-wise Progression**: Support for partial batches flowing from child to parent orders

#### 1.2 New Start Conditions for Progressive Flow

##### 1.2.1 Step-Level Conditions (Existing)
- **Completed**: The previous step must process 100% of the order quantity
- **Quantity-based**: The next step can start after X units completed
- **Percentage-based**: The next step can start after X% completed
- **Immediate**: The next step can start as soon as the previous step begins

##### 1.2.2 Order-Level Conditions (New)
- **All Children Released**: Parent can be released when all child orders are at least released
- **Children Quantity-based**: Parent can start when child orders have completed X units total
- **Children Percentage-based**: Parent can start when child orders have completed X% of their quantities
- **Progressive Release**: Parent can be released immediately but execution depends on child progress
- **Mixed Conditions**: Different rules for different child orders based on criticality

#### 1.3 Database Schema Changes

##### 1.3.1 Manufacturing Orders Table Additions
```sql
-- New columns for manufacturing_orders table
dependency_type ENUM('none', 'all_children_released', 'children_quantity', 'children_percentage', 'progressive') DEFAULT 'none'
dependency_minimum_quantity DECIMAL(10,2) NULLABLE -- For quantity-based dependencies
dependency_minimum_percentage DECIMAL(5,2) NULLABLE -- For percentage-based dependencies (0.01 to 100.00)
can_release_before_children BOOLEAN DEFAULT false -- Allow release but not execution
cumulative_children_quantity_completed DECIMAL(10,2) DEFAULT 0 -- Track total units received from children
cumulative_children_quantity_required DECIMAL(10,2) DEFAULT 0 -- Total units needed from children
```

##### 1.3.2 Manufacturing Order Dependencies Table (New)
```sql
CREATE TABLE manufacturing_order_dependencies (
    id BIGINT PRIMARY KEY,
    parent_order_id BIGINT NOT NULL,
    child_order_id BIGINT NOT NULL,
    dependency_type ENUM('required', 'optional') DEFAULT 'required',
    minimum_quantity DECIMAL(10,2) NULLABLE,
    minimum_percentage DECIMAL(5,2) NULLABLE,
    quantity_completed DECIMAL(10,2) DEFAULT 0,
    is_satisfied BOOLEAN DEFAULT false,
    satisfied_at TIMESTAMP NULLABLE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (parent_order_id) REFERENCES manufacturing_orders(id),
    FOREIGN KEY (child_order_id) REFERENCES manufacturing_orders(id),
    UNIQUE KEY unique_parent_child (parent_order_id, child_order_id)
);
```

##### 1.3.3 Manufacturing Steps Table Changes (Existing + Enhanced)
```sql
-- Remove step_number and add progressive flow fields
ALTER TABLE manufacturing_steps 
    DROP COLUMN step_number,
    ADD COLUMN dependency_start_condition ENUM('completed', 'quantity', 'percentage', 'immediate') DEFAULT 'completed',
    ADD COLUMN dependency_minimum_quantity DECIMAL(10,2) NULLABLE,
    ADD COLUMN dependency_minimum_percentage DECIMAL(5,2) NULLABLE,
    ADD COLUMN display_order INT NOT NULL DEFAULT 0,
    ADD COLUMN cumulative_quantity_completed DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN cumulative_quantity_scrapped DECIMAL(10,2) DEFAULT 0;
```

##### 1.3.4 Order Flow Tracking Table (New)
```sql
CREATE TABLE manufacturing_order_flows (
    id BIGINT PRIMARY KEY,
    source_order_id BIGINT NOT NULL,
    destination_order_id BIGINT NOT NULL,
    quantity_transferred DECIMAL(10,2) NOT NULL,
    transferred_at TIMESTAMP NOT NULL,
    notes TEXT NULLABLE,
    created_by BIGINT NOT NULL,
    
    FOREIGN KEY (source_order_id) REFERENCES manufacturing_orders(id),
    FOREIGN KEY (destination_order_id) REFERENCES manufacturing_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 2. Execution Rules

#### 2.1 Order-Level Progressive Flow Rules

##### 2.1.1 Release Rules
1. **Traditional Mode**: Parent order cannot be released until all child orders are completed (current behavior)
2. **Progressive Release**: Parent order can be released when children reach specified states
3. **Immediate Release**: Parent order can be released immediately, but execution waits for children

##### 2.1.2 Execution Start Rules
1. **Quantity-Based Start**: Parent order steps can begin when cumulative child quantity reaches threshold
2. **Percentage-Based Start**: Parent order steps can begin when children complete required percentage
3. **Mixed Dependencies**: Critical components might require 100%, while others allow partial completion

##### 2.1.3 Material Flow Rules
1. **Automatic Transfer**: Completed child order quantities automatically "flow" to parent order
2. **Pull System**: Parent orders "pull" completed quantities from child orders as needed
3. **Buffer Management**: Configurable buffers between child completion and parent consumption

#### 2.2 Step-Level Progressive Flow Rules (Enhanced)

##### 2.2.1 Quantity-Based Start Conditions
- Steps can begin when previous step completes X units
- Steps can begin when child orders deliver X units (for first steps)
- Automatic queuing when thresholds are met

##### 2.2.2 Percentage-Based Start Conditions
- Steps can begin when previous step completes X% of quantity
- First steps can begin when X% of child order quantity is available
- Dynamic calculation based on order quantity changes

##### 2.2.3 Integration with Order Dependencies
- First step of parent order checks child order completion
- Subsequent steps follow normal step-level dependencies
- Quality gates can enforce 100% completion at critical points

### 3. Implementation Requirements

#### 3.1 Model Updates

##### 3.1.1 ManufacturingOrder Model Enhancements

```php
class ManufacturingOrder extends Model
{
    // New methods for hierarchical progressive flow
    
    /**
     * Check if this order can be released based on child order status
     */
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
        
        return true;
    }
    
    /**
     * Check if this order can start execution based on child completion
     */
    public function canStartExecution(): bool
    {
        if ($this->dependency_type === 'none') {
            return true;
        }
        
        switch ($this->dependency_type) {
            case 'all_children_released':
                return $this->children()->whereNotIn('status', ['released', 'in_progress', 'completed'])->count() === 0;
                
            case 'children_quantity':
                return $this->cumulative_children_quantity_completed >= $this->dependency_minimum_quantity;
                
            case 'children_percentage':
                $requiredQuantity = ($this->cumulative_children_quantity_required * $this->dependency_minimum_percentage) / 100;
                return $this->cumulative_children_quantity_completed >= $requiredQuantity;
                
            case 'progressive':
                return $this->checkProgressiveDependencies();
        }
        
        return false;
    }
    
    /**
     * Update cumulative quantities from child orders
     */
    public function updateFromChildProgress(ManufacturingOrder $childOrder, float $quantityCompleted): void
    {
        // Update cumulative tracking
        $this->increment('cumulative_children_quantity_completed', $quantityCompleted);
        
        // Check if execution can now start
        if ($this->status === 'released' && $this->canStartExecution()) {
            $this->notifyExecutionReady();
        }
        
        // Update specific dependency tracking
        $dependency = ManufacturingOrderDependency::where('parent_order_id', $this->id)
            ->where('child_order_id', $childOrder->id)
            ->first();
            
        if ($dependency) {
            $dependency->updateProgress($quantityCompleted);
        }
    }
    
    /**
     * Calculate total work in progress across order hierarchy
     */
    public function getHierarchicalWIP(): array
    {
        $wip = [
            'order_level' => $this->quantity_completed - $this->getCompletedShipments(),
            'children_wip' => 0,
            'total_hierarchy_wip' => 0
        ];
        
        foreach ($this->children as $child) {
            $childWip = $child->getHierarchicalWIP();
            $wip['children_wip'] += $childWip['total_hierarchy_wip'];
        }
        
        $wip['total_hierarchy_wip'] = $wip['order_level'] + $wip['children_wip'];
        
        return $wip;
    }
}
```

##### 3.1.2 ManufacturingStep Model Updates

The existing step model enhancements remain, with additional integration:

```php
class ManufacturingStep extends Model
{
    /**
     * Enhanced canStart method that considers order-level dependencies for first steps
     */
    public function canStart(): bool
    {
        // For first steps, check order-level dependencies
        if ($this->isFirstStep()) {
            $order = $this->manufacturingRoute->manufacturingOrder;
            if (!$order->canStartExecution()) {
                return false;
            }
        }
        
        // Existing step-level dependency checks
        if (!$this->depends_on_step_id) {
            return true;
        }
        
        // Progressive flow conditions
        return $this->checkProgressiveStartCondition();
    }
}
```

#### 3.2 Service Updates

##### 3.2.1 ManufacturingOrderService Enhancements

```php
class ManufacturingOrderService
{
    /**
     * Release order with hierarchical dependency checking
     */
    public function releaseOrder(ManufacturingOrder $order): void
    {
        if (!$order->canBeReleased()) {
            if ($order->dependency_type !== 'none') {
                throw new \Exception('Child order dependencies not met for release');
            }
            throw new \Exception('Order cannot be released in current status');
        }
        
        DB::transaction(function () use ($order) {
            $order->update(['status' => 'released']);
            
            // Only queue steps if execution can start
            if ($order->canStartExecution() && $order->manufacturingRoute) {
                $this->queueFirstSteps($order);
            }
        });
    }
    
    /**
     * Handle child order completion and propagate to parent
     */
    public function handleChildOrderProgress(ManufacturingOrder $childOrder, float $quantityCompleted): void
    {
        if (!$childOrder->parent_id) {
            return;
        }
        
        $parentOrder = $childOrder->parent;
        
        // Record the flow
        ManufacturingOrderFlow::create([
            'source_order_id' => $childOrder->id,
            'destination_order_id' => $parentOrder->id,
            'quantity_transferred' => $quantityCompleted,
            'transferred_at' => now(),
            'created_by' => auth()->id()
        ]);
        
        // Update parent order
        $parentOrder->updateFromChildProgress($childOrder, $quantityCompleted);
    }
}
```

### 4. User Interface Requirements

#### 4.1 Order Hierarchy Flow Visualization

**Location**: Manufacturing Order Index / Hierarchy View

1. **Hierarchical Tree View**
   - Visual tree showing parent-child relationships
   - Progress bars for each order showing completion percentage
   - Flow indicators showing material movement between orders
   - Color coding: Gray (not started), Yellow (in progress), Green (completed)

2. **Dependency Status Panel**
   - For each parent order, show child dependency status
   - Visual indicators for which dependencies are met/unmet
   - Quantity thresholds and current progress
   - Estimated time until dependencies are satisfied

3. **Material Flow Diagram**
   - Sankey diagram showing quantity flow from children to parents
   - Real-time animation of materials moving through the hierarchy
   - Bottleneck identification where flow is restricted

#### 4.2 Order Configuration UI

**Location**: Manufacturing Order Create/Edit Forms

1. **Dependency Configuration Section**
   - Dropdown to select dependency type
   - Dynamic fields for quantity/percentage thresholds
   - Child order dependency grid with individual thresholds
   - Visual preview of the dependency rules

2. **Release Strategy Options**
   - Radio buttons for release timing strategy
   - Warning messages for potential issues
   - Simulation of material flow based on settings

#### 4.3 Production Dashboard Enhancements

**Location**: Production Dashboard / Overview

1. **Hierarchical WIP Display**
   - Total WIP across entire order hierarchy
   - Drill-down capability to see WIP at each level
   - Heat map showing where inventory accumulates

2. **Flow Efficiency Metrics**
   - Cross-order lead time measurements
   - Material velocity through the hierarchy
   - Idle time analysis for parent orders waiting for children

#### 4.4 Execution Interface Updates

**Location**: Manufacturing Order Execution Screen

1. **Material Availability Indicator**
   - Real-time display of available child order quantities
   - Warnings when approaching material shortages
   - Projected availability based on child order progress

2. **Progressive Start Controls**
   - Enable/disable progressive execution
   - Override controls for urgent orders
   - Visual timeline showing when steps can start

### 5. Business Logic Rules

#### 5.1 Hierarchical Validation Rules

1. **Dependency Configuration**
   - Cannot create circular dependencies in order hierarchy
   - Child orders cannot depend on their descendants
   - Root orders (no BOM) cannot have child dependencies

2. **Threshold Validation**
   - Quantity thresholds cannot exceed child order quantities
   - Percentage thresholds must be between 0.01 and 100.00
   - Mixed dependencies must be logically consistent

3. **State Consistency**
   - Parent orders cannot complete before all required child quantities are received
   - Cancelled child orders must trigger parent order notifications
   - On-hold child orders pause dependent parent execution

#### 5.2 Progressive Flow Rules

1. **Material Conservation**
   - Sum of child quantities flowing to parent cannot exceed child production
   - Scrapped quantities in children reduce available parent materials
   - Quality rejections in children impact parent availability

2. **Automatic Progression**
   - System automatically checks parent dependencies when child quantities update
   - First steps of parent orders auto-queue when dependencies are met
   - Notifications sent when parent orders become executable

### 6. API Response Structure

#### 6.1 Enhanced Manufacturing Order Response

```json
{
    "id": 1,
    "order_number": "MO-24001-001",
    "status": "released",
    "quantity": 100,
    "quantity_completed": 0,
    
    // New hierarchical flow fields
    "dependency_type": "children_percentage",
    "dependency_minimum_percentage": 25.00,
    "cumulative_children_quantity_completed": 15.00,
    "cumulative_children_quantity_required": 100.00,
    "can_execute": false,
    
    // Enhanced relationships
    "children": [
        {
            "id": 2,
            "order_number": "MO-24001-001.1",
            "quantity": 50,
            "quantity_completed": 15,
            "completion_percentage": 30.00,
            "dependency_satisfied": true
        }
    ],
    
    "dependencies": [
        {
            "child_order_id": 2,
            "dependency_type": "required",
            "minimum_percentage": 25.00,
            "current_percentage": 30.00,
            "is_satisfied": true
        }
    ],
    
    // Hierarchical WIP
    "hierarchical_wip": {
        "order_level": 0,
        "children_wip": 15,
        "total_hierarchy_wip": 15
    }
}
```

### 7. Reporting and Analytics

#### 7.1 New Hierarchical Metrics

1. **Cross-Order Flow Metrics**
   - Average time from child completion to parent consumption
   - Material velocity through BOM levels
   - Hierarchy depth impact on total lead time

2. **Dependency Performance**
   - Frequency of parent orders waiting for children
   - Optimal vs actual dependency thresholds
   - Cost of early/late child order completion

3. **Inventory Analysis**
   - WIP distribution across hierarchy levels
   - Inventory holding cost by BOM level
   - Just-in-time performance metrics

### 8. Migration Strategy

#### 8.1 Phased Implementation

**Phase 1: Database Infrastructure**
1. Add new tables and columns
2. Populate dependency data from existing BOMs
3. Set all existing orders to 'none' dependency type

**Phase 2: Core Logic**
1. Implement model methods for dependency checking
2. Add service layer progressive flow handling
3. Update order release/execution logic

**Phase 3: User Interface**
1. Add dependency configuration UI
2. Implement hierarchy visualization
3. Create flow monitoring dashboards

**Phase 4: Integration**
1. Connect order and step progressive flow
2. Implement automatic progression rules
3. Add comprehensive notifications

#### 8.2 Backward Compatibility

1. **Default Behavior**: Existing orders continue with no hierarchical dependencies
2. **Opt-in Configuration**: Users must explicitly enable progressive flow
3. **Gradual Adoption**: Can be enabled per order or per product family

### 9. Testing Requirements

#### 9.1 Unit Tests

1. Test hierarchical dependency calculations
2. Test circular dependency prevention
3. Test material flow conservation
4. Test progressive start conditions

#### 9.2 Integration Tests

1. Test full hierarchy execution flow
2. Test mixed dependency scenarios
3. Test error conditions and rollbacks
4. Test concurrent updates to related orders

#### 9.3 Performance Tests

1. Test with deep BOM hierarchies (10+ levels)
2. Test with wide hierarchies (100+ children)
3. Test real-time updates with multiple operators
4. Test dependency checking at scale

### 10. Security Considerations

1. **Authorization**: Verify permissions for cross-order operations
2. **Data Integrity**: Ensure atomic updates across related orders
3. **Concurrency**: Handle race conditions in material flow
4. **Audit Trail**: Comprehensive logging of all hierarchical operations

## Implementation Timeline

### Phase 1: Order-Level Infrastructure (Week 1-2)
- Database schema updates for order dependencies
- Basic model methods for hierarchy checking
- Migration scripts and data population

### Phase 2: Order Progressive Flow (Week 3-4)
- Service layer enhancements
- Order release and execution logic
- Material flow tracking

### Phase 3: Integration (Week 5-6)
- Connect order and step progressive flow
- Automatic progression implementation
- Comprehensive testing

### Phase 4: User Interface (Week 7-8)
- Hierarchy visualization
- Configuration interfaces
- Monitoring dashboards

### Phase 5: Deployment (Week 9)
- Production deployment
- User training on hierarchical flow
- Documentation updates

## Success Metrics

1. **Build Sequence Compliance**: 95%+ orders follow proper parent-child sequence
2. **Material Availability**: 90%+ reduction in parent orders waiting for materials
3. **Lead Time Reduction**: 30-40% reduction in total hierarchical lead time
4. **Inventory Optimization**: 25-35% reduction in inter-order WIP
5. **First-Time-Right**: 98%+ orders complete without material shortages
