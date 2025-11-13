# Feature Flags Troubleshooting Guide

**Last Updated:** November 13, 2025

---

## Quick Diagnostics

### 1. Check Feature Status

Run this command to see all feature flags and their current status:

```bash
php artisan features:status
```

Output example:
```
=== Feature Flags Status ===
production_scheduler: ✅ Enabled (Global)
production_forms_engine: ❌ Disabled (Global)
```

### 2. Clear Cache

If features aren't updating after changes:

```bash
php artisan features:status --clear-cache
```

Or manually in tinker:
```bash
php artisan tinker
```
```php
app(App\Services\FeatureService::class)->clearCache();
```

### 3. Check Browser Console

Open your browser console (F12) and look for feature flag logs:

```
[Feature Flag] { key: 'production_scheduler', isEnabled: true, allFeatures: {...} }
```

### 4. Check Laravel Logs

View the Laravel log for backend feature checks:

```bash
tail -f storage/logs/laravel.log | grep Feature
```

Look for entries like:
```
[FeatureService] Global enabled features: ["production_scheduler"]
[HandleInertiaRequests] Features being shared: {...}
```

---

## Common Issues

### Issue 1: Features Not Showing After Enabling

**Symptoms:**
- Enabled a feature in admin panel
- Feature still not visible in UI

**Solutions:**

1. **Clear Cache**
   ```bash
   php artisan features:status --clear-cache
   ```

2. **Hard Refresh Browser**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` or `Cmd+Shift+R`

3. **Check Browser Console**
   - Open DevTools (F12)
   - Look for `[Feature Flag]` logs
   - Verify `allFeatures` object contains your feature

4. **Verify Database**
   ```bash
   php artisan tinker
   ```
   ```php
   Feature::where('key', 'production_scheduler')->first()->is_enabled_globally
   // Should return: true
   ```

### Issue 2: Time Fields Not Showing in StepPropertiesPanel

**Requirements for time fields to appear:**

1. ✅ `production_scheduler` feature must be enabled
2. ✅ Step must have "Execução Interna" selected (not External)
3. ✅ A Work Cell must be selected

**Debug Steps:**

1. **Open Browser Console** and look for:
   ```
   [StepPropertiesPanel] Feature Flags: {
     hasScheduler: true,
     execution_location: 'internal'
   }
   ```

2. **Check execution location:**
   - Is "Execução Interna" button selected (blue)?
   - Or is "Execução Externa" selected?
   - Time fields ONLY show for internal execution

3. **Verify feature in frontend:**
   ```javascript
   // In browser console
   console.log(window.__INERTIA_PAGE__.props.features)
   // Should show: { production_scheduler: true }
   ```

### Issue 3: Scheduler Route Not Appearing on Home Page

**Check:**

1. **Feature is enabled:**
   ```bash
   php artisan features:status
   ```
   Should show: `production_scheduler: ✅ Enabled`

2. **Cache is cleared:**
   ```bash
   php artisan features:status --clear-cache
   ```

3. **Browser console shows feature:**
   ```javascript
   // In browser console on home page
   console.log(window.__INERTIA_PAGE__.props.features)
   ```

4. **Hard refresh browser**

### Issue 4: Features Not Passed to Frontend

**Symptoms:**
- Backend logs show features enabled
- Frontend logs show empty features object

**Solutions:**

1. **Check HandleInertiaRequests logs:**
   ```bash
   tail -f storage/logs/laravel.log | grep HandleInertiaRequests
   ```

2. **Verify tenant has subscription:**
   ```bash
   php artisan tinker
   ```
   ```php
   $account = tenant();
   $account->subscription('default')?->plan?->name
   ```

3. **Check for JavaScript errors:**
   - Open browser console
   - Look for any errors that might prevent feature loading

### Issue 5: Plan-Based Features Not Working

**Debug Steps:**

1. **Check if feature is plan-based:**
   ```php
   Feature::where('key', 'your_feature')->first()->is_global
   // Should return: false for plan-based features
   ```

2. **Check plan has feature assigned:**
   ```php
   $account = tenant();
   $subscription = $account->subscription('default');
   $plan = $subscription->plan;
   
   $plan->featureFlags()->get()
   // Should show features assigned to this plan
   ```

3. **Verify plan feature is enabled:**
   ```php
   $feature = Feature::where('key', 'your_feature')->first();
   $feature->isEnabledForPlan($plan)
   // Should return: true
   ```

---

## Debugging Commands

### Check All Features in Database
```bash
php artisan tinker
```
```php
Feature::all(['key', 'is_global', 'is_enabled_globally'])->each(function($f) {
    echo $f->key . ': ' . ($f->is_enabled_globally ? 'ON' : 'OFF') . PHP_EOL;
});
```

### Enable a Feature
```php
$feature = Feature::where('key', 'production_scheduler')->first();
$feature->update(['is_enabled_globally' => true]);
app(FeatureService::class)->clearCache();
```

### Check What Features a Tenant Sees
```php
$account = Account::first(); // Or tenant()
$service = app(FeatureService::class);
$features = $service->getEnabledFeatures($account);
print_r($features);
```

### Check Frontend Props
In browser console:
```javascript
// See all page props
console.log(window.__INERTIA_PAGE__.props)

// See just features
console.log(window.__INERTIA_PAGE__.props.features)

// Check specific feature
console.log(window.__INERTIA_PAGE__.props.features?.production_scheduler)
```

---

## Log Locations

### Laravel Logs
```bash
# Watch all logs
tail -f storage/logs/laravel.log

# Filter for feature-related logs
tail -f storage/logs/laravel.log | grep -i feature

# Filter for specific feature
tail -f storage/logs/laravel.log | grep production_scheduler
```

### Browser Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter for: `[Feature`
4. You should see:
   - `[Feature Flag]` - From useFeature hook
   - `[StepPropertiesPanel]` - From component

---

## Step-by-Step: Enable Scheduler and Verify

### Step 1: Enable Feature
```bash
# Option A: Via Admin UI
# Navigate to http://admin.localhost:8000/features
# Toggle "Production Scheduler" to ON

# Option B: Via Tinker
php artisan tinker
```
```php
Feature::where('key', 'production_scheduler')->first()->update(['is_enabled_globally' => true]);
app(FeatureService::class)->clearCache();
```

### Step 2: Verify in Database
```bash
php artisan features:status
```

Should show:
```
production_scheduler: ✅ Enabled
```

### Step 3: Clear All Caches
```bash
php artisan cache:clear
php artisan features:status --clear-cache
```

### Step 4: Check Backend Logs
```bash
tail -f storage/logs/laravel.log | grep Feature
```

Visit your tenant site and watch for logs like:
```
[FeatureService] Global enabled features: ["production_scheduler"]
[HandleInertiaRequests] Features being shared: {"production_scheduler":true}
```

### Step 5: Check Frontend
1. **Open tenant home page**: `http://your-tenant.localhost:8000/home`
2. **Open browser console** (F12)
3. **Look for logs:**
   ```
   [Feature Flag] { key: 'production_scheduler', isEnabled: true, ... }
   ```
4. **Verify "Programação" card appears** on home page
5. **Verify "Turnos" card appears** on home page

### Step 6: Test StepPropertiesPanel
1. **Go to planning page**: `/production/planning`
2. **Select a manufacturing order**
3. **Add/edit a step**
4. **Check browser console for:**
   ```
   [StepPropertiesPanel] Feature Flags: {
     hasScheduler: true,
     execution_location: 'internal'
   }
   ```
5. **Verify timing options appear** (if Internal Execution is selected)

---

## Expected Behavior When Scheduler is Enabled

### Home Page (`/home`)
- ✅ "Programação" card visible in Planejamento section
- ✅ "Turnos" card visible in Organização section

### Planning Page (`/production/planning`)
When editing a step with Internal Execution:
- ✅ "Tempo de Fabricação Específico" button visible
- ✅ "Utilizar Throughput Padrão da Célula" button visible
- ✅ Time input fields (Setup, Cycle) visible when specific time is selected

### Work Cells (`/production/work-cells`)
When creating/editing with Finite Capacity:
- ✅ "Turno" field visible

### Shifts Page
- ✅ Route accessible: `/asset-hierarchy/shifts`

---

## Still Having Issues?

### Run Full Diagnostic

```bash
# 1. Check database
php artisan features:status --clear-cache

# 2. Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 3. Check logs
tail -n 100 storage/logs/laravel.log | grep -i feature

# 4. Restart queue workers (if running)
php artisan queue:restart
```

### Verify in Tinker

```bash
php artisan tinker
```

```php
// 1. Check feature exists and is enabled
$feature = Feature::where('key', 'production_scheduler')->first();
echo "Enabled: " . ($feature->is_enabled_globally ? 'YES' : 'NO') . PHP_EOL;

// 2. Check service returns it
$service = app(FeatureService::class);
$features = $service->getEnabledFeatures();
echo "Features returned by service: " . json_encode($features) . PHP_EOL;

// 3. Clear cache
$service->clearCache();
echo "Cache cleared!" . PHP_EOL;
```

### Check Frontend Props

In browser console:
```javascript
// 1. Check page props
const props = window.__INERTIA_PAGE__.props;
console.log('Features:', props.features);

// 2. Check specific feature
console.log('Has scheduler?', props.features?.production_scheduler);

// 3. Reload page with cache cleared
location.reload(true);
```

---

## Contact Support

If none of the above works:

1. **Collect the following info:**
   - Output of `php artisan features:status`
   - Browser console logs (screenshot)
   - Laravel log excerpt (`tail -n 50 storage/logs/laravel.log`)
   - Page you're trying to access

2. **Share with development team**

---

## Quick Reference

### Enable Feature
```bash
php artisan tinker
Feature::where('key', 'production_scheduler')->first()->update(['is_enabled_globally' => true]);
app(FeatureService::class)->clearCache();
```

### Disable Feature
```bash
php artisan tinker
Feature::where('key', 'production_scheduler')->first()->update(['is_enabled_globally' => false]);
app(FeatureService::class)->clearCache();
```

### Check Status
```bash
php artisan features:status
```

### Clear Cache
```bash
php artisan features:status --clear-cache
```

### View Logs
```bash
tail -f storage/logs/laravel.log | grep -i feature
```

---

**End of Troubleshooting Guide**

