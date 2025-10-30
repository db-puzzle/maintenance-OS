# Step Number Field Removal Implementation Plan

## Overview

This document outlines the comprehensive plan to remove the `step_number` field from the `manufacturing_steps` table and refactor the system to rely solely on `depends_on_step_id` for step sequencing.

## Rationale

- The `step_number` field is redundant since step sequence is already defined by `depends_on_step_id`
- Maintaining both fields creates risk of data inconsistency
- The dependency-based approach is more flexible for future enhancements
- UI can compute display positions dynamically from the dependency chain

## Phase 1: Database Migration Changes

### 1.1 Modify Original Migration
**File**: `database/migrations/2025_01_10_000011_create_manufacturing_steps_table.php`

```php
// Remove line 17:
// $table->integer('step_number')->default(1);

// Remove the composite index that includes step_number (if any)
// Remove any constraints or indexes involving step_number
```

### 1.2 Add Data Integrity Constraints

Instead of enforcing one root step at the database level, add constraints to prevent circular dependencies and ensure uniqueness:

```php
// Prevent duplicate dependencies within a route
$table->unique(['manufacturing_route_id', 'depends_on_step_id'], 'unique_dependency_per_route');

// Note: We cannot enforce "exactly one root step" at DB level because:
// 1. Routes start empty when created
// 2. Steps are added incrementally
// 3. We need to support the step-by-step building process
```

### 1.3 Application-Level Validation

Add validation that only runs when appropriate (e.g., before production, when saving templates):

```php
// In ManufacturingRoute model or service
public function validateForProduction()
{
    $steps = $this->steps;
    
    if ($steps->isEmpty()) {
        throw new ValidationException('Route must have at least one step before starting production');
    }
    
    // Check for exactly one root step
    $rootSteps = $steps->where('depends_on_step_id', null);
    if ($rootSteps->count() === 0) {
        throw new ValidationException('Route must have a starting step (no depends_on_step_id)');
    }
    if ($rootSteps->count() > 1) {
        throw new ValidationException('Route has multiple starting steps - only one is allowed');
    }
    
    // Check for circular dependencies and connectivity
    $visited = collect();
    $current = $rootSteps->first();
    
    while ($current && !$visited->contains('id', $current->id)) {
        $visited->push($current);
        $current = $steps->firstWhere('id', $current->depends_on_step_id);
    }
    
    if ($current) {
        throw new ValidationException('Circular dependency detected in route steps');
    }
    
    // Check all steps are reachable
    if ($visited->count() !== $steps->count()) {
        $unreachable = $steps->diff($visited);
        throw new ValidationException('Some steps are unreachable: ' . $unreachable->pluck('name')->join(', '));
    }
    
    return true;
}

// Lighter validation for saving/editing
public function validateStructure()
{
    $steps = $this->steps;
    
    if ($steps->isEmpty()) {
        return true; // Empty routes are valid during editing
    }
    
    // Only check for obvious issues like circular dependencies
    // Don't enforce "one root" rule during editing
    
    return true;
}
```

### 1.4 Validation Triggers

Define when different levels of validation should run:

```php
// ManufacturingOrderController.php
public function release(ManufacturingOrder $order)
{
    if ($order->has_route) {
        $order->manufacturingRoute->validateForProduction(); // Strict validation
    }
    // ... release logic
}

// RouteTemplateController.php  
public function store(Request $request)
{
    // ... create template
    $template->validateForProduction(); // Templates must be valid
    // ... save
}

// ManufacturingStepController.php
public function update(Request $request, ManufacturingStep $step)
{
    // ... update step
    $step->manufacturingRoute->validateStructure(); // Light validation during editing
    // ... save
}
```

## Phase 2: Backend Changes

### 2.1 Model Updates

**File**: `app/Models/Production/ManufacturingStep.php`

```php
// Remove from $fillable array:
// 'step_number',

// Add computed attribute:
protected $appends = ['display_position'];

public function getDisplayPositionAttribute(): int
{
    if (!$this->depends_on_step_id) {
        return 1;
    }
    
    // Calculate position by traversing the dependency chain
    $position = 1;
    $current = $this;
    $visited = collect([$this->id]); // Prevent infinite loops
    
    while ($current->depends_on_step_id) {
        $position++;
        $current = $current->dependency;
        
        // Safety check for circular dependencies
        if ($visited->contains($current->id)) {
            \Log::error('Circular dependency detected in route steps', [
                'step_id' => $this->id,
                'route_id' => $this->manufacturing_route_id
            ]);
            break;
        }
        $visited->push($current->id);
    }
    
    return $position;
}

// Add helper to get ordered steps for a route
public static function getOrderedStepsForRoute($routeId): Collection
{
    $steps = static::where('manufacturing_route_id', $routeId)->get();
    
    if ($steps->isEmpty()) {
        return collect(); // Return empty collection for routes with no steps
    }
    
    $ordered = collect();
    
    // Find root step
    $current = $steps->firstWhere('depends_on_step_id', null);
    
    while ($current) {
        $ordered->push($current);
        $current = $steps->firstWhere('depends_on_step_id', $current->id);
    }
    
    return $ordered;
}
```

### 2.2 Route Model Updates

**File**: `app/Models/Production/ManufacturingRoute.php`

```php
// Update setupStepDependencies() method - handles empty routes gracefully
public function setupStepDependencies(): void
{
    $steps = $this->steps()->get();
    
    if ($steps->isEmpty()) {
        return; // Nothing to set up for empty routes
    }
    
    // This method is typically called after bulk operations like template application
    // It ensures a clean dependency chain based on the order of steps
    $previousStep = null;
    
    foreach ($steps as $index => $step) {
        if ($index === 0) {
            // First step should have no dependency
            $step->update(['depends_on_step_id' => null]);
        } else {
            // Each subsequent step depends on the previous
            $step->update(['depends_on_step_id' => $previousStep->id]);
        }
        $previousStep = $step;
    }
}

// Update any references to step_number to use the dependency chain instead
```

### 2.3 Service Layer Updates

**File**: `app/Services/Production/RouteTemplateService.php`

```php
// Update template copying to not include step_number
// Remove step_number from any array mappings
```

**File**: `app/Services/Production/RouteTemplateImportService.php`

```php
// Update import logic to build dependencies based on order
// Remove step_number from field mappings
```

### 2.4 Controller Updates

**File**: `app/Http/Controllers/Production/ProductionRoutingController.php`

```php
// Update export methods to compute step numbers on the fly
protected function exportJson($templates)
{
    // ... existing code ...
    'steps' => $template->steps->count() > 0 
        ? ManufacturingStep::getOrderedStepsForRoute($template->id)
            ->map(function ($step, $index) {
                return [
                    'step_number' => $index + 1, // Computed for export
                    'name' => $step->name,
                    // ... rest of fields
                ];
            })
        : [], // Empty array for routes with no steps
}
```

## Phase 3: Frontend Changes

### 3.1 TypeScript Type Updates

**File**: `resources/js/types/production.ts`

```typescript
// Update ManufacturingStep interface:
export interface ManufacturingStep {
    id: number;
    manufacturing_route_id: number;
    // Remove: step_number: number;
    display_position?: number; // Add computed field
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    depends_on_step_id?: number;
    // ... rest of fields
}
```

### 3.2 Utility Functions

Create a new utility file for step sequencing:

**File**: `resources/js/utils/step-sequencer.ts`

```typescript
import { ManufacturingStep } from '@/types/production';

export interface SequencedStep extends ManufacturingStep {
    display_position: number;
}

export function sequenceSteps(steps: ManufacturingStep[]): SequencedStep[] {
    if (!steps || steps.length === 0) {
        return []; // Handle empty routes
    }
    
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const sequenced: SequencedStep[] = [];
    
    // Find root step
    let current = steps.find(s => !s.depends_on_step_id);
    
    // If no root step found (shouldn't happen in valid routes), 
    // treat the first step as root for display purposes
    if (!current && steps.length > 0) {
        current = steps[0];
    }
    
    let position = 1;
    
    while (current) {
        sequenced.push({
            ...current,
            display_position: position++
        });
        current = steps.find(s => s.depends_on_step_id === current!.id);
    }
    
    return sequenced;
}

export function getStepPosition(step: ManufacturingStep, steps: ManufacturingStep[]): number {
    const sequenced = sequenceSteps(steps);
    return sequenced.find(s => s.id === step.id)?.display_position || 0;
}
```

### 3.3 Component Updates

#### 3.3.1 Manufacturing Orders Show Page
**File**: `resources/js/pages/production/manufacturing-orders/show.tsx`

Changes needed:
- No direct step_number references found
- Uses ManufacturingOrderRouteTab component which may need updates

#### 3.3.2 MO Viewer
**File**: `resources/js/pages/production/tracking/mo-viewer.tsx`

Changes needed:
```typescript
// Line 52: Update RouteStep interface
interface RouteStep {
    id: number;
    name: string;
    // Remove: step_number: number;
    display_position?: number; // Add computed field
    // ... rest of fields
}

// Line 88: Check if step_number is used (it is)
// Update to use display_position computed from dependencies

// Line 209: Update isFirstStep check
const isFirstStep = !step.depends_on_step_id;

// Line 231: Update step number display
<span className="text-[10px] text-muted-foreground">#{step.display_position || index + 1}</span>

// Line 692: Update step mapping
steps: (order.route_steps || []).map((step, index) => ({
    id: step.id,
    name: step.name,
    workcell_name: step.work_cell?.name,
    status: mapStepStatus(step.status),
    display_position: step.display_position || index + 1,
    depends_on_step_id: step.depends_on_step_id
}))
```

#### 3.3.3 Routing Index
**File**: `resources/js/pages/production/routing/index.tsx`

Changes needed:
- No direct step_number references in this file
- Uses EntityDataTable which displays route templates

#### 3.3.4 Components Using Steps

**Files to update**:
- `resources/js/components/production/RoutingStepsTableTab.tsx`
- `resources/js/components/production/ManufacturingStepsTable.tsx`
- `resources/js/components/production/RouteBuilderCanvas.tsx`
- `resources/js/components/production/StepCard.tsx`

Common pattern for updates:
```typescript
// Before
{step.step_number}

// After
{step.display_position || steps.findIndex(s => s.id === step.id) + 1}
```

### 3.4 Drag & Drop Updates

**File**: `resources/js/components/production/RouteBuilderCanvas.tsx`

```typescript
// Update handleDrop method to only manage dependencies
const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedStep) return;
    
    const draggedIndex = steps.findIndex(s => s.id === draggedStep.id);
    if (draggedIndex === targetIndex) return;
    
    const newSteps = [...steps];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, draggedStep);
    
    // Reconstruct dependencies based on new order
    const updatedSteps = newSteps.map((step, index) => {
        const updatedStep = { ...step };
        
        if (index === 0) {
            updatedStep.depends_on_step_id = undefined;
        } else {
            updatedStep.depends_on_step_id = newSteps[index - 1].id;
        }
        
        return updatedStep;
    });
    
    onStepReorder(updatedSteps);
};
```

## Phase 4: API Response Updates

### 4.1 Resource Classes

Update Laravel API Resources to include computed display_position:

```php
// ManufacturingStepResource.php
public function toArray($request)
{
    return [
        'id' => $this->id,
        'display_position' => $this->display_position, // Computed attribute
        // ... rest of fields (remove step_number)
    ];
}
```

### 4.2 Inertia Props

Update all Inertia responses to ensure steps are properly sequenced:

```php
// In controllers
return Inertia::render('Production/Orders/Show', [
    'order' => [
        // ... order data
        'manufacturing_route' => $order->manufacturing_route ? [
            // ... route data
            'steps' => $order->manufacturing_route->steps()
                ->with(['workCell', 'dependency'])
                ->get()
                ->map(function ($step) {
                    return array_merge($step->toArray(), [
                        'display_position' => $step->display_position
                    ]);
                })
        ] : null
    ]
]);
```

## Phase 5: Testing & Validation

### 5.1 Unit Tests

Create tests to verify:
1. Step sequencing works correctly
2. Dependency chains are properly maintained
3. Display positions are computed correctly
4. Drag & drop reordering updates dependencies correctly

### 5.2 Feature Tests

Test scenarios:
1. Creating routes with multiple steps
2. Reordering steps via drag & drop
3. Importing/exporting route templates
4. Step execution following dependency order

### 5.3 UI Testing

Verify:
1. Steps display in correct order
2. Drag & drop functionality works
3. Step numbers show correctly in all views
4. No regressions in step execution flow

## Implementation Checklist

- [ ] Database migration updated
- [ ] Model changes implemented
- [ ] Service layer updated
- [ ] Controller export/import logic updated
- [ ] TypeScript types updated
- [ ] Step sequencer utility created
- [ ] MO Viewer component updated
- [ ] Route builder components updated
- [ ] Step table components updated
- [ ] Drag & drop logic updated
- [ ] API responses include display_position
- [ ] All Inertia props updated
- [ ] Unit tests written
- [ ] Feature tests written
- [ ] UI manually tested
- [ ] Documentation updated

## Notes

1. The `display_position` is a computed attribute, not stored in database
2. All step ordering is derived from the dependency chain
3. Export formats can still include `step_number` for compatibility, computed on-the-fly
4. Import logic builds dependencies from the order of steps in the import file
5. **No caching** - Position calculation is fast and caching would complicate editing
6. Routes start empty when Manufacturing Orders are created - all validations must account for this
7. Strict validation (one root, all connected) only applies when:
   - Starting production
   - Saving as a template
   - Exporting routes

## Risks & Mitigation

1. **Performance**: Computing positions repeatedly could be slow
   - Mitigation: Eager load dependencies, optimize queries with `with('dependency')`
   - Note: For typical routes (<100 steps), performance impact is negligible

2. **Data Integrity**: Circular dependencies could break sequencing
   - Mitigation: Add validation on save, safety checks in position calculation
   - Database unique constraint prevents duplicate dependencies

3. **UI Complexity**: Some UI components expect sequential numbers
   - Mitigation: Compute positions at API level, transparent to UI

4. **Import/Export**: External systems may expect step_number
   - Mitigation: Compute on export, derive dependencies on import
