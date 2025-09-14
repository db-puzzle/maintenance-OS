# Route Template Update Plan

## Executive Summary

This document outlines the plan to simplify and improve the route template application system by:
1. Removing unnecessary soft references to templates
2. Consolidating duplicate controller methods
3. Restricting template application to Draft status MOs only
4. Ensuring MO routes are updated (not recreated) when templates are applied

## Current Issues

1. **Redundant Soft References**: The `template_source_id` field and `templateSource()` relationship create unnecessary complexity without providing value
2. **Duplicate Controllers**: Both `ManufacturingOrderController` and `PlanningController` have `applyTemplate()` methods
3. **Inconsistent Behavior**: Some code deletes and recreates routes, while other code updates existing routes
4. **Status Validation**: Templates can currently be applied to planned/scheduled orders, creating edge cases

## Proposed Changes

### 1. Database Schema Updates

#### Remove Soft References
- **Remove** `template_source_id` column from `manufacturing_routes` table
- **Remove** `created_from_route_id` column (another unused soft reference)
- **Remove** `route_template_id` column (deprecated field)
- **Keep** `is_template` flag to distinguish templates from production routes

#### Migration
```sql
ALTER TABLE manufacturing_routes DROP COLUMN template_source_id;
ALTER TABLE manufacturing_routes DROP COLUMN created_from_route_id;
ALTER TABLE manufacturing_routes DROP COLUMN route_template_id;
```

### 2. Model Updates

#### ManufacturingRoute Model
**Remove:**
- `templateSource()` relationship method
- `derivedRoutes()` relationship method  
- `createdFromRoute()` relationship method
- `templatesCreatedFromThis()` relationship method
- `routeTemplate()` relationship method (deprecated)
- References to `template_source_id` in fillable array
- References to `route_template_id` in fillable array

**Keep:**
- `is_template` property and related scopes
- `createFromTemplate()` method (core functionality)

### 3. Controller Consolidation

#### Remove Duplicate Methods
- **Delete** `PlanningController::applyTemplate()` method
- **Move** `PlanningController::bulkApplyTemplate()` to `ManufacturingOrderController`
- **Keep** `ManufacturingOrderController::applyTemplate()` as the single source of truth
- **Add** `ManufacturingOrderController::bulkApplyTemplate()` for bulk operations

#### Update Routes
- Remove `/planning/orders/{order}/apply-template` route
- Remove `/planning/orders/bulk-apply-template` route  
- Keep `/production/orders/{order}/apply-template` route
- Update any bulk operations to use the production routes

#### Bulk Operations
- **Keep** bulk template application functionality
- **Restrict** to Draft MOs only
- **Move** to ManufacturingOrderController (remove from PlanningController)
- **Route**: `/production/orders/bulk-apply-template`
- Skip non-Draft orders with appropriate messaging in the response

### 4. Service Layer Refactoring

#### ManufacturingOrderService
Add new methods:
```php
public function applyTemplate(ManufacturingOrder $order, int $templateId): void
{
    // 1. Validate order is in Draft status
    if ($order->status !== 'draft') {
        throw new ValidationException('Templates can only be applied to orders in Draft status');
    }
    
    // 2. Load template
    $template = ManufacturingRoute::templates()
        ->findOrFail($templateId);
    
    // 3. Update existing route
    DB::transaction(function () use ($order, $template) {
        $route = $order->manufacturingRoute;
        
        // Delete existing steps
        $route->steps()->delete();
        
        // Update route information
        $route->update([
            'name' => $template->name,
            'description' => $template->description,
        ]);
        
        // Copy steps from template
        $route->createFromTemplate($template);
    });
}

public function bulkApplyTemplate(array $orderIds, int $templateId): array
{
    $results = [
        'success' => 0,
        'skipped' => 0,
        'errors' => []
    ];
    
    $template = ManufacturingRoute::templates()->findOrFail($templateId);
    
    foreach ($orderIds as $orderId) {
        try {
            $order = ManufacturingOrder::findOrFail($orderId);
            
            if ($order->status !== 'draft') {
                $results['skipped']++;
                $results['errors'][] = "Order {$order->order_number} skipped - not in Draft status";
                continue;
            }
            
            $this->applyTemplate($order, $templateId);
            $results['success']++;
            
        } catch (\Exception $e) {
            $results['errors'][] = "Order ID {$orderId}: {$e->getMessage()}";
        }
    }
    
    return $results;
}
```

#### RouteBuilderService
- **Remove** `applyTemplateToOrder()` method entirely
- This functionality moves to `ManufacturingOrderService`

### 5. Business Logic Updates

#### Template Application Rules
1. **Status Restriction**: Templates can ONLY be applied to Draft MOs
2. **Route Updates**: Always update the existing route (never delete/recreate)
3. **Step Replacement**: Delete all existing steps before copying from template
4. **No History Tracking**: Remove all soft references to source templates
5. **No Overwrite Confirmation**: Since Draft MOs have no meaningful steps, remove the `overwrite` parameter

#### Validation Messages
- "Templates can only be applied to manufacturing orders in Draft status"
- "This order already has active or completed steps and cannot have a template applied"

#### Manufacturing Order Creation
- Acknowledge that MOs are always created with an empty route
- Template application is simply updating this existing empty route

### 6. UI Updates

#### Frontend Changes
1. **Disable** template application buttons/options for non-Draft MOs
2. **Remove** any UI that shows "source template" information
3. **Update** error messages to reflect Draft-only restriction
4. **Simplify** the apply template dialog (remove overwrite confirmation for Draft MOs)
5. **Update** specific components:
   - `ApplyTemplateDialog.tsx` - Remove overwrite logic, add Draft validation
   - `RouteBuilder.tsx` - Remove any template source displays
   - `ManufacturingOrderHierarchicalView.tsx` - Update template application options

### 7. Implementation Phases

#### Phase 1: Backend Preparation (Week 1)
1. Create new migration to drop soft reference columns
2. Update ManufacturingRoute model
3. Create new service method in ManufacturingOrderService
4. Update ManufacturingOrderController::applyTemplate()

#### Phase 2: Controller Consolidation (Week 1)
1. Remove duplicate methods from PlanningController
2. Update route definitions
3. Remove RouteBuilderService::applyTemplateToOrder()

#### Phase 3: Frontend Updates (Week 2)
1. Update all API calls to use single endpoint
2. Add Draft status validation in UI
3. Remove template source displays
4. Update error handling

#### Phase 4: Testing & Cleanup (Week 2)
1. Update all tests to reflect new behavior
2. Test template application thoroughly
3. Remove any remaining references to soft relationships

## Benefits

1. **Simpler Code**: Removing unnecessary relationships reduces complexity
2. **Clearer Logic**: One way to apply templates, one controller method
3. **Better Data Integrity**: Draft-only restriction prevents edge cases
4. **Improved Performance**: No need to track or query soft references
5. **Easier Maintenance**: Less code to maintain and debug

## Migration Considerations

1. **Data Loss**: The `template_source_id` data will be lost, but this is acceptable as it provides no business value
2. **Backward Compatibility**: Ensure all frontend code is updated before deploying
3. **Testing**: Comprehensive testing needed for template application flow

## Success Criteria

1. Templates can only be applied to Draft MOs
2. Single endpoint for template application (both single and bulk)
3. No soft references to templates in the database
4. Existing route is always updated (never recreated)
5. Bulk operations skip non-Draft MOs with clear messaging
6. All tests pass with new implementation
