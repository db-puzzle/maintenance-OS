# Tenant Signup Troubleshooting & Fix

## Problem Summary

When attempting to create a new tenant via the signup form at `resources/js/pages/auth/signup.tsx`, the form submission was failing with a network error:

```
POST http://admin.maintenance-os.com:8000/register net::ERR_NAME_NOT_RESOLVED
```

### Root Cause

The issue was that:
1. The `route('register')` helper in the frontend was generating URLs based on the current request domain
2. When accessing the signup page from `admin.maintenance-os.com:8000` (or `admin.localhost:8000`), the helper would generate `http://admin.maintenance-os.com:8000/register`
3. The domain `admin.maintenance-os.com` doesn't resolve in DNS locally (unless added to `/etc/hosts`)
4. This caused a `ERR_NAME_NOT_RESOLVED` network error - the browser couldn't resolve the domain

### Why This Happened

The Laravel routing is configured correctly - the `/register` routes ARE defined for the admin subdomain in the `central_domains` config. However, for local development, these domains don't exist in DNS, causing the browser to fail before the request even reaches the Laravel application.

## Solution Implemented

### Frontend Changes (`resources/js/pages/auth/signup.tsx`)

Updated both the **subdomain check** and **form submission** to explicitly post to the central domain by stripping the `admin.` prefix from the hostname:

**Before:**
```typescript
post(route('register'), { ... });
router.post(checkUrl, { subdomain }, { ... });
```

**After:**
```typescript
// Build URLs using the central domain
const currentHost = window.location.hostname;
const protocol = window.location.protocol;
const port = window.location.port;
const baseDomain = currentHost.replace(/^admin\./, '');
const centralUrl = `${protocol}//${baseDomain}${port ? `:${port}` : ''}/register`;
const checkUrl = `${protocol}//${baseDomain}${port ? `:${port}` : ''}/check-subdomain`;

post(centralUrl, { ... });
router.post(checkUrl, { subdomain }, { ... });
```

This ensures:
- From `admin.localhost:8000` → posts to `localhost:8000`
- From `admin.maintenance-os.com:8000` → posts to `maintenance-os.com:8000`
- From `localhost:8000` → posts to `localhost:8000` (no change)

### Backend Changes (`app/Http/Controllers/Auth/TenantRegistrationController.php`)

Added comprehensive logging throughout the registration flow:

#### 1. Signup Page Access Logging
```php
\Log::info('📄 Signup page accessed', [
    'url' => request()->fullUrl(),
    'host' => request()->getHost(),
    'ip' => request()->ip(),
]);

\Log::info('📋 Plans loaded for signup', [
    'plan_count' => $plans->count(),
    'plans' => $plans->pluck('name', 'id')->toArray(),
]);
```

#### 2. Registration Request Logging
```php
\Log::info('🚀 Tenant registration request received', [
    'url' => $request->fullUrl(),
    'method' => $request->method(),
    'host' => $request->getHost(),
    'request_data' => $request->except(['admin_password', 'admin_password_confirmation']),
    'ip' => $request->ip(),
    'user_agent' => $request->userAgent(),
    'headers' => $request->headers->all(),
]);
```

#### 3. Validation Logging
```php
\Log::info('🔍 Starting validation...');
// ... validation code ...
\Log::info('✅ Validation passed', [ ... ]);
```

Or on failure:
```php
\Log::warning('⚠️ Validation failed', [
    'errors' => $e->errors(),
    'request_data' => $request->except(['admin_password', 'admin_password_confirmation']),
]);
```

#### 4. Tenant Creation Logging
```php
\Log::info('🏗️ Creating tenant account...');
\Log::info('✅ Tenant created', ['tenant_id' => $account->id, 'subdomain' => $account->subdomain]);
\Log::info('📝 Creating subscription...');
\Log::info('✅ Subscription created');
\Log::info('🎉 Tenant registration completed successfully', ['account_id' => $account->id]);
```

#### 5. Enhanced Error Logging
```php
\Log::error('💥 Tenant registration failed', [
    'error' => $e->getMessage(),
    'error_class' => get_class($e),
    'file' => $e->getFile(),
    'line' => $e->getLine(),
    'trace' => $e->getTraceAsString(),
    'request_data' => $request->except(['admin_password', 'admin_password_confirmation']),
]);
```

## Testing Instructions

### 1. Clear Previous Logs
```bash
echo "" > storage/logs/laravel.log
```

### 2. Access Signup Page
Navigate to either:
- `http://localhost:8000/register`
- `http://admin.localhost:8000/register` (if configured in /etc/hosts)

Check the logs - you should see:
```
[timestamp] local.INFO: 📄 Signup page accessed
[timestamp] local.INFO: 📋 Plans loaded for signup
```

### 3. Check Subdomain Availability
Enter a subdomain and click "Check Availability"

Check the logs - you should see:
```
[timestamp] local.INFO: 🔍 Subdomain availability check {"subdomain":"yoursubdomain",...}
[timestamp] local.INFO: ✅ Subdomain is available (or ❌ Subdomain is taken)
```

### 4. Submit Registration Form
Fill out all fields and click "Create Account"

Check the logs - you should see the complete flow:
```
[timestamp] local.INFO: 🚀 Tenant registration request received
[timestamp] local.INFO: 🔍 Starting validation...
[timestamp] local.INFO: ✅ Validation passed
[timestamp] local.INFO: 🏗️ Creating tenant account...
[timestamp] local.INFO: ✅ Tenant created
[timestamp] local.INFO: 📝 Creating subscription...
[timestamp] local.INFO: ✅ Subscription created
[timestamp] local.INFO: 🎉 Tenant registration completed successfully
[timestamp] local.INFO: 🔀 Redirecting to tenant domain
```

### 5. Browser Console
Check the browser console for frontend logs:
```
🔍 Checking subdomain availability at: http://localhost:8000/check-subdomain
✅ Subdomain check response: {...}
🚀 Form submission started
📋 Form data: {...}
🌐 Current host: admin.localhost (or localhost)
🎯 Central domain: localhost
🔗 Posting to: http://localhost:8000/register
⏳ Request started...
✅ Registration successful! (or error details)
🏁 Request finished
```

## Expected Results

1. **Subdomain check** - Should work from any domain (admin.localhost or localhost)
2. **Form submission** - Should successfully create tenant and redirect
3. **Logs** - Should show complete flow with emoji markers for easy tracking
4. **No DNS errors** - Should not see `ERR_NAME_NOT_RESOLVED` anymore

## Common Issues & Solutions

### Issue: Still getting DNS errors
**Solution:** Clear browser cache and hard reload (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Issue: No logs appearing
**Solution:** 
- Check that Laravel logging is configured correctly
- Verify `storage/logs/laravel.log` is writable
- Try `tail -f storage/logs/laravel.log` to watch in real-time

### Issue: Validation failing
**Solution:** Check the `⚠️ Validation failed` log entry - it will show exactly which fields failed and why

### Issue: Database errors
**Solution:** Check the detailed error logs - they now include the error class, file, line number, and full stack trace

## Configuration Notes

### Current Config Values
- `app.domain`: `localhost`
- `app.url`: `http://localhost:8000`
- `tenancy.central_domains`: 
  - `localhost`
  - `maintenance-os.com`
  - `www.maintenance-os.com`
  - `admin.maintenance-os.com`

### For Production
In production, all these domains will resolve correctly in DNS, so the subdomain stripping logic will have no effect - it will work transparently whether accessed from the admin subdomain or the main domain.

## Files Modified

1. `resources/js/pages/auth/signup.tsx` - Frontend form submission and subdomain check
2. `app/Http/Controllers/Auth/TenantRegistrationController.php` - Backend logging
3. `docs/MultiTenancy/SIGNUP_TROUBLESHOOTING_FIX.md` - This documentation

## Additional Notes

The `SubdomainCheckController` already had good logging in place, so no changes were needed there.

All browser errors related to chrome extensions (runtime.lastError, content_script.js errors) are unrelated to this issue and can be ignored - they're just browser extension noise.

