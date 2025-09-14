# Simplified Manufacturing Order Specification

## Executive Summary

This document specifies the simplified manufacturing order (MO) system that removes automatic completion logic and parent-child release dependencies from the MO level. These changes streamline the MO model while moving production flow dependencies to the route step level for more granular control.

## Key Changes

### 1. Removed Features from Manufacturing Orders

The following features will be removed from the Manufacturing Order model:

1. **Auto-complete on children** (`auto_complete_on_children`)
   - MOs will no longer automatically complete when all child orders are finished
   - All MOs must be explicitly marked as completed through manual action or route completion

2. **Release dependencies** (`can_release_before_children`)
   - MOs can be released at any time, regardless of child order status
   - Release timing becomes a business decision rather than a system constraint

3. **Production start dependencies** (moved to route steps)
   - `dependency_type` 
   - `dependency_minimum_quantity`
   - `dependency_minimum_percentage`
   - `cumulative_children_quantity_completed`
   - `cumulative_children_quantity_required`

### 2. Simplified Manufacturing Order Model

#### 2.1 Database Schema Changes

```sql
-- Remove the following columns from manufacturing_orders table:
ALTER TABLE manufacturing_orders 
  DROP COLUMN auto_complete_on_children,
  DROP COLUMN dependency_type,
  DROP COLUMN dependency_minimum_quantity,
  DROP COLUMN dependency_minimum_percentage,
  DROP COLUMN can_release_before_children,
  DROP COLUMN cumulative_children_quantity_completed,
  DROP COLUMN cumulative_children_quantity_required;

-- Remove related indexes
DROP INDEX idx_dependency_type ON manufacturing_orders;
```

#### 2.2 Model Updates

The `ManufacturingOrder` model will be simplified:

```php
// Remove from $fillable array:
- 'auto_complete_on_children'
- 'dependency_type'
- 'dependency_minimum_quantity' 
- 'dependency_minimum_percentage'
- 'can_release_before_children'
- 'cumulative_children_quantity_completed'
- 'cumulative_children_quantity_required'

// Remove from $casts array:
- 'auto_complete_on_children' => 'boolean'
- 'dependency_minimum_quantity' => 'decimal:2'
- 'dependency_minimum_percentage' => 'decimal:2'
- 'can_release_before_children' => 'boolean'
- 'cumulative_children_quantity_completed' => 'decimal:2'
- 'cumulative_children_quantity_required' => 'decimal:2'

// Remove constant:
- ORDER_DEPENDENCY_TYPES
```

### 3. Order Completion Logic

#### 3.1 Manual Completion Only

Manufacturing orders will only be completed through:

1. **Manual Action**: User explicitly marks the order as completed
2. **Route Completion**: When all route steps are completed, the system can prompt for order completion
3. **API/Integration**: External systems can trigger completion

#### 3.2 Parent Order Behavior

- Parent orders are independent of child order completion status
- No automatic state transitions based on child progress
- Parent order completion does not affect child orders

### 4. Order Release Logic

#### 4.1 Unrestricted Release

- Any order can be released at any time when in 'planned' or 'scheduled' status
- No dependency checks on child orders
- Release decision is purely operational

#### 4.2 Release Effects

When an order is released:
1. Status changes to 'released'
2. Associated route steps become eligible for queueing (based on step dependencies)
3. Child orders remain unaffected

### 5. Simplified Order Creation Flow

#### 5.1 UI Changes

The manufacturing order creation dialog will be simplified:

**Remove Step 5**: "Release Dependencies" - No longer needed
**Remove Step 6**: "Production Dependencies" - Moved to route step configuration

**Updated Step Flow**:
1. Item Selection
2. BOM Selection (if applicable)
3. Order Details
4. Route Configuration
5. Create Order

#### 5.2 Data Structure

The order creation data structure removes dependency fields:

```typescript
interface CreateManufacturingOrderData {
  // Core fields remain
  order_type: 'simple' | 'bom';
  item_id: string;
  bill_of_material_id?: string;
  quantity: number;
  unit_of_measure: string;
  priority: number;
  requested_date: string;
  
  // Route configuration remains
  route_creation_mode: 'manual' | 'template' | 'auto';
  route_template_id?: string;
  
  // REMOVED fields:
  // - auto_complete_on_children
  // - dependency_type
  // - dependency_minimum_quantity
  // - dependency_minimum_percentage
  // - can_release_before_children
}
```

### 6. Service Layer Updates

#### 6.1 ManufacturingOrderService

Remove methods and logic related to:
- Checking child completion for auto-complete
- Validating release dependencies
- Tracking cumulative child quantities
- Progressive flow calculations at MO level

#### 6.2 Order State Transitions

Simplified state machine:
- `draft` → `planned` → `scheduled` → `released` → `in_progress` → `completed`
- `on_hold` and `cancelled` can be entered from most states
- No automatic transitions based on child states

### 7. Benefits of Simplification

1. **Reduced Complexity**: Fewer fields and states to manage
2. **Increased Flexibility**: Orders can be managed independently
3. **Clear Responsibilities**: MO handles order management, route steps handle production flow
4. **Better Granularity**: Dependencies at step level provide finer control
5. **Easier Troubleshooting**: Simpler logic means fewer edge cases

### 8. Migration Considerations

#### 8.1 Existing Orders

For existing manufacturing orders:
1. Orders with `auto_complete_on_children = true` will require manual completion going forward
2. Orders with release dependencies will be able to release immediately
3. Production dependencies will need to be recreated at route step level

#### 8.2 Data Migration

```sql
-- Log current dependency settings before removal (for audit trail)
INSERT INTO system_migrations_log (entity_type, entity_id, old_data, migration_type, created_at)
SELECT 
  'manufacturing_order',
  id,
  JSON_OBJECT(
    'auto_complete_on_children', auto_complete_on_children,
    'dependency_type', dependency_type,
    'dependency_minimum_quantity', dependency_minimum_quantity,
    'dependency_minimum_percentage', dependency_minimum_percentage,
    'can_release_before_children', can_release_before_children
  ),
  'mo_simplification',
  NOW()
FROM manufacturing_orders
WHERE dependency_type != 'none' 
   OR auto_complete_on_children = true 
   OR can_release_before_children = false;
```

### 9. API Changes

#### 9.1 Create/Update Endpoints

Remove the following fields from request validation:
- `auto_complete_on_children`
- `dependency_type`
- `dependency_minimum_quantity`
- `dependency_minimum_percentage`
- `can_release_before_children`

#### 9.2 Response Structure

Remove dependency-related fields from API responses.

### 10. Backward Compatibility

To ensure smooth transition:

1. **Grace Period**: Keep fields in database but mark as deprecated
2. **Warning Logs**: Log when deprecated fields are accessed
3. **API Versioning**: New API version without these fields
4. **Migration Tools**: Scripts to help move dependencies to route steps

## Conclusion

This simplification makes manufacturing orders focused solely on order management, while production flow control moves entirely to the route step level. This separation of concerns provides better flexibility and clearer system architecture.
