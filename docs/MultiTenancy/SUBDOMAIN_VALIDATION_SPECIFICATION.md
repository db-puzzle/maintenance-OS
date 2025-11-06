# Subdomain Validation & Error Handling Specification

## Overview

This specification outlines the implementation of real-time subdomain availability checking and comprehensive error handling for the tenant registration process.

### Key Architectural Decisions

1. **Inertia-Only Communication**: All backend communication uses Inertia.js (no separate API endpoints or AJAX calls)
2. **Shadcn Components**: Uses existing Shadcn UI components (Button, Input, Label, etc.)
3. **Flash Data Pattern**: Subdomain check results are passed via Laravel flash/session data and accessed through `usePage().props`
4. **Type Safety**: Full TypeScript typing for all components and data structures

## Problem Statement

Currently, when a user attempts to register a tenant with a subdomain that already exists, they encounter:

1. **Unfriendly Error**: Database constraint violation error (`SQLSTATE[23505]: Unique violation`)
2. **Poor UX**: No pre-submission validation of subdomain availability
3. **Unclear Feedback**: Technical error messages that don't guide the user toward resolution

## Solution Requirements

### Functional Requirements

1. **Subdomain Availability Check**
   - Provide a "Check Availability" button adjacent to the subdomain input field
   - Display clear visual feedback indicating:
     - Available (green checkmark)
     - Taken (red X with message)
     - Checking (loading spinner)
     - Error checking (warning icon)
   - Prevent form submission until subdomain availability is confirmed

2. **Enhanced Error Handling**
   - Catch database constraint violations before they reach the user
   - Provide user-friendly error messages for all failure scenarios
   - Display errors inline with the relevant form field
   - Maintain form state on error (don't clear user input)

3. **Validation Rules**
   - Subdomain format validation (lowercase, alphanumeric, hyphens only)
   - Length constraints (3-63 characters)
   - Reserved subdomain detection (admin, api, www, etc.)
   - Real-time format validation as user types

### Non-Functional Requirements

1. **Performance**: Availability check should complete within 500ms under normal conditions
2. **Security**: Prevent enumeration attacks (rate limiting on availability checks)
3. **Mobile Responsive**: Touch-friendly button sizing and layout
4. **Inertia-Only**: All communication must use Inertia.js (no separate API endpoints)

---

## Technical Specification

### Backend Implementation

#### 1. Inertia Route: Subdomain Availability Check

**Route**: `POST /check-subdomain`

**Location**: `routes/web.php`

**Controller**: `App\Http\Controllers\Auth\SubdomainCheckController`

**Method**: Returns an Inertia response with check results in flash/session data

**Request Data**:
```php
[
    'subdomain' => 'acme'
]
```

**Response Pattern (Inertia)**:
The controller will return `back()` with flashed data that Inertia automatically makes available in props:

**Available**:
```php
return back()->with([
    'subdomainCheck' => [
        'available' => true,
        'message' => 'This subdomain is available',
        'subdomain' => 'acme'
    ]
]);
```

**Taken**:
```php
return back()->with([
    'subdomainCheck' => [
        'available' => false,
        'message' => 'This subdomain is already taken',
        'subdomain' => 'acme'
    ]
]);
```

**Invalid Format**:
```php
return back()->withErrors([
    'subdomain' => 'Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only'
]);
```

**Reserved**:
```php
return back()->with([
    'subdomainCheck' => [
        'available' => false,
        'message' => 'This subdomain is reserved and cannot be used',
        'subdomain' => 'admin'
    ]
]);
```

#### 2. Controller Implementation

**File**: `app/Http/Controllers/Auth/SubdomainCheckController.php`

**Methods**:
- `check(Request $request)`: Main handler returning Inertia response
- `isAvailable(string $subdomain)`: Business logic for availability check
- `isReserved(string $subdomain)`: Check against reserved list

**Implementation Example**:
```php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;

class SubdomainCheckController extends Controller
{
    protected array $reservedSubdomains = [
        'admin', 'api', 'app', 'www', 'mail', 'ftp', 'localhost',
        'staging', 'dev', 'test', 'demo', 'support', 'help',
        'docs', 'blog', 'cdn', 'static', 'assets', 'media',
        'files', 'download', 'uploads',
    ];

    public function check(Request $request)
    {
        $validated = $request->validate([
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'regex:/^[a-z0-9-]+$/',
                'not_regex:/^-|-$/',
                'not_regex:/--/',
            ]
        ], [
            'subdomain.regex' => 'Only lowercase letters, numbers, and hyphens allowed',
            'subdomain.not_regex' => 'Cannot start/end with hyphen or have consecutive hyphens',
        ]);

        $subdomain = $validated['subdomain'];

        // Check if reserved
        if ($this->isReserved($subdomain)) {
            return back()->with([
                'subdomainCheck' => [
                    'available' => false,
                    'message' => 'This subdomain is reserved and cannot be used',
                    'subdomain' => $subdomain
                ]
            ]);
        }

        // Check if available
        $available = $this->isAvailable($subdomain);

        return back()->with([
            'subdomainCheck' => [
                'available' => $available,
                'message' => $available 
                    ? 'This subdomain is available!' 
                    : 'This subdomain is already taken',
                'subdomain' => $subdomain
            ]
        ]);
    }

    protected function isAvailable(string $subdomain): bool
    {
        return !Account::on('central')
            ->where('subdomain', $subdomain)
            ->exists();
    }

    protected function isReserved(string $subdomain): bool
    {
        return in_array(strtolower($subdomain), $this->reservedSubdomains);
    }
}
```

**Validation Rules**:
```php
[
    'subdomain' => [
        'required',
        'string',
        'min:3',
        'max:63',
        'regex:/^[a-z0-9-]+$/',
        'not_regex:/^-|-$/', // Cannot start or end with hyphen
        'not_regex:/--/', // Cannot have consecutive hyphens
    ]
]
```

**Reserved Subdomains List**:
```php
protected array $reservedSubdomains = [
    'admin',
    'api',
    'app',
    'www',
    'mail',
    'ftp',
    'localhost',
    'staging',
    'dev',
    'test',
    'demo',
    'support',
    'help',
    'docs',
    'blog',
    'cdn',
    'static',
    'assets',
    'media',
    'files',
    'download',
    'uploads',
];
```

#### 3. Rate Limiting

**Configuration**: `bootstrap/app.php`

```php
// Add rate limiter for subdomain checks
RateLimiter::for('subdomain-check', function (Request $request) {
    return Limit::perMinute(10)->by($request->ip());
});
```

**Apply to Route** in `routes/web.php`:
```php
Route::post('/check-subdomain', [SubdomainCheckController::class, 'check'])
    ->middleware(['throttle:subdomain-check'])
    ->name('subdomain.check');
```

**Rate Limit Handling**:
When rate limit is exceeded, Laravel will automatically return a 429 response. Inertia will handle this, and we can catch it in the `onError` callback on the frontend.

#### 4. Enhanced Error Handling in TenantRegistrationController

**File**: `app/Http/Controllers/Auth/TenantRegistrationController.php`

**Updates to `store()` method**:

```php
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

public function store(Request $request)
{
    try {
        // Existing validation and creation logic...
        
        $account = Account::create([...]);
        
        // Success response...
        
    } catch (UniqueConstraintViolationException $e) {
        \Log::error('Subdomain already exists', [
            'subdomain' => $validated['subdomain'],
            'error' => $e->getMessage()
        ]);
        
        return back()->withErrors([
            'subdomain' => 'This subdomain is already taken. Please choose another one.'
        ])->withInput();
        
    } catch (\Exception $e) {
        \Log::error('Tenant registration failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return back()->withErrors([
            'general' => 'An error occurred while creating your account. Please try again or contact support if the problem persists.'
        ])->withInput();
    }
}
```

#### 5. Form Request Validation

**File**: `app/Http/Requests/TenantRegistrationRequest.php` (new)

```php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TenantRegistrationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'regex:/^[a-z0-9-]+$/',
                'not_regex:/^-|-$/',
                'not_regex:/--/',
                Rule::unique('accounts', 'subdomain')
                    ->usingConnection('central'),
            ],
            'plan_id' => ['required', 'exists:plans,id'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
            'terms_accepted' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'subdomain.required' => 'Please enter a subdomain for your account.',
            'subdomain.min' => 'Subdomain must be at least 3 characters.',
            'subdomain.max' => 'Subdomain cannot exceed 63 characters.',
            'subdomain.regex' => 'Subdomain can only contain lowercase letters, numbers, and hyphens.',
            'subdomain.not_regex' => 'Subdomain cannot start or end with a hyphen, or contain consecutive hyphens.',
            'subdomain.unique' => 'This subdomain is already taken. Please choose another one.',
            'terms_accepted.accepted' => 'You must accept the terms of service to continue.',
        ];
    }
}
```

---

### Frontend Implementation

#### 1. Component State Management

**File**: `resources/js/pages/auth/signup.tsx`

**Required Imports**:
```typescript
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { CheckCircle2, XCircle, AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
```

**Page Props Type** (add to existing types):
```typescript
type SignupPageProps = {
    plans: Plan[];
    subdomainCheck?: {
        available: boolean;
        message: string;
        subdomain: string;
    };
};
```

**New State Variables**:
```typescript
const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
    lastChecked: string;
}>({
    checking: false,
    available: null,
    message: '',
    lastChecked: ''
});

// Get flash data from Inertia
const { subdomainCheck } = usePage<SignupPageProps>().props;
```

**Effect to Handle Inertia Flash Data**:
```typescript
useEffect(() => {
    if (subdomainCheck) {
        setSubdomainStatus({
            checking: false,
            available: subdomainCheck.available,
            message: subdomainCheck.message,
            lastChecked: subdomainCheck.subdomain
        });
    }
}, [subdomainCheck]);
```

#### 2. Subdomain Availability Check Function

```typescript
const checkSubdomainAvailability = () => {
    const subdomain = data.subdomain.trim();
    
    // Validate format first (client-side pre-check)
    if (!subdomain || subdomain.length < 3) {
        setSubdomainStatus({
            checking: false,
            available: false,
            message: 'Subdomain must be at least 3 characters',
            lastChecked: ''
        });
        return;
    }
    
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        setSubdomainStatus({
            checking: false,
            available: false,
            message: 'Only lowercase letters, numbers, and hyphens allowed',
            lastChecked: ''
        });
        return;
    }
    
    // Set checking state
    setSubdomainStatus({
        checking: true,
        available: null,
        message: 'Checking availability...',
        lastChecked: ''
    });
    
    // Use Inertia router to make request
    router.post(
        route('subdomain.check'),
        { subdomain },
        {
            preserveState: true,
            preserveScroll: true,
            only: ['subdomainCheck', 'errors'],
            onError: (errors) => {
                // Handle validation errors
                setSubdomainStatus({
                    checking: false,
                    available: false,
                    message: errors.subdomain || 'Error checking availability',
                    lastChecked: ''
                });
            },
            onFinish: () => {
                // The useEffect hook will handle the response via subdomainCheck prop
            }
        }
    );
};
```

#### 3. UI Component Updates (Using Shadcn Components)

**Subdomain Field with Check Button**:

Replace the existing subdomain field section with:

```tsx
{/* Subdomain Selection */}
<div className="grid gap-2">
    <Label htmlFor="subdomain">Choose Your Subdomain</Label>
    <div className="flex gap-2">
        <div className="flex flex-1">
            <Input
                id="subdomain"
                type="text"
                required
                tabIndex={2}
                value={data.subdomain}
                onChange={(e) => {
                    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setData('subdomain', newValue);
                    // Reset availability status when user changes input
                    if (subdomainStatus.lastChecked !== newValue) {
                        setSubdomainStatus({
                            checking: false,
                            available: null,
                            message: '',
                            lastChecked: ''
                        });
                    }
                }}
                disabled={processing}
                placeholder="acme"
                className={cn(
                    "rounded-r-none",
                    subdomainStatus.available === true && "border-green-500 focus-visible:ring-green-500",
                    subdomainStatus.available === false && "border-red-500 focus-visible:ring-red-500"
                )}
            />
            <span className="border-input bg-muted text-muted-foreground inline-flex items-center rounded-r-md border border-l-0 px-3 text-sm">
                .{appDomain}
            </span>
        </div>
        <Button
            type="button"
            variant="outline"
            onClick={checkSubdomainAvailability}
            disabled={processing || subdomainStatus.checking || !data.subdomain || data.subdomain.length < 3}
            className="shrink-0"
        >
            {subdomainStatus.checking ? (
                <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                </>
            ) : subdomainStatus.available === true ? (
                <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    Available
                </>
            ) : subdomainStatus.available === false ? (
                <>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Taken
                </>
            ) : (
                'Check Availability'
            )}
        </Button>
    </div>
    
    {/* Status Message */}
    {subdomainStatus.message && (
        <p className={cn(
            "text-sm",
            subdomainStatus.available === true && "text-green-600",
            subdomainStatus.available === false && "text-red-600",
            subdomainStatus.available === null && "text-muted-foreground"
        )}>
            {subdomainStatus.message}
        </p>
    )}
    
    <InputError message={errors.subdomain} />
    
    <p className="text-muted-foreground text-xs">
        Your subdomain can only contain lowercase letters, numbers, and hyphens (3-63 characters).
    </p>
</div>
```

#### 4. Submit Button Logic Update

```tsx
<Button
    type="submit"
    className="mt-2 w-full"
    tabIndex={8}
    disabled={
        processing || 
        !data.terms_accepted || 
        subdomainStatus.available !== true || // Must verify subdomain first
        subdomainStatus.lastChecked !== data.subdomain // Subdomain changed after check
    }
>
    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
    {processing ? 'Creating your account...' : 'Create Account'}
</Button>
```

#### 5. General Error Display (Using Shadcn Alert)

Add this before the form if there are general errors:

```tsx
{/* General Error Messages */}
{errors.general && (
    <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">
                    Registration Failed
                </h3>
                <p className="text-sm">
                    {errors.general}
                </p>
            </div>
        </div>
    </div>
)}
```

---

## Implementation Plan

### Phase 1: Backend Setup (Priority: High)

1. **Create SubdomainCheckController**
   - [ ] Generate controller: `php artisan make:controller Auth/SubdomainCheckController`
   - [ ] Implement `check()` method with validation
   - [ ] Add reserved subdomain list
   - [ ] Implement rate limiting

2. **Create TenantRegistrationRequest**
   - [ ] Generate form request: `php artisan make:request TenantRegistrationRequest`
   - [ ] Add validation rules and custom messages
   - [ ] Update controller to use form request

3. **Update TenantRegistrationController**
   - [ ] Add try-catch for UniqueConstraintViolationException
   - [ ] Improve error logging
   - [ ] Return user-friendly error messages

4. **Add Route**
   - [ ] Add subdomain check route
   - [ ] Apply rate limiting middleware
   - [ ] Test route functionality

### Phase 2: Frontend Implementation (Priority: High)

1. **Update signup.tsx State Management**
   - [ ] Add `subdomainStatus` state
   - [ ] Implement `checkSubdomainAvailability()` function
   - [ ] Add subdomain change handler to reset status

2. **Update UI Components**
   - [ ] Add "Check Availability" button
   - [ ] Implement status indicators (icons, colors)
   - [ ] Add status message display
   - [ ] Update submit button disable logic

3. **Add General Error Display**
   - [ ] Create error alert component
   - [ ] Display general errors above form
   - [ ] Maintain form state on errors

4. **Import Required Icons**
   - [ ] Add CheckCircle2, XCircle, AlertCircle imports

### Phase 3: Testing (Priority: High)

1. **Backend Tests**
   - [ ] Test subdomain availability check with various inputs
   - [ ] Test rate limiting behavior
   - [ ] Test reserved subdomain blocking
   - [ ] Test format validation rules
   - [ ] Test duplicate subdomain handling in registration

2. **Frontend Tests**
   - [ ] Test check button functionality
   - [ ] Test status display for all states
   - [ ] Test submit button enable/disable logic
   - [ ] Test error message display
   - [ ] Test subdomain input changes after check

3. **Integration Tests**
   - [ ] Test complete registration flow
   - [ ] Test error scenarios
   - [ ] Test rate limiting from UI

### Phase 4: Polish & Documentation (Priority: Medium)

1. **Performance**
   - [ ] Add debounce to availability check (optional)
   - [ ] Optimize database query for subdomain check
   - [ ] Add caching for reserved subdomain list

2. **Documentation**
   - [ ] Update user documentation
   - [ ] Add code comments
   - [ ] Document rate limiting configuration

3. **User Experience**
   - [ ] Test on various screen sizes
   - [ ] Verify loading states are clear
   - [ ] Test keyboard navigation flows

---

## Error Scenarios & Handling

| Scenario | User Feedback | Technical Action |
|----------|---------------|------------------|
| Subdomain taken | "This subdomain is already taken" (red) | Query `accounts` table |
| Reserved subdomain | "This subdomain is reserved and cannot be used" (red) | Check against reserved list |
| Invalid format | "Only lowercase letters, numbers, and hyphens allowed" (red) | Regex validation |
| Too short | "Subdomain must be at least 3 characters" (red) | Length validation |
| Too long | "Subdomain cannot exceed 63 characters" (red) | Length validation |
| Rate limit exceeded | "Too many requests. Please try again in a moment." | Return 429 status |
| Network error | "Error checking availability. Please try again." | Catch exception |
| Database error during registration | "An error occurred while creating your account. Please contact support." | Log error, show generic message |

---

## Security Considerations

1. **Rate Limiting**: Prevent subdomain enumeration attacks
2. **Input Validation**: Strict format validation on both client and server
3. **Reserved List**: Prevent registration of system/sensitive subdomains
4. **Error Messages**: Don't expose system internals in error messages
5. **Logging**: Log all registration attempts and errors for security monitoring

---

## Mobile Responsiveness

1. **Button Sizing**: Minimum touch target of 44x44px
2. **Layout**: Stack button below input on small screens if needed
3. **Typography**: Ensure status messages are readable on small screens
4. **Loading States**: Clear visual feedback during checks on mobile

---

## Future Enhancements (Optional)

1. **Auto-check on blur**: Check availability when user leaves subdomain field
2. **Subdomain suggestions**: Suggest available alternatives if chosen subdomain is taken
3. **Debounced real-time check**: Check as user types (with debounce)
4. **Availability history**: Remember recently checked subdomains in session
5. **Premium subdomain reservations**: Allow certain subdomains to be reserved for premium plans

---

## Success Metrics

1. **Reduced Error Rate**: < 1% of registrations should fail with database errors
2. **User Completion**: Improved completion rate of registration form
3. **Support Tickets**: Reduced subdomain-related support requests
4. **Performance**: Availability check completes in < 500ms (p95)
5. **User Satisfaction**: Positive feedback on registration experience

---

## Appendix

### Database Schema Reference

**Table**: `accounts` (Central Database)

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    trial_ends_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX accounts_subdomain_unique ON accounts(subdomain);
```

### Example Inertia Flash Responses

**Success - Available**:
```php
// In controller:
return back()->with([
    'subdomainCheck' => [
        'available' => true,
        'message' => 'acme is available!',
        'subdomain' => 'acme'
    ]
]);

// Available in React component via usePage():
const { subdomainCheck } = usePage().props;
// subdomainCheck.available === true
```

**Error - Rate Limited**:
Laravel will automatically handle rate limiting. The frontend will receive an error in the `onError` callback.

### Testing Checklist

- [ ] Valid available subdomain shows green checkmark
- [ ] Taken subdomain shows red X and message
- [ ] Reserved subdomain (e.g., "admin") is blocked
- [ ] Invalid characters are rejected
- [ ] Too short subdomain (< 3 chars) is rejected
- [ ] Too long subdomain (> 63 chars) is rejected
- [ ] Rate limiting works after 10 requests
- [ ] Submit button disabled until subdomain verified
- [ ] Changing subdomain after check disables submit
- [ ] Database constraint violation shows friendly error
- [ ] Form data persists after error
- [ ] Loading states display correctly
- [ ] Mobile layout is usable
- [ ] Inertia communication works properly (no API calls)
- [ ] Error messages appear inline with fields

