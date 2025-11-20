# External Steps Save Issue - THE REAL ROOT CAUSE

**Date**: November 20, 2025  
**Issue**: External step fields were not being saved AND changes weren't triggering the save dialog

## The ACTUAL Root Cause - THREE Issues!

After deeper investigation, we found **THREE separate problems** preventing external steps from saving:

### Issue #1: RouteBuilder Not Tracking External Fields ⚠️ **CRITICAL**

**File**: `resources/js/components/production/planning/RouteBuilder.tsx` (lines 597-623)

The `onLocalStepUpdate` handler was **completely ignoring external execution fields**! When the StepPropertiesPanel called `onLocalStepUpdate` with changes to `execution_location`, `manufacturer_id`, or `expected_lead_time_days`, the RouteBuilder was silently discarding them.

**Why This Caused the Save Dialog Issue**: Since the RouteBuilder wasn't actually updating the steps array with external field changes, the route changes store saw no difference between the original and current steps, so it didn't mark the route as "dirty" requiring save.

**The Fix**:
```typescript
// Added to the updatedStep object in onLocalStepUpdate
execution_location: Object.prototype.hasOwnProperty.call(updates, 'execution_location') 
    ? (updates.execution_location || 'internal') 
    : steps[index].execution_location,
manufacturer_id: Object.prototype.hasOwnProperty.call(updates, 'manufacturer_id') 
    ? updates.manufacturer_id 
    : steps[index].manufacturer_id,
expected_lead_time_days: Object.prototype.hasOwnProperty.call(updates, 'expected_lead_time_days') 
    ? updates.expected_lead_time_days 
    : steps[index].expected_lead_time_days,
```

### Issue #2: PlanningService Not Sending External Fields

**File**: `resources/js/services/production/planning-service.ts` (lines 46-58)

Even if Issue #1 was fixed, the PlanningService was filtering out external fields when preparing data for submission.

**The Fix**: Added external fields to the step mapping (already fixed in previous commit).

### Issue #3: Backend Not Validating External Fields

**File**: `app/Http/Controllers/Production/PlanningController.php` (lines ~109-122)

The validation rules were missing, so even if frontend sent the data, backend would drop it.

**The Fix**: Added validation rules (already fixed in previous commit).

## Complete Data Flow (With All Fixes)

1. **UI** (`StepPropertiesPanel.tsx`):
   - User selects "Execução Externa"
   - Calls `onLocalStepUpdate(stepId, { execution_location: 'external' })`
   - ✅ Working correctly

2. **RouteBuilder** (`RouteBuilder.tsx`):
   - **❌ WAS IGNORING external field updates in `onLocalStepUpdate`**
   - **✅ NOW PROPERLY updates steps array with external fields**
   - **✅ NOW TRIGGERS change detection (save dialog appears)**
   - Calls `onStepsChange(updatedSteps)`

3. **Planning Page** (`planning/index.tsx`):
   - Receives updated steps via `handleRouteStepsChange`
   - Calls `routeChangesStore.trackChange()`
   - ✅ Was working correctly

4. **Planning Service** (`planning-service.ts`):
   - **❌ WAS FILTERING OUT external fields**
   - **✅ NOW INCLUDES external fields in submission**

5. **Backend Controller** (`PlanningController.php`):
   - **❌ WAS MISSING validation rules**
   - **✅ NOW VALIDATES and accepts external fields**

6. **Database**:
   - Saves complete step data

## Debug Logging Added

### Frontend Console Logging

1. **RouteBuilder.tsx** - When step is updated:
   ```javascript
   console.log('[RouteBuilder] Step updated:', {
       stepId,
       updates,
       before: steps[index],
       after: updatedStep,
       external_fields: {
           execution_location: updatedStep.execution_location,
           manufacturer_id: updatedStep.manufacturer_id,
           expected_lead_time_days: updatedStep.expected_lead_time_days,
       }
   });
   ```

2. **PlanningService.ts** - When saving route:
   ```javascript
   console.log('[PlanningService] Saving route:', {
       orderId: params.orderId,
       stepsCount: params.steps.length,
       steps: params.steps.map(step => ({
           name: step.name,
           execution_location: step.execution_location,
           manufacturer_id: step.manufacturer_id,
           expected_lead_time_days: step.expected_lead_time_days,
       })),
   });
   ```

3. **PlanningService.ts** - On save success/error:
   ```javascript
   console.log('[PlanningService] Route saved successfully');
   // or
   console.error('[PlanningService] Route save failed:', errors);
   ```

### Backend Laravel Logging

In `PlanningController.php`:
```php
\Log::info('Saving route with steps', [
    'order_id' => $order->id,
    'steps' => collect($validated['steps'])->map(function ($step) {
        return [
            'name' => $step['name'],
            'execution_location' => $step['execution_location'] ?? 'not set',
            'manufacturer_id' => $step['manufacturer_id'] ?? 'not set',
            'expected_lead_time_days' => $step['expected_lead_time_days'] ?? 'not set',
        ];
    })->toArray(),
]);

// ... after creating step ...

\Log::info('Step created', [
    'step_id' => $createdStep->id,
    'execution_location' => $createdStep->execution_location,
    'manufacturer_id' => $createdStep->manufacturer_id,
    'expected_lead_time_days' => $createdStep->expected_lead_time_days,
    'external_status' => $createdStep->external_status,
]);
```

## Testing With Logging

1. **Open Browser Console** (F12 → Console tab)

2. **Edit a Step as External**:
   - Select "Execução Externa"
   - You should immediately see:
     ```
     [RouteBuilder] Step updated: {
       stepId: 123,
       updates: { execution_location: "external" },
       ...
       external_fields: { execution_location: "external", ... }
     }
     ```

3. **Select a Manufacturer**:
   - You should see another log:
     ```
     [RouteBuilder] Step updated: {
       updates: { manufacturer_id: 5 },
       ...
     }
     ```

4. **Save the Route** (Save button should now be visible):
   - Console should show:
     ```
     [PlanningService] Saving route: {
       orderId: 4,
       steps: [{
         name: "Step 1",
         execution_location: "external",
         manufacturer_id: 5,
         expected_lead_time_days: 10
       }]
     }
     ```
   - Then:
     ```
     [PlanningService] Route saved successfully
     ```

5. **Check Laravel Logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```
   Should show the backend receiving and saving the data.

6. **Verify in Database**:
   The step should now have all external fields saved correctly.

## Why This Was So Hard to Find

1. **Silent Failure at Multiple Layers**: Data was being dropped at THREE different points
2. **No Error Messages**: Everything appeared to work - no console errors, no validation errors
3. **Misleading UI Behavior**: The form fields worked perfectly during the session, giving the appearance of correctness
4. **Save Dialog Mystery**: The most telling symptom (save dialog not appearing) was actually a side effect of Issue #1
5. **Cross-Layer Problem**: Required coordinated fixes across RouteBuilder → Service → Controller

## Files Modified

### Frontend
1. **`resources/js/components/production/planning/RouteBuilder.tsx`**
   - Added external fields handling in `onLocalStepUpdate`
   - Added console logging for debugging

2. **`resources/js/services/production/planning-service.ts`**
   - Added external fields to step mapping in `saveRoute()`
   - Added external fields to step mapping in `saveMultipleRoutes()`
   - Added console logging for debugging

### Backend
3. **`app/Http/Controllers/Production/PlanningController.php`**
   - Added validation rules for external fields in `saveRoute()`
   - Added validation rules for external fields in `bulkSaveRoutes()`
   - Added Laravel logging for debugging

## Expected Behavior After Fix

✅ **Save Dialog Appears**: When you change execution_location or manufacturer_id  
✅ **Console Shows Updates**: Each change logged in browser console  
✅ **Backend Receives Data**: Laravel logs show external fields  
✅ **Database Persists Data**: External fields saved correctly  
✅ **UI Shows Correct State**: Step displays as external after page reload  

## Prevention Checklist

When adding new fields to any entity:

1. ✅ Add fields to TypeScript types
2. ✅ Add fields to component state/form
3. ✅ Add fields to **local update handlers** (like `onLocalStepUpdate`)
4. ✅ Add fields to service layer submission
5. ✅ Add fields to backend validation
6. ✅ Add fields to database migration
7. ✅ Test the complete flow with logging
8. ✅ Verify save dialog appears when fields change
9. ✅ Verify data persists after save and reload

