# Central Activity Log Implementation

## Overview

This document describes how activity logging works in the multi-tenant system for central database operations (Account/Subscription management).

## Architecture

The system uses **two separate activity log tables**:

1. **Central Database `activity_log`**: For Account, Subscription, and other central model operations
2. **Tenant Database `activity_log`**: For tenant-specific user actions (work orders, assets, etc.)

## Why Two Activity Log Tables?

### The Problem

- **Account** model uses **UUID** primary keys and lives in the **central** database
- **Tenant activity logs** expect **integer** primary keys (for tenant User models)
- Activity logged during tenant creation happens in tenant context but needs to log central models

### The Solution

- Central operations → Log to **central** `activity_log` (supports UUIDs via `uuidMorphs`)
- Tenant operations → Log to **tenant** `activity_log` (supports integers via `nullableMorphs`)

## Implementation

### Helper Function

We created a `central_activity()` helper function that wraps the Spatie activity log and ensures it writes to the central database:

```php
// app/Support/helpers.php
function central_activity(): ActivityLogger
{
    return activity()->tap(function ($activity) {
        $activity->setConnection('central');
    });
}
```

### Usage

**For Central Operations (Account, Subscription, etc.):**
```php
use App\Models\Central\Subscription;

// Log subscription change to central DB
central_activity()
    ->performedOn($subscription)
    ->causedBy(auth()->user())
    ->withProperties([
        'old_plan' => $oldPlan->name,
        'new_plan' => $newPlan->name,
    ])
    ->log("Subscription changed from {$oldPlan->name} to {$newPlan->name}");
```

**For Tenant Operations (Work Orders, Assets, etc.):**
```php
// Normal activity() helper writes to tenant database
activity()
    ->performedOn($workOrder)
    ->causedBy(auth()->user())
    ->log('Work order created');
```

## Current Usage

The `central_activity()` helper is currently used in:

1. **TenancyServiceProvider**:
   - `onTenantCreated()` - Logs tenant creation
   - `onDeletingTenant()` - Logs tenant deletion
   - `onTenantStatusChanged()` - Logs status changes (active/suspended/maintenance)

## Database Schema

### Central activity_log Table

Located in: `database/migrations/central/2025_11_05_113317_create_activity_log_table.php`

Key differences from tenant table:
- Uses `uuidMorphs('subject')` - Supports UUID-based models like Account
- Uses `uuidMorphs('causer')` - Supports UUID-based admin users (future)

### Tenant activity_log Table

Located in: `database/migrations/tenant/2025_09_18_164557_create_activity_log_table.php`

Uses `nullableMorphs('subject')` - Supports integer-based models like User, WorkOrder, etc.

## Best Practices

### When to Use central_activity()

✅ **Use `central_activity()` for**:
- Account creation/updates/deletion
- Subscription changes
- Plan modifications
- Central admin actions
- Any operation on models in the central database

### When to Use activity()

✅ **Use `activity()` for**:
- User actions within a tenant (work orders, assets, maintenance)
- Tenant-specific model changes
- Operations that should appear in tenant's activity feed

### When to Use Neither

❌ **Don't use activity logging for**:
- System/infrastructure events (use Laravel Log instead)
- High-frequency operations (performance considerations)
- Temporary data changes

## Example: Subscription Management

```php
// In AccountController or future SubscriptionController
public function updateSubscription(Request $request, Account $account): RedirectResponse
{
    $validated = $request->validate([
        'plan_id' => 'required|exists:plans,id',
    ]);
    
    $oldPlan = $account->subscription->plan;
    
    $account->subscription->update([
        'plan_id' => $validated['plan_id'],
    ]);
    
    $newPlan = $account->subscription->fresh()->plan;
    
    // Log to central database
    central_activity()
        ->performedOn($account->subscription)
        ->causedBy(auth()->user())
        ->withProperties([
            'old_plan' => ['id' => $oldPlan->id, 'name' => $oldPlan->name],
            'new_plan' => ['id' => $newPlan->id, 'name' => $newPlan->name],
            'account_name' => $account->name,
        ])
        ->log("Subscription changed from {$oldPlan->name} to {$newPlan->name}");
    
    // Also log to Laravel logs for debugging
    \Log::info('💳 Subscription plan changed', [
        'admin_id' => auth()->id(),
        'account_id' => $account->id,
        'old_plan_id' => $oldPlan->id,
        'new_plan_id' => $newPlan->id,
    ]);
    
    return back()->with('success', 'Subscription updated successfully');
}
```

## Technical Details

### How tap() Works

The `tap()` method in Spatie's ActivityLogger allows you to manipulate the Activity model before it saves:

```php
activity()->tap(function ($activity) {
    $activity->setConnection('central');  // Set database connection
    $activity->setAttribute('custom_field', 'value');  // Add custom fields
})
```

This is the recommended approach per the Spatie documentation for multi-database scenarios.

### Connection Resolution

1. User calls `central_activity()`
2. Returns `ActivityLogger` instance
3. `tap()` callback sets connection to 'central' on the Activity model
4. When `log()` is called, the Activity model saves to central database

## References

- [Tenancy for Laravel - Spatie Integration](https://tenancyforlaravel.com/docs/v3/integrations/spatie/)
- [Spatie Activity Log Documentation](https://spatie.be/docs/laravel-activitylog/)
- [The Two Applications Concept](https://tenancyforlaravel.com/docs/v3/the-two-applications)

## Troubleshooting

### Error: "Invalid input syntax for type bigint"

**Cause**: Trying to log a UUID-based model to a table expecting integers.

**Solution**: Use `central_activity()` instead of `activity()` for central models.

### Activity Not Showing in Database

**Check**:
1. Is `config('activitylog.enabled')` true?
2. Are you in the correct database context?
3. Did you run migrations for the central activity_log table?
4. Check Laravel logs for any errors

### Performance Concerns

For high-frequency operations, consider:
1. Using Laravel Log instead (file-based, faster)
2. Queueing activity log writes
3. Batching multiple activities
4. Using log levels to filter

