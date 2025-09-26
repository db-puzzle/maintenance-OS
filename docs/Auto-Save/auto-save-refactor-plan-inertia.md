# Auto-Save Architecture Refactoring Plan - Inertia.js Approach

## Current Problems (Confirmed)

1. **Focus Loss During Save**: Backend response causes re-renders, losing input focus
2. **Lost User Changes**: Changes made during save request are overwritten
3. **Lack of Optimistic Updates**: System waits for backend confirmation
4. **Simple Debouncing is Insufficient**: Current 1.5s debounce doesn't handle complex scenarios

## Proposed Solution: Inertia.js Native Auto-Save Pattern

### Core Principles

1. **Hybrid Request Approach**
   - Use regular AJAX/fetch for auto-save requests (NOT Inertia requests)
   - Return JSON responses for auto-saves (NOT Inertia responses)
   - This prevents page updates and focus loss
   - Manual saves can still use normal Inertia flow

2. **Form State Management with useForm**
   - Single source of truth for form data
   - Built-in error handling
   - Optimistic updates via `setData`
   - Automatic state preservation

3. **Smart Background Saves**
   - Queue saves using Inertia's request system
   - Handle concurrent edits properly
   - Maintain UI responsiveness

## Implementation Architecture

### Key Design Decisions

1. **Pure Eloquent Over DB Facade**
   - Uses `$model->getConnection()->transaction()` instead of `DB::transaction()`
   - Better testability and consistency
   - Respects model's connection configuration
   - Future-proof against connection changes

2. **Hybrid Request Strategy**
   - Auto-saves use regular AJAX to avoid Inertia page updates
   - Manual saves use normal Inertia flow
   - Backend differentiates via `is_autosave` flag

### 1. Enhanced useForm Implementation

```typescript
// Custom hook for auto-save forms
import { useForm, router } from '@inertiajs/react';
import { useRef, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  endpoint: string;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (errors: any) => void;
}

export function useAutoSaveForm<T extends Record<string, any>>(
  initialData: T,
  options: AutoSaveOptions
) {
  const form = useForm<T>(initialData);
  const saveInProgressRef = useRef(false);
  const pendingChangesRef = useRef<Partial<T>>({});
  const lastSavedDataRef = useRef<T>(initialData);

  // Track field focus state
  const focusedFieldRef = useRef<{
    name: string;
    cursorPosition: number;
    element: HTMLElement | null;
  } | null>(null);

  // Capture focus information
  const captureFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLInputElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const fieldName = activeElement.getAttribute('name');
      if (fieldName) {
        focusedFieldRef.current = {
          name: fieldName,
          cursorPosition: activeElement.selectionStart || 0,
          element: activeElement,
        };
      }
    }
  }, []);

  // Restore focus after save
  const restoreFocus = useCallback(() => {
    if (focusedFieldRef.current) {
      const { name, cursorPosition, element } = focusedFieldRef.current;
      // Try to find the element by name if the reference is stale
      const targetElement = element || document.querySelector(`[name="${name}"]`) as HTMLInputElement;
      
      if (targetElement && document.contains(targetElement)) {
        targetElement.focus();
        if (targetElement.setSelectionRange) {
          targetElement.setSelectionRange(cursorPosition, cursorPosition);
        }
      }
    }
  }, []);

  // Save function that preserves state
  const performSave = useCallback(async () => {
    if (saveInProgressRef.current) {
      // Queue changes made during save
      Object.assign(pendingChangesRef.current, form.data);
      return;
    }

    captureFocus();
    saveInProgressRef.current = true;
    options.onSaveStart?.();

    // Get current form data
    const dataToSave = { 
      ...form.data,
      is_autosave: true // Flag for backend
    };

    try {
      // CRITICAL: Use fetch for auto-save to avoid Inertia page updates
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errors = await response.json();
        throw errors;
      }

      const result = await response.json();
      
      // Handle ID mapping for newly created items
      if (result.id_mapping && options.onIdMapping) {
        options.onIdMapping(result.id_mapping);
      }

      lastSavedDataRef.current = dataToSave;
      options.onSaveSuccess?.(result);

      // Apply any pending changes that occurred during save
      if (Object.keys(pendingChangesRef.current).length > 0) {
        Object.entries(pendingChangesRef.current).forEach(([key, value]) => {
          form.setData(key as keyof T, value);
        });
        pendingChangesRef.current = {};
        
        // Trigger another save for pending changes
        debouncedSave();
      }

      restoreFocus();
      saveInProgressRef.current = false;
    } catch (error) {
      saveInProgressRef.current = false;
      options.onSaveError?.(error);
      restoreFocus();
    }
  }, [form.data, options]);

  // Debounced save
  const debouncedSave = useRef(
    debounce(performSave, options.debounceMs || 1000)
  ).current;

  // Enhanced setData that triggers auto-save
  const setData = useCallback((key: keyof T, value: any) => {
    form.setData(key, value);
    
    // If save is in progress, track this change
    if (saveInProgressRef.current) {
      pendingChangesRef.current[key] = value;
    }
    
    debouncedSave();
  }, [form, debouncedSave]);

  // Check if data has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(form.data) !== JSON.stringify(lastSavedDataRef.current);
  }, [form.data]);

  return {
    ...form,
    setData, // Override with auto-save version
    hasUnsavedChanges,
    isSaving: saveInProgressRef.current,
  };
}
```

### 2. RouteBuilder Integration

```typescript
// Updated RouteBuilder component
import { useAutoSaveForm } from '@/hooks/useAutoSaveForm';
import { router } from '@inertiajs/react';

export default function RouteBuilder({ manufacturingOrder, ... }) {
  // Initialize form with route steps data
  const routeForm = useAutoSaveForm({
    steps: manufacturingOrder.manufacturing_route?.steps || [],
  }, {
    endpoint: route('production.planning.orders.save-route', manufacturingOrder.id),
    debounceMs: 1000,
    onSaveStart: () => onSaveStatusChange?.('saving'),
    onSaveSuccess: () => {
      onSaveStatusChange?.('saved');
      onLastSavedAtChange?.(new Date());
    },
    onSaveError: () => onSaveStatusChange?.('error'),
  });

  // Handle step updates with proper focus preservation
  const updateStep = useCallback((stepId: string | number, field: string, value: any) => {
    const updatedSteps = routeForm.data.steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    );
    
    // This will trigger auto-save automatically
    routeForm.setData('steps', updatedSteps);
  }, [routeForm]);

  // Add new step
  const addStep = useCallback(() => {
    const newStep = {
      id: `temp-${Date.now()}`,
      sequence: routeForm.data.steps.length + 1,
      name: `Step ${routeForm.data.steps.length + 1}`,
      // ... other fields
    };
    
    routeForm.setData('steps', [...routeForm.data.steps, newStep]);
  }, [routeForm]);

  // Form inputs with stable references
  return (
    <div>
      {routeForm.data.steps.map((step, index) => (
        <StepCard 
          key={step.id} // Use stable IDs
          step={step}
          onUpdate={(field, value) => updateStep(step.id, field, value)}
        />
      ))}
    </div>
  );
}
```

### 3. Backend Controller Updates (Pure Eloquent)

```php
// app/Http/Controllers/Production/ManufacturingOrderController.php

public function saveRoute(Request $request, ManufacturingOrder $order)
{
    // CRITICAL: Check if this is an auto-save request
    $isAutoSave = $request->boolean('is_autosave', false);
    
    // Validate request
    $validated = $request->validate([
        'steps' => 'required|array',
        'steps.*.sequence' => 'required|integer',
        'steps.*.name' => 'required|string',
        // ... other validations
    ]);

    $idMapping = []; // Map temp IDs to real IDs

    // Use Eloquent model's connection for transaction
    $order->getConnection()->transaction(function () use ($order, $validated, &$idMapping) {
        // Get or create the manufacturing route
        $route = $order->manufacturingRoute;
        if (!$route) {
            $route = $order->manufacturingRoute()->create([
                'name' => $order->name . ' Route',
                'is_active' => true,
            ]);
        }

        // Track existing steps for efficient updates
        $existingSteps = $route->steps->keyBy('id');
        $processedIds = [];

        foreach ($validated['steps'] as $stepData) {
            // Handle temporary IDs for new steps
            $stepId = $stepData['id'] ?? null;
            $isNewStep = !$stepId || str_starts_with($stepId, 'temp-');

            if ($isNewStep) {
                // Create new step using Eloquent relationship
                $step = $route->steps()->create([
                    'step_number' => $stepData['sequence'],
                    'name' => $stepData['name'],
                    'description' => $stepData['description'] ?? null,
                    'work_cell_id' => $stepData['work_cell_id'],
                    'setup_time_minutes' => $stepData['setup_time_minutes'] ?? 0,
                    'cycle_time_minutes' => $stepData['cycle_time_minutes'] ?? 0,
                    'step_type' => $stepData['step_type'] ?? 'standard',
                    'is_required' => $stepData['is_required'] ?? true,
                    'quality_check_mode' => $stepData['quality_check_mode'] ?? null,
                    'sampling_size' => $stepData['sampling_size'] ?? null,
                    'form_id' => $stepData['form_id'] ?? null,
                    'child_order_dependency_type' => $stepData['child_order_dependency_type'] ?? 'all_children_completed',
                    'child_order_minimum_quantity' => $stepData['child_order_minimum_quantity'] ?? 0,
                ]);
                
                // Store ID mapping for response
                if ($stepId) {
                    $idMapping[$stepId] = $step->id;
                }
            } else {
                // Update existing step using Eloquent
                $step = $existingSteps->get($stepId);
                if ($step) {
                    $step->fill([
                        'step_number' => $stepData['sequence'],
                        'name' => $stepData['name'],
                        'description' => $stepData['description'] ?? $step->description,
                        'work_cell_id' => $stepData['work_cell_id'],
                        'setup_time_minutes' => $stepData['setup_time_minutes'] ?? $step->setup_time_minutes,
                        'cycle_time_minutes' => $stepData['cycle_time_minutes'] ?? $step->cycle_time_minutes,
                        'step_type' => $stepData['step_type'] ?? $step->step_type,
                        'is_required' => $stepData['is_required'] ?? $step->is_required,
                        'quality_check_mode' => $stepData['quality_check_mode'] ?? $step->quality_check_mode,
                        'sampling_size' => $stepData['sampling_size'] ?? $step->sampling_size,
                        'form_id' => $stepData['form_id'] ?? $step->form_id,
                        'child_order_dependency_type' => $stepData['child_order_dependency_type'] ?? $step->child_order_dependency_type,
                        'child_order_minimum_quantity' => $stepData['child_order_minimum_quantity'] ?? $step->child_order_minimum_quantity,
                    ])->save();
                }
            }

            if ($step) {
                $processedIds[] = $step->id;
            }
        }

        // Delete removed steps using Eloquent
        $route->steps()
            ->whereNotIn('id', $processedIds)
            ->delete();
            
        // Update route version for conflict detection
        $route->increment('version');
    });

    // CRITICAL: For auto-save, return JSON response, NOT an Inertia response
    if ($isAutoSave) {
        return response()->json([
            'success' => true,
            'saved_at' => now()->toIso8601String(),
            'id_mapping' => $idMapping, // Map temp IDs to real IDs
            'version' => $order->manufacturingRoute->version ?? 1,
        ]);
    }

    // For manual saves, return normal Inertia redirect
    return back()->with('success', 'Route saved successfully');
}
```

### 4. Advanced Features

#### Conflict Detection & Resolution

```typescript
// Add version tracking to detect conflicts
interface RouteFormData {
  steps: RouteStep[];
  version: number; // Backend version number
}

const routeForm = useAutoSaveForm<RouteFormData>({
  steps: manufacturingOrder.manufacturing_route?.steps || [],
  version: manufacturingOrder.manufacturing_route?.version || 0,
}, {
  endpoint: route('production.planning.orders.save-route', manufacturingOrder.id),
  onSaveError: (errors) => {
    if (errors.version) {
      // Handle version conflict
      handleVersionConflict();
    }
  },
});

// Backend check
public function saveRoute(Request $request, ManufacturingOrder $order)
{
    $version = $request->input('version');
    
    if ($order->manufacturingRoute && $order->manufacturingRoute->version !== $version) {
        return response()->json([
            'errors' => [
                'version' => 'The route has been modified by another user.',
            ],
            'current_version' => $order->manufacturingRoute->version,
            'current_steps' => $order->manufacturingRoute->steps,
        ], 409);
    }
    
    // ... save logic
}
```

#### Polling for External Changes

```typescript
import { usePoll } from '@inertiajs/react';

// Poll for external changes every 30 seconds
usePoll(30000, {
  only: ['manufacturingOrder.manufacturing_route.version'],
  onSuccess: (page) => {
    const serverVersion = page.props.manufacturingOrder.manufacturing_route.version;
    if (serverVersion > routeForm.data.version) {
      // Show notification about external changes
      notifyExternalChanges();
    }
  },
});
```

#### Deferred Props for Performance

```php
// Load non-critical data as deferred props
return Inertia::render('Production/Planning/Show', [
    'manufacturingOrder' => $order->load('manufacturingRoute.steps'),
    'workCells' => WorkCell::all(),
    
    // Defer loading of less critical data
    'auditLog' => Inertia::defer(fn () => $order->activities()->latest()->take(50)->get()),
    'statistics' => Inertia::defer(fn () => $this->calculateRouteStatistics($order)),
]);
```

### 5. Component-Level Implementation

```typescript
// StepCard component with field-level focus preservation
interface StepCardProps {
  step: RouteStep;
  onUpdate: (field: string, value: any) => void;
}

function StepCard({ step, onUpdate }: StepCardProps) {
  const handleFieldChange = useCallback((field: string, value: any) => {
    onUpdate(field, value);
  }, [onUpdate]);

  return (
    <Card>
      <TextInput
        name={`step-${step.id}-name`}
        value={step.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        // Stable reference for focus preservation
        data-field-id={`step-${step.id}-name`}
      />
      
      <Textarea
        name={`step-${step.id}-description`}
        value={step.description || ''}
        onChange={(e) => handleFieldChange('description', e.target.value)}
        data-field-id={`step-${step.id}-description`}
      />
      
      {/* Other fields... */}
    </Card>
  );
}
```

## Benefits of Inertia.js Approach

### 1. **Simplicity**
- No complex state management library needed
- Uses Inertia's built-in features
- Follows Laravel/Inertia conventions

### 2. **Performance**
- Minimal data transfer with `only` parameter
- Deferred props for non-critical data
- No full page reloads

### 3. **User Experience**
- Focus preservation built-in
- Optimistic updates via form state
- Smooth conflict resolution

### 4. **Developer Experience**
- Familiar Laravel/Inertia patterns
- Easy to test and debug
- Type-safe with TypeScript

## Implementation Timeline

### Week 1: Core Infrastructure
1. Implement `useAutoSaveForm` hook
2. Update RouteBuilder to use new hook
3. Update backend controller for efficient saves
4. Add focus preservation logic

### Week 2: Enhanced Features
1. Add version tracking for conflict detection
2. Implement polling for external changes
3. Add deferred props for performance
4. Create visual indicators for save status

### Week 3: Testing & Polish
1. Write comprehensive tests
2. Handle edge cases (network failures, etc.)
3. Add user notifications
4. Performance optimization

### Week 4: Rollout
1. Feature flag implementation
2. Gradual rollout to users
3. Monitor metrics
4. Gather feedback and iterate

## Why This Approach Prevents Focus Loss

The key insight is that **auto-save requests must NOT trigger Inertia page updates**:

1. **Regular AJAX for Auto-Save**
   - Uses `fetch()` instead of `router.post()` for auto-saves
   - Sends JSON request with `is_autosave: true` flag
   - Backend returns JSON response, NOT an Inertia response

2. **Controller Distinction**
   ```php
   if ($isAutoSave) {
       // Return JSON - no page update!
       return response()->json([...]);
   } else {
       // Manual save - normal Inertia flow
       return back()->with('success', '...');
   }
   ```

3. **Focus Preservation**
   - No Inertia page update = no React re-render
   - DOM elements stay intact
   - Focus position is maintained naturally
   - Backup focus tracking for edge cases

4. **State Synchronization**
   - Frontend updates its state optimistically
   - Backend returns ID mappings for new items
   - No full page data reload needed

## Key Differences from JSON Patch Approach

1. **No External Dependencies**: Uses only Inertia and React
2. **Simpler Mental Model**: Form state is the source of truth
3. **Better Integration**: Works seamlessly with existing Inertia patterns
4. **Easier Debugging**: Standard request/response cycle
5. **Type Safety**: Full TypeScript support

## Conclusion

This approach leverages Inertia.js's strengths while solving the auto-save problems. It provides a smooth user experience without the complexity of external state management or patch systems. The solution is maintainable, performant, and follows established Laravel/Inertia patterns that the team is already familiar with.
