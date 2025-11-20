# External Steps Save Issue - ACTUAL Root Cause and Complete Fix

**Date**: November 20, 2025  
**Issue**: External step fields (execution_location, manufacturer_id, expected_lead_time_days) were not being saved to the database

## ACTUAL Root Cause - TWO Issues!

The problem was actually in **TWO places**, not just one:

### Issue #1: Frontend Not Sending the Data

The `PlanningService.saveRoute()` and `PlanningService.saveMultipleRoutes()` methods in `resources/js/services/production/planning-service.ts` were **not including external execution fields** when mapping steps for submission to the backend.

**Location**: `resources/js/services/production/planning-service.ts` (lines 46-58 and 91-103)

Even though the UI was capturing the data correctly and storing it in the route changes store, the service that submits the data to the backend was filtering out these fields!

### Issue #2: Backend Not Validating the Fields

The validation rules in `PlanningController::saveRoute()` and `PlanningController::bulkSaveRoutes()` were missing the external execution fields. Even if the frontend sent them, Laravel's validation would have silently dropped them.

**Location**: `app/Http/Controllers/Production/PlanningController.php` (lines ~109-122)

## The Complete Fix

### Frontend Fix - Planning Service

**File**: `resources/js/services/production/planning-service.ts`

Added external fields to the step mapping in both methods:

```typescript
// In saveRoute() method
steps: params.steps.map(step => ({
    sequence: step.sequence,
    name: step.name,
    // ... other fields ...
    
    // External execution fields - ADDED
    execution_location: step.execution_location || 'internal',
    manufacturer_id: step.manufacturer_id || null,
    expected_lead_time_days: step.expected_lead_time_days || null,
})),

// In saveMultipleRoutes() method
steps: change.steps.map(step => ({
    sequence: step.sequence,
    name: step.name,
    // ... other fields ...
    
    // External execution fields - ADDED
    execution_location: step.execution_location || 'internal',
    manufacturer_id: step.manufacturer_id || null,
    expected_lead_time_days: step.expected_lead_time_days || null,
}))
```

### Backend Fix - Validation Rules

**File**: `app/Http/Controllers/Production/PlanningController.php`

Added validation rules for external fields in both methods:

```php
// In saveRoute() method (line ~109)
$validated = $request->validate([
    // ... existing rules ...
    
    // External execution fields - ADDED
    'steps.*.execution_location' => 'nullable|in:internal,external',
    'steps.*.manufacturer_id' => 'nullable|exists:manufacturers,id',
    'steps.*.expected_lead_time_days' => 'nullable|integer|min:1',
    // ... rest of validation rules ...
]);

// In bulkSaveRoutes() method (line ~182)
$validated = $request->validate([
    // ... existing rules ...
    
    // External execution fields - ADDED  
    'routes.*.steps.*.execution_location' => 'nullable|in:internal,external',
    'routes.*.steps.*.manufacturer_id' => 'nullable|exists:manufacturers,id',
    'routes.*.steps.*.expected_lead_time_days' => 'nullable|integer|min:1',
]);
```

### Backend Enhancement - Debug Logging

Added comprehensive logging to help diagnose future issues:

```php
DB::transaction(function () use ($order, $validated) {
    // Log incoming step data for debugging
    \Log::info('Saving route with steps', [
        'order_id' => $order->id,
        'steps' => collect($validated['steps'])->map(function ($step) {
            return [
                'name' => $step['name'] ?? 'N/A',
                'execution_location' => $step['execution_location'] ?? 'not set',
                'manufacturer_id' => $step['manufacturer_id'] ?? 'not set',
                'expected_lead_time_days' => $step['expected_lead_time_days'] ?? 'not set',
            ];
        })->toArray(),
    ]);
    
    // ... create steps ...
    
    // Log what was actually saved
    \Log::info('Step created', [
        'step_id' => $createdStep->id,
        'execution_location' => $createdStep->execution_location,
        'manufacturer_id' => $createdStep->manufacturer_id,
        'expected_lead_time_days' => $createdStep->expected_lead_time_days,
        'external_status' => $createdStep->external_status,
    ]);
});
```

## Data Flow (Complete Picture)

1. **UI** (`StepPropertiesPanel.tsx`):
   - User selects "Execução Externa"
   - Sets execution_location, manufacturer_id, expected_lead_time_days
   - Data stored in local component state

2. **Route Changes Store** (`useRouteChangesStore.ts`):
   - Tracks changes including external fields
   - ✅ This was working correctly

3. **Planning Page** (`planning/index.tsx`):
   - Passes data to save handler
   - ✅ This was working correctly

4. **Planning Service** (`planning-service.ts`):
   - **❌ WAS FILTERING OUT external fields**
   - **✅ NOW INCLUDES external fields in submission**

5. **Backend Controller** (`PlanningController.php`):
   - **❌ WAS MISSING validation rules**
   - **✅ NOW VALIDATES external fields**
   - Creates steps with all data

6. **Database**:
   - Saves all fields including external execution data

## Testing the Complete Fix

### Steps to Test:

1. **Clear logs** (if you want to see logging):
   ```bash
   echo "" > storage/logs/laravel.log
   ```

2. **Create/Edit an External Step**:
   - Go to Planning page
   - Select or create a Manufacturing Order
   - Add/edit a step
   - Select "Execução Externa"
   - Choose a manufacturer
   - Set expected lead time
   - Save the route

3. **Verify in Browser DevTools**:
   - Open Network tab
   - Look for the POST request to `save-route`
   - Check the payload - should now include:
     ```json
     {
       "steps": [{
         "name": "Step Name",
         "execution_location": "external",
         "manufacturer_id": 5,
         "expected_lead_time_days": 10,
         ...
       }]
     }
     ```

4. **Verify in Logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```
   Should show the logging with external fields

5. **Verify in Database**:
   ```sql
   SELECT id, name, execution_location, manufacturer_id, expected_lead_time_days, external_status
   FROM manufacturing_steps
   WHERE execution_location = 'external'
   ORDER BY id DESC
   LIMIT 5;
   ```

## Why It Was Hard to Find

1. **No Error Messages**: Both the frontend and backend were working "correctly" - they just weren't handling the external fields
2. **Silent Data Loss**: The data was being dropped silently at two different points in the pipeline
3. **UI Appeared Correct**: The form was saving and displaying properly in the UI during the session, but not persisting to the database
4. **Multi-Layer Problem**: Required fixes in both frontend (TypeScript) and backend (PHP), making it harder to trace

## Files Modified

### Frontend
- `resources/js/services/production/planning-service.ts`
  - Added external fields to `saveRoute()` method
  - Added external fields to `saveMultipleRoutes()` method

### Backend
- `app/Http/Controllers/Production/PlanningController.php`
  - Added validation rules for external fields in `saveRoute()`
  - Added validation rules for external fields in `bulkSaveRoutes()`
  - Added comprehensive debug logging

## Prevention

To prevent similar issues:

1. **Always check the service layer** when data isn't persisting - not just the UI and backend
2. **Use browser DevTools Network tab** to verify what's actually being sent to the server
3. **Add validation rules immediately** when adding new fields to models
4. **Check all layers** of the data flow: UI → Store → Service → Controller → Database
5. **Add logging** at critical integration points
6. **Test with browser DevTools open** to catch data transformation issues

## Related Documentation

- `docs/Production Module/external-steps-save-issue-fix.md` - Initial backend-only analysis
- `docs/Logistics/1-external-manufacturing-steps-specification.md` - Original feature spec

