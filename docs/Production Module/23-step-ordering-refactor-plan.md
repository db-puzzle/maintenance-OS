# Manufacturing Step Ordering Refactor Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the manufacturing step ordering system to use a single `step_number` field and deprecate the `display_order` field. The current system has two ordering fields (`step_number` and `display_order`) that are not properly utilized, and the frontend `sequence` field is not mapped to any database field, causing step reordering to be lost on save.

## Current Issues

1. **Two ordering fields**: `step_number` (nullable, "for templates") and `display_order` (default: 0)
2. **Frontend uses `sequence`**: Not mapped to any database field
3. **Reordering doesn't persist**: Drag-and-drop changes are lost on page refresh
4. **Inconsistent usage**: Different parts of the system expect different fields
5. **Model accessor confusion**: `getStepNumberAttribute()` tries to abstract the difference but adds complexity

## Proposed Solution

Use a single `step_number` field for all step ordering (both templates and production routes).

## Refactoring Plan

### Phase 1: Database Migration

Update the existing migration that creates the `manufacturing_steps` table:

```php
// database/migrations/2025_01_10_000011_create_manufacturing_steps_table.php

// In the up() method, update the schema to only use step_number:
Schema::create('manufacturing_steps', function (Blueprint $table) {
    $table->id();
    $table->foreignId('manufacturing_route_id')->constrained('manufacturing_routes')->cascadeOnDelete();
    $table->integer('step_number')->default(1); // Remove nullable(), make it required with default
    // Remove: $table->integer('display_order')->default(0);
    $table->boolean('is_template')->default(false);
    $table->enum('step_type', ['standard', 'quality_check', 'rework'])->default('standard');
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
    
    // ... rest of the fields remain unchanged ...
});
```

Since you'll be running `migrate:fresh`, no data migration is needed.

### Phase 2: Model Updates

#### ManufacturingStep Model

```php
// Remove from fillable array:
// 'display_order',

// Remove the accessor:
// public function getStepNumberAttribute() { ... }

// Remove the is_template check from ordering
```

#### ManufacturingRoute Model

```php
// Update the steps relationship:
public function steps(): HasMany
{
    return $this->hasMany(ManufacturingStep::class)->orderBy('step_number');
}
```

### Phase 3: Controller Updates

#### PlanningController.php

```php
// In saveRoute method, add sequence mapping:
foreach ($validated['steps'] as $index => $stepData) {
    // Map sequence to step_number
    $stepDataToSave['step_number'] = $stepData['sequence'];
    
    // ... existing conversion code ...
    
    $route->steps()->create($stepDataToSave);
}

// Similar update for bulkSaveRoutes method

// In applyTemplate method:
$route->steps()->create([
    // ... existing fields ...
    'step_number' => $step->step_number, // Remove display_order
    // Remove: 'display_order' => $step->display_order,
]);
```

#### ProductionRoutingController.php

```php
// Update the updateSteps method to use sequence properly:
foreach ($validated['steps'] as $index => $stepData) {
    $stepData['step_number'] = $index + 1; // Already doing this correctly
    // Remove any display_order references
}
```

### Phase 4: Frontend Updates

#### Planning Index (resources/js/pages/production/planning/index.tsx)

```typescript
// Update handleRouteStepsChange to map step_number correctly:
const originalSteps: RouteStep[] = (activeMODetails.manufacturing_route?.steps || []).map((step, index) => ({
    id: step.id?.toString() || `existing-${index}`,
    sequence: step.step_number || index + 1, // Use step_number, not index + 1 as fallback
    // ... rest of the fields
}));
```

#### RouteBuilder Component

```typescript
// Update canvasSteps conversion:
const canvasSteps = useMemo(() => steps.map(step => ({
    id: typeof step.id === 'string' && step.id.startsWith('temp-') ? step.id : Number(step.id),
    step_number: step.sequence, // This is already correct
    // ... rest of fields
})) as any[], [steps, workCells, manufacturingOrder.manufacturing_route]);
```

#### RouteBuilderCanvas Component

```typescript
// Update the reorder handler to ensure step_number is preserved:
const updatedSteps = newSteps.map((step, index) => {
    const updatedStep = {
        ...step,
        step_number: index + 1, // This is already correct
        sequence: index + 1, // Add this to ensure consistency
    };
    // ... rest of the logic
});
```

#### MO Viewer (resources/js/pages/production/tracking/mo-viewer.tsx)

```typescript
// Update the route steps mapping:
manufacturing_route: order.manufacturing_route || {
    id: 0,
    name: '',
    steps: order.route_steps?.map((step, index) => ({
        ...step,
        id: step.id,
        manufacturing_route_id: 0,
        step_number: step.step_number, // Use actual step_number
        // Remove: display_order: index + 1,
        // ... rest of fields
    }))
},
```

#### Production Reporting Components

Update any components that reference `display_order` to use `step_number` instead.

### Phase 5: Type Updates

#### production.ts

```typescript
export interface ManufacturingStep {
    id: number;
    manufacturing_route_id: number;
    // Remove: display_order?: number;
    step_number: number; // Make non-optional
    // ... rest of fields
}
```

### Phase 6: Testing

1. **Unit Tests**
   - Test step creation with proper ordering
   - Test step reordering persistence
   - Test template application with correct step numbers

2. **Feature Tests**
   - Test drag-and-drop reordering saves correctly
   - Test that step order persists after page refresh
   - Test bulk operations maintain step order

3. **Manual Testing**
   - Create new routes and verify step numbering
   - Reorder steps and verify persistence
   - Apply templates and verify step order
   - Test with existing production data

### Implementation Order

1. **Step 1**: Update the existing migration file
2. **Step 2**: Update models and remove display_order references
3. **Step 3**: Update controllers to map sequence to step_number
4. **Step 4**: Update frontend components
5. **Step 5**: Update TypeScript types
6. **Step 6**: Run `php artisan migrate:fresh --seed`
7. **Step 7**: Run all tests

### Rollback Plan

Since we're modifying the original migration and using `migrate:fresh`:
1. Keep a backup of the original migration file
2. Have a database backup before running `migrate:fresh`
3. Git commit before making changes for easy revert

### Risk Mitigation

1. **Data Loss**: Create database backup before running `migrate:fresh`
2. **Test Data**: Ensure seeders create proper test data with step numbers
3. **Compatibility**: Test all features that use manufacturing steps
4. **Frontend Cache**: Clear frontend build cache after changes

### Success Criteria

1. ✅ Single `step_number` field used consistently
2. ✅ Step reordering persists after save
3. ✅ No references to `display_order` remain
4. ✅ All tests pass
5. ✅ No production issues after deployment

### Long-term Benefits

1. **Simplicity**: One field for ordering instead of two
2. **Reliability**: Step order always persists
3. **Maintainability**: Less confusion for developers
4. **Performance**: Simpler queries and logic

## Conclusion

This refactor will eliminate the confusion caused by having two ordering fields and ensure that step reordering works correctly throughout the system. The key is to map the frontend `sequence` field to the database `step_number` field consistently across all operations.
