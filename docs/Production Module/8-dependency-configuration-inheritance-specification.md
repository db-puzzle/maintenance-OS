# Dependency Configuration Inheritance Specification

## Overview
When creating a new Manufacturing Order (MO) that has a Bill of Materials (BOM), the dependency configuration of child MOs should inherit from the parent-most MO. This ensures consistency in production flow control across the entire hierarchy of orders.

## Current State Analysis

### Existing Implementation
1. **ManufacturingOrder Model** (`app/Models/Production/ManufacturingOrder.php`):
   - Has dependency fields: `dependency_type`, `dependency_minimum_quantity`, `dependency_minimum_percentage`, `can_release_before_children`
   - Supports dependency types: `none`, `all_children_released`, `children_quantity`, `children_percentage`, `progressive`
   - Child orders are created via `createChildOrders()` method, which calls `createChildOrdersFromBomItems()` recursively

2. **Order Creation Process**:
   - Parent order is created first with user-specified dependency configurations
   - Child orders are created without inheriting dependency configurations
   - All child orders are created with default values (no dependencies)

3. **UI Components** (`resources/js/components/production/CreateManufacturingOrderDialog.tsx`):
   - Steps 5 & 6 allow configuration of release and production dependencies
   - Currently only applies to the parent order being created

## Proposed Implementation

### 1. Dependency Inheritance Rules

#### Release Dependencies (`can_release_before_children`)
- **Direct Inheritance**: Child MOs should inherit the exact same value as the parent MO
- **Rationale**: If parent can be released before its children, the same logic should apply down the hierarchy

#### Production Start Dependencies (`dependency_type` and related fields)
- **Type Inheritance**: Child MOs inherit the same `dependency_type` as parent
- **Value Adjustment for Quantity-Based Dependencies**:
  - For `children_quantity`: Calculate proportional batch size based on parent-child quantity ratio
  - For `children_percentage`: Direct inheritance (same percentage)
  - For `all_children_released` and `none`: Direct inheritance
  - For `progressive`: Not applicable for auto-generated child orders

### 2. Proportional Quantity Calculation

When parent has `dependency_type = 'children_quantity'`:

```php
// Calculate proportion
$parentTotalQuantity = $parentOrder->quantity;
$childTotalQuantity = $childOrder->quantity;
$parentBatchSize = $parentOrder->dependency_minimum_quantity;

// Calculate proportional batch size
$childBatchSize = round(($childTotalQuantity / $parentTotalQuantity) * $parentBatchSize);

// Ensure minimum of 1
$childOrder->dependency_minimum_quantity = max(1, $childBatchSize);
```

### 3. Implementation Changes

#### A. Model Updates (`app/Models/Production/ManufacturingOrder.php`)

Update the `createChildOrdersFromBomItems` method to accept and propagate dependency configuration:

```php
private function createChildOrdersFromBomItems(
    $bomVersionId, 
    $parentItemId, 
    $parentOrderId, 
    $parentQuantity = 1,
    $dependencyConfig = null // New parameter
): void {
    // ... existing code ...
    
    foreach ($bomItems as $bomItem) {
        // Calculate quantity based on parent quantity
        $orderQuantity = $bomItem->quantity * $this->quantity * $parentQuantity;
        
        // Prepare child order data
        $childOrderData = [
            'order_number' => $this->generateChildOrderNumberForParent($bomItem, $parentOrder),
            'parent_id' => $parentOrderId,
            'item_id' => $bomItem->item_id,
            'quantity' => $orderQuantity,
            'unit_of_measure' => $bomItem->unit_of_measure,
            'status' => 'draft',
            'priority' => $this->priority,
            'requested_date' => $this->requested_date,
            'created_by' => $this->created_by,
        ];
        
        // Apply dependency configuration if provided
        if ($dependencyConfig) {
            $childOrderData['can_release_before_children'] = $dependencyConfig['can_release_before_children'];
            $childOrderData['dependency_type'] = $dependencyConfig['dependency_type'];
            
            // Handle quantity-based dependencies proportionally
            if ($dependencyConfig['dependency_type'] === 'children_quantity' && $dependencyConfig['dependency_minimum_quantity'] > 0) {
                $proportion = $orderQuantity / $this->quantity;
                $childOrderData['dependency_minimum_quantity'] = max(1, round($dependencyConfig['dependency_minimum_quantity'] * $proportion));
            } elseif ($dependencyConfig['dependency_type'] === 'children_percentage') {
                $childOrderData['dependency_minimum_percentage'] = $dependencyConfig['dependency_minimum_percentage'];
            }
        }
        
        // Create manufacturing order for this BOM item
        $childOrder = ManufacturingOrder::create($childOrderData);
        
        // ... rest of existing code ...
    }
}
```

Update the `createChildOrders` method to pass dependency configuration:

```php
public function createChildOrders(): void
{
    if (!$this->bill_of_material_id) {
        return;
    }
    
    $this->load(['billOfMaterial.currentVersion.items']);
    
    DB::transaction(function () {
        // ... existing code ...
        
        // Prepare dependency configuration to propagate
        $dependencyConfig = [
            'can_release_before_children' => $this->can_release_before_children,
            'dependency_type' => $this->dependency_type,
            'dependency_minimum_quantity' => $this->dependency_minimum_quantity,
            'dependency_minimum_percentage' => $this->dependency_minimum_percentage,
        ];
        
        // Create orders for the root item's children only
        $this->createChildOrdersFromBomItems(
            $this->billOfMaterial->currentVersion->id,
            $rootBomItem->id,
            $this->id,
            1,
            $dependencyConfig // Pass dependency configuration
        );
        
        $this->updateChildOrderCounts();
    });
}
```

#### B. UI Updates (`resources/js/components/production/CreateManufacturingOrderDialog.tsx`)

Add informational alerts in Steps 5 and 6 to inform users about inheritance:

```tsx
{/* Step 5: Release Dependencies */}
{currentStep === 5 && data.order_type === 'bom' && (
    <ScrollArea className="h-full">
        <div className="space-y-6 pr-4">
            {/* Add inheritance info alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    A configuração de liberação selecionada será replicada automaticamente 
                    para todas as ordens filhas. Você poderá ajustar individualmente 
                    durante o planejamento, antes da liberação das ordens.
                </AlertDescription>
            </Alert>
            
            {/* ... existing content ... */}
        </div>
    </ScrollArea>
)}

{/* Step 6: Production Dependencies */}
{currentStep === 6 && data.order_type === 'bom' && (
    <ScrollArea className="h-full">
        <div className="space-y-6 pr-4">
            {/* Add inheritance info alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    As dependências de produção selecionadas serão aplicadas a todas as 
                    ordens filhas. Para dependências baseadas em quantidade, os valores 
                    serão ajustados proporcionalmente. Ajustes individuais podem ser 
                    feitos durante o planejamento.
                </AlertDescription>
            </Alert>
            
            {/* ... existing content ... */}
        </div>
    </ScrollArea>
)}
```

### 4. Database Considerations

No database schema changes are required since child orders already have the same dependency fields as parent orders.

### 5. Testing Requirements

1. **Unit Tests**:
   - Test proportional quantity calculation for different parent-child quantity ratios
   - Test inheritance of different dependency types
   - Test edge cases (zero quantities, very small proportions)

2. **Feature Tests**:
   - Create MO with BOM and verify all child orders inherit dependencies
   - Test multi-level BOM hierarchies
   - Test modification of child order dependencies after creation

### 6. User Experience Enhancements

1. **Visual Indicators**: 
   - Show inherited configuration badge on child orders
   - Display "Inherited from parent" tooltip on dependency fields

2. **Planning Phase Adjustments**:
   - Allow users to override inherited configurations during planning
   - Show comparison between inherited and custom values

3. **Bulk Operations**:
   - Provide "Reset to parent configuration" action
   - Allow bulk update of child order dependencies

## Implementation Priority

1. **Phase 1**: Core inheritance logic in model
2. **Phase 2**: UI alerts and information
3. **Phase 3**: Planning phase adjustment capabilities
4. **Phase 4**: Visual enhancements and bulk operations

## Backwards Compatibility

- Existing orders without dependency configuration will continue to work as before
- Migration not required since this only affects new order creation
- Feature can be toggled via configuration if needed

## Configuration Options

Consider adding these options to `config/production.php`:

```php
'manufacturing_orders' => [
    'inherit_dependencies' => env('MO_INHERIT_DEPENDENCIES', true),
    'proportional_quantity_rounding' => env('MO_PROPORTIONAL_ROUNDING', 'round'), // round, ceil, floor
],
```

## Conclusion

This implementation will ensure consistent dependency behavior across the entire manufacturing order hierarchy while maintaining flexibility for adjustments during the planning phase. The proportional quantity calculation ensures that batch-based dependencies scale appropriately with the actual quantities being produced at each level.
