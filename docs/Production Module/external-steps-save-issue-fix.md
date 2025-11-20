# External Steps Save Issue - Root Cause and Fix

**Date**: November 20, 2025  
**Issue**: External step fields (execution_location, manufacturer_id, expected_lead_time_days) were not being saved to the database

## Root Cause

The validation rules in `PlanningController::saveRoute()` and `PlanningController::bulkSaveRoutes()` were missing the external execution fields. Laravel's validation was silently dropping these fields from the request data before they reached the database save operation.

### Code Flow

1. **Frontend** (`StepPropertiesPanel.tsx`):
   - User selects "Execução Externa"
   - Sets `execution_location: 'external'`
   - Selects a manufacturer (`manufacturer_id`)
   - Sets expected lead time (`expected_lead_time_days`)

2. **Form Submission**:
   - Data is sent via Inertia to the backend
   - Includes all external step fields in the request

3. **Backend Validation** (`PlanningController.php`):
   - **PROBLEM**: Validation rules didn't include external fields
   - Laravel silently removed unvalidated fields
   - Only validated fields passed to the save operation

4. **Database Save**:
   - Only validated fields were saved
   - External fields never made it to the database

## The Fix

### Added Validation Rules

In `app/Http/Controllers/Production/PlanningController.php`:

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
```

### Added Debug Logging

To help diagnose issues in the future, comprehensive logging was added:

```php
DB::transaction(function () use ($order, $validated) {
    // Log incoming step data
    \Log::info('Saving route with steps', [
        'order_id' => $order->id,
        'order_number' => $order->order_number,
        'steps_count' => count($validated['steps']),
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

### Both Methods Updated

The fix was applied to both:
1. `saveRoute()` - Single order route saving
2. `bulkSaveRoutes()` - Multiple order route saving

## Testing the Fix

### Before the Fix

```bash
# Check logs
tail -f storage/logs/laravel.log

# You would see:
# - Fields missing from incoming data
# - External fields showing as "not set" even when sent from frontend
```

### After the Fix

```bash
# Save a step with external execution
# Check logs - you should now see:
[2025-11-20 ...] Saving route with steps
  {
    "order_id": 123,
    "steps": [
      {
        "name": "Heat Treatment",
        "execution_location": "external",
        "manufacturer_id": 5,
        "expected_lead_time_days": 10
      }
    ]
  }

[2025-11-20 ...] Step created
  {
    "step_id": 456,
    "execution_location": "external",
    "manufacturer_id": 5,
    "expected_lead_time_days": 10,
    "external_status": "awaiting_shipment"
  }
```

### Database Verification

```sql
-- Check the step was saved correctly
SELECT 
    id,
    name,
    execution_location,
    manufacturer_id,
    expected_lead_time_days,
    external_status
FROM manufacturing_steps
WHERE id = [step_id];

-- Should return:
-- execution_location: 'external'
-- manufacturer_id: 5
-- expected_lead_time_days: 10
-- external_status: 'awaiting_shipment'
```

## Related Changes

This fix complements the earlier optimization work where we:
1. Removed redundant quantity/date fields from manufacturing_steps table
2. Created computed properties to pull shipping data from the logistics module
3. Simplified external_status from 3 states to 2 states

## Prevention

To prevent similar issues in the future:

1. **Always add validation rules** for new fields before they can be saved
2. **Check validation rules** when debugging save issues
3. **Use logging** to trace data flow from frontend to database
4. **Test with browser DevTools** to verify data is being sent correctly
5. **Check Laravel logs** when fields aren't saving as expected

## Files Modified

- `app/Http/Controllers/Production/PlanningController.php`
  - Added validation rules for external fields in `saveRoute()`
  - Added validation rules for external fields in `bulkSaveRoutes()`
  - Added comprehensive debug logging

