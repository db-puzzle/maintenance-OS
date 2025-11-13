# Feature Flags Implementation Guide

**Version:** 1.0  
**Date:** November 13, 2025  
**Status:** Implemented - Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Current Feature Flags](#current-feature-flags)
7. [Usage Guide](#usage-guide)
8. [Admin Management](#admin-management)
9. [Testing](#testing)
10. [Migration Instructions](#migration-instructions)

---

## Overview

### Purpose

The feature flag system allows you to:
- **Hide incomplete features** from users globally
- **Control feature access** based on subscription plans
- **Enable gradual rollout** of new features
- **A/B testing** capabilities (future)

### Types of Feature Flags

1. **Global Features** - Enabled/disabled for all tenants
   - Used for features in development
   - Controlled by system administrators
   - Examples: Forms Engine, Advanced Scheduler

2. **Plan-Based Features** - Different features for different subscription tiers
   - Starter, Professional, Enterprise plans
   - Controlled per plan
   - Can be overridden per tenant

---

## Architecture

### Components

```
┌─────────────────┐
│   Frontend      │
│  (React/Inertia)│
├─────────────────┤
│ useFeature()    │ ← Feature checks
│ FEATURES const  │ ← Type-safe keys
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Middleware     │
│  (HandleInertia)│
├─────────────────┤
│ Injects features│ ← Shares to frontend
│ into props      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FeatureService  │
├─────────────────┤
│ - isEnabled()   │ ← Main check method
│ - getEnabled()  │
│ - clearCache()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
├─────────────────┤
│ - features      │
│ - plan_features │
│ - plans         │
└─────────────────┘
```

---

## Database Schema

### `features` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `key` | string | Unique identifier (e.g., `production_scheduler`) |
| `name` | string | Human-readable name |
| `description` | text | What the feature does |
| `category` | string | Feature category (e.g., `production`) |
| `is_global` | boolean | If true, applies to all tenants |
| `is_enabled_globally` | boolean | Global enable/disable |
| `requires_backend_validation` | boolean | Enforce on backend |
| `metadata` | json | Additional configuration |

### `plan_features` Table (Pivot)

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `plan_id` | bigint | Foreign key to plans |
| `feature_id` | bigint | Foreign key to features |
| `is_enabled` | boolean | Enabled for this plan |
| `configuration` | json | Plan-specific config |

---

## Backend Implementation

### 1. FeatureService

The central service for feature checks.

```php
use App\Services\FeatureService;

// Check if feature is enabled
$featureService = app(FeatureService::class);

if ($featureService->isEnabled('production_scheduler')) {
    // Feature is available
}

// Throw exception if not enabled
$featureService->ensureEnabled('production_scheduler');

// Get all enabled features
$enabled = $featureService->getEnabledFeatures();
// Returns: ['production_scheduler', 'other_feature', ...]
```

### 2. Middleware Protection

Protect routes with the `feature` middleware:

```php
// In routes/tenant.php
Route::get('/scheduler', [SchedulerController::class, 'index'])
    ->middleware(['auth', 'feature:production_scheduler']);
```

### 3. Controller Validation

```php
use App\Services\FeatureService;

class StepController extends Controller
{
    public function __construct(
        protected FeatureService $featureService
    ) {}

    public function store(Request $request)
    {
        // Validate feature access
        if ($request->has('form_id')) {
            $this->featureService->ensureEnabled('production_forms_engine');
        }

        // Continue with logic...
    }
}
```

### 4. Model Methods

```php
// In Plan model
$plan = Plan::find(1);

// Check if plan has feature
if ($plan->hasFeature('production_scheduler')) {
    // Plan has access
}

// Get all enabled features for plan
$features = $plan->getEnabledFeatures();
```

---

## Frontend Implementation

### 1. Import the Hook

```typescript
import { useFeature, FEATURES } from '@/utils/features';
```

### 2. Check Features

```typescript
export default function MyComponent() {
    // Check single feature
    const hasScheduler = useFeature(FEATURES.PRODUCTION_SCHEDULER);

    return (
        <div>
            {hasScheduler && (
                <Link href="/scheduler">Go to Scheduler</Link>
            )}
        </div>
    );
}
```

### 3. Multiple Features

```typescript
import { useMultipleFeatures, FEATURES } from '@/utils/features';

export default function MyComponent() {
    const features = useMultipleFeatures([
        FEATURES.PRODUCTION_SCHEDULER,
        FEATURES.PRODUCTION_FORMS_ENGINE
    ]);

    return (
        <div>
            {features[FEATURES.PRODUCTION_SCHEDULER] && <Scheduler />}
            {features[FEATURES.PRODUCTION_FORMS_ENGINE] && <FormSelect />}
        </div>
    );
}
```

### 4. Available Hooks

```typescript
// Check single feature
const hasFeature = useFeature('production_scheduler');

// Check multiple features
const features = useMultipleFeatures(['feature1', 'feature2']);

// Check if ANY features are enabled
const hasAny = useAnyFeature(['feature1', 'feature2']);

// Check if ALL features are enabled
const hasAll = useAllFeatures(['feature1', 'feature2']);

// Get all enabled features
const enabledFeatures = useEnabledFeatures();
```

---

## Current Feature Flags

### 1. `production_step_types_advanced`

**Status:** Disabled  
**Type:** Global  
**Category:** Production

**What it controls:**
- Hides non-Standard step types in Step Properties Panel
- Only "Standard" step type is available when disabled
- Advanced types (Quality Check, Assembly) hidden

**When to enable:**
- When all step type states are fully defined
- When backend logic supports all step types

---

### 2. `production_forms_engine`

**Status:** Disabled  
**Type:** Global  
**Category:** Production

**What it controls:**
- Hides "Formulário Associado" field in Step Properties Panel
- Form association functionality

**When to enable:**
- When forms engine is complete
- When form submission and validation are ready

---

### 3. `production_scheduler`

**Status:** Disabled  
**Type:** Global  
**Category:** Production

**What it controls:**
- Hides "Programação" card on home page
- Hides "Turnos" card on home page
- Hides shift configuration in Work Cell sheet
- Hides timing options in Step Properties Panel:
  - "Tempo de Fabricação Específico"
  - "Utilizar Throughput da Célula"

**When to enable:**
- When scheduler algorithm is production-ready
- When shift management is complete
- When capacity planning is tested

---

## Usage Guide

### Adding a New Feature Flag

1. **Create Migration** (if needed)
```php
// Already done - use existing tables
```

2. **Seed the Feature**
```php
// In FeaturesSeeder.php
[
    'key' => 'my_new_feature',
    'name' => 'My New Feature',
    'description' => 'Description of what it does',
    'category' => 'production',
    'is_global' => true,
    'is_enabled_globally' => false,
    'requires_backend_validation' => true,
    'metadata' => [],
]
```

3. **Add to Frontend Constants**
```typescript
// In resources/js/utils/features.ts
export const FEATURES = {
    // ...existing features
    MY_NEW_FEATURE: 'my_new_feature',
} as const;
```

4. **Use in Components**
```typescript
const hasFeature = useFeature(FEATURES.MY_NEW_FEATURE);
```

5. **Protect Routes** (if needed)
```php
Route::get('/my-route', ...)->middleware('feature:my_new_feature');
```

### Enabling a Feature

#### Option 1: Database (Recommended)
```php
use App\Models\Central\Feature;

$feature = Feature::where('key', 'production_scheduler')->first();
$feature->update(['is_enabled_globally' => true]);

// Clear cache
app(FeatureService::class)->clearCache();
```

#### Option 2: Admin Panel
- Navigate to Admin Panel → Features
- Toggle the feature on/off
- Cache clears automatically

---

## Admin Management

### Admin UI (Available Now)

The admin UI for managing features is available at:
```
http://admin.localhost:8000/features
```

Features include:

1. **Feature List**
   - View all features grouped by category
   - See enabled/disabled status with visual badges
   - Filter by global vs plan-based

2. **Global Feature Toggles**
   - Quick on/off switches for global features
   - Real-time status updates
   - Success/error notifications

3. **Plan Feature Assignment**
   - Configure which plans have access to each feature
   - Visual indicators showing current assignments
   - Easy-to-use toggle switches per plan

4. **Additional Features**
   - View feature metadata
   - Clear feature cache
   - Summary cards showing statistics

### Screenshots

**Main Features Page:**
- Consistent admin panel header with "Back to Dashboard" button
- User info and logout in top right
- Summary statistics cards showing Total Features, Globally Enabled, and Plan-Based counts
- Features grouped by category (e.g., "production")
- Global features have toggle switches
- Plan-based features show which plans have access
- Clear Cache button for manual cache clearing

**Plan Assignment Dialog:**
- Lists all subscription plans (Starter, Professional, Enterprise)
- Toggle switches to enable/disable per plan
- Save changes with one click

### Manual Management (Alternative)

You can also manage features via Artisan Tinker:

```bash
php artisan tinker
```

```php
// Enable a global feature
$feature = Feature::where('key', 'production_scheduler')->first();
$feature->update(['is_enabled_globally' => true]);

// Assign feature to a plan
$plan = Plan::where('name', 'Professional')->first();
$feature = Feature::where('key', 'production_scheduler')->first();

$plan->featureFlags()->attach($feature->id, [
    'is_enabled' => true,
    'configuration' => ['some' => 'config']
]);

// Clear cache
app(FeatureService::class)->clearCache();
```

---

## Testing

### Unit Tests

```php
// tests/Unit/FeatureServiceTest.php

it('checks if global feature is enabled', function () {
    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    $service = app(FeatureService::class);
    
    expect($service->isEnabled('test_feature'))->toBeTrue();
});

it('checks plan-based feature access', function () {
    $plan = Plan::factory()->create();
    $account = Account::factory()->create();
    $account->subscription()->create(['plan_id' => $plan->id]);
    
    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => false,
    ]);
    
    $plan->featureFlags()->attach($feature->id, ['is_enabled' => true]);
    
    $service = app(FeatureService::class);
    
    expect($service->isEnabled('test_feature', $account))->toBeTrue();
});
```

### Feature Tests

```php
// tests/Feature/FeatureFlagTest.php

it('blocks access to scheduler when feature is disabled', function () {
    $user = User::factory()->create();
    
    $this->actingAs($user)
        ->get('/production/scheduler')
        ->assertRedirect(route('home'))
        ->assertSessionHas('error');
});

it('allows access to scheduler when feature is enabled', function () {
    $feature = Feature::where('key', 'production_scheduler')->first();
    $feature->update(['is_enabled_globally' => true]);
    
    $user = User::factory()->create();
    
    $this->actingAs($user)
        ->get('/production/scheduler')
        ->assertOk();
});
```

---

## Migration Instructions

### Step 1: Run Migrations

```bash
# Run the central database migrations
php artisan migrate --path=database/migrations/central --force
```

### Step 2: Seed Feature Flags

```bash
php artisan db:seed --class=FeaturesSeeder
```

### Step 3: Verify Installation

```bash
php artisan tinker
```

```php
// Check features were created
Feature::count(); // Should be 3

// Check all are disabled by default
Feature::where('is_enabled_globally', true)->count(); // Should be 0
```

### Step 4: Test Frontend

1. Visit the home page
2. Verify "Programação" and "Turnos" cards are hidden
3. Create/edit a manufacturing route step
4. Verify timing options and form association are hidden

### Step 5: Enable Features (When Ready)

```php
// Enable production scheduler
$feature = Feature::where('key', 'production_scheduler')->first();
$feature->update(['is_enabled_globally' => true]);
app(FeatureService::class)->clearCache();

// Verify on home page - cards should now appear
```

---

## Integration with Stripe Plans

When Stripe integration is complete:

### Assign Features to Plans

```php
// Starter Plan - Basic features only
$starter = Plan::where('name', 'Starter')->first();
// No scheduler feature

// Professional Plan - Includes scheduler
$professional = Plan::where('name', 'Professional')->first();
$scheduler = Feature::where('key', 'production_scheduler')->first();

$professional->featureFlags()->attach($scheduler->id, [
    'is_enabled' => true,
    'configuration' => [
        'max_work_cells' => 50,
        'max_shifts' => 10,
    ]
]);

// Enterprise Plan - All features
$enterprise = Plan::where('name', 'Enterprise')->first();
$allFeatures = Feature::planBased()->get();

foreach ($allFeatures as $feature) {
    $enterprise->featureFlags()->attach($feature->id, [
        'is_enabled' => true,
        'configuration' => [] // Unlimited
    ]);
}
```

---

## Future Enhancements

1. **Admin UI**
   - Visual feature management
   - Plan assignment interface
   - Usage analytics

2. **Per-Tenant Overrides**
   - Allow specific tenants to have custom feature access
   - Useful for trials or special cases

3. **Feature Usage Tracking**
   - Log when features are accessed
   - Analytics on feature adoption

4. **Feature Dependencies**
   - Define dependencies between features
   - Automatically enable dependent features

5. **Time-Based Features**
   - Enable features at specific dates
   - Automatic rollouts

6. **A/B Testing**
   - Percentage-based rollouts
   - Split testing capabilities

---

## Troubleshooting

### Features Not Appearing After Enabling

**Solution:** Clear the cache
```php
app(FeatureService::class)->clearCache();

// Or clear all application cache
php artisan cache:clear
```

### Feature Check Returns False Despite Being Enabled

**Check:**
1. Is the feature global or plan-based?
2. Does the current tenant have an active subscription?
3. Does the plan include this feature?

```php
$account = tenant();
$subscription = $account->subscription('default');
$plan = $subscription->plan;

// Check plan features
$plan->featureFlags()->get();
```

### Middleware Blocking Access

**Check:**
1. Is the feature enabled?
2. Is the middleware applied correctly?
3. Check logs for specific error

```bash
tail -f storage/logs/laravel.log
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review code comments in:
   - `app/Services/FeatureService.php`
   - `resources/js/utils/features.ts`
3. Contact the development team

---

## Changelog

### Version 1.0 - November 13, 2025
- Initial implementation
- Created database schema
- Implemented FeatureService
- Created frontend hooks
- Seeded initial 3 features
- Updated UI components

---

**End of Documentation**

