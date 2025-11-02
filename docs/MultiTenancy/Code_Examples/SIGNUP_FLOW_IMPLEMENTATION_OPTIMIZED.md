# Multi-Tenant Signup Flow - Optimized with Laravel Tenancy

## Overview

This document provides a simplified signup flow implementation that leverages Laravel Tenancy's automatic features. By using the package's built-in functionality, we eliminate hundreds of lines of custom code while improving reliability.

## Key Optimizations

1. **Automatic Database Creation**: No custom database service needed
2. **Event-Driven Flow**: Use package events instead of jobs
3. **Built-in Domain Management**: Package handles domain associations
4. **Simplified Validation**: Let the package handle uniqueness

## Frontend Components

### Simplified Signup Page

```tsx
// resources/js/pages/auth/signup.tsx
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import TextInput from '@/components/ui/text-input';
import Button from '@/components/ui/button';
import { createFormAdapter } from '@/utils/form-adapters';

interface SignupPageProps {
    plans: Plan[];
}

export default function SignupPage({ plans }: SignupPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        company_name: '',
        subdomain: '',
        plan_id: plans[0]?.id,
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
        terms_accepted: false,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        post('/register', {
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    return (
        <AuthLayout>
            <div className="mx-auto w-full max-w-md">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold">Create Your Account</h2>
                    <p className="mt-2 text-gray-600">
                        Start your 30-day free trial
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <TextInput
                        form={formAdapter}
                        name="company_name"
                        label="Company Name"
                        placeholder="Acme Corporation"
                        required
                        autoFocus
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Choose Your Subdomain
                        </label>
                        <div className="flex">
                            <input
                                type="text"
                                value={data.subdomain}
                                onChange={(e) => setData('subdomain', e.target.value.toLowerCase())}
                                placeholder="acme"
                                className="flex-1 rounded-l-md border-gray-300"
                                required
                            />
                            <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                                .{window.location.hostname}
                            </span>
                        </div>
                        {errors.subdomain && (
                            <p className="mt-1 text-sm text-red-600">{errors.subdomain}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Your Plan
                        </label>
                        <div className="space-y-2">
                            {plans.map((plan) => (
                                <label
                                    key={plan.id}
                                    className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer ${
                                        data.plan_id === plan.id
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div>
                                        <input
                                            type="radio"
                                            name="plan"
                                            value={plan.id}
                                            checked={data.plan_id === plan.id}
                                            onChange={() => setData('plan_id', plan.id)}
                                            className="sr-only"
                                        />
                                        <div className="font-medium">{plan.name}</div>
                                        <div className="text-sm text-gray-600">
                                            ${plan.price}/month after trial
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                        <TextInput
                            form={formAdapter}
                            name="admin_name"
                            label="Your Name"
                            placeholder="John Doe"
                            required
                        />

                        <TextInput
                            form={formAdapter}
                            name="admin_email"
                            type="email"
                            label="Email Address"
                            placeholder="john@example.com"
                            required
                        />

                        <TextInput
                            form={formAdapter}
                            name="admin_password"
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            required
                        />

                        <TextInput
                            form={formAdapter}
                            name="admin_password_confirmation"
                            type="password"
                            label="Confirm Password"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={data.terms_accepted}
                                onChange={(e) => setData('terms_accepted', e.target.checked)}
                                className="rounded border-gray-300"
                                required
                            />
                            <span className="ml-2 text-sm">
                                I agree to the{' '}
                                <Link href="/terms" className="text-indigo-600">
                                    Terms of Service
                                </Link>
                            </span>
                        </label>
                        {errors.terms_accepted && (
                            <p className="mt-1 text-sm text-red-600">{errors.terms_accepted}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={processing || !data.terms_accepted}
                        loading={isLoading}
                    >
                        {isLoading ? 'Creating your account...' : 'Create Account'}
                    </Button>

                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link href="/login" className="text-indigo-600">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </AuthLayout>
    );
}
```

## Backend Implementation

### Simplified Registration Controller

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Central\Plan;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TenantRegistrationController extends Controller
{
    public function create(): Response
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('auth/signup', [
            'plans' => $plans,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'not_in:www,admin,api,app,mail,ftp,blog,help,support',
                Rule::unique('domains', 'domain'), // Simple unique check
            ],
            'plan_id' => ['required', 'exists:plans,id'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'string', 'email', 'max:255'],
            'admin_password' => ['required', 'confirmed', Password::defaults()],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        // Single transaction - let the package handle the complexity!
        $account = DB::transaction(function () use ($validated) {
            // Create tenant - database operations happen automatically!
            $tenant = Account::create([
                'name' => $validated['company_name'],
                'subdomain' => $validated['subdomain'],
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'metadata' => [
                    'admin_email' => $validated['admin_email'],
                    'admin_name' => $validated['admin_name'],
                    'admin_password' => bcrypt($validated['admin_password']),
                ],
            ]);
            
            // Domain created automatically via model event
            // Database created automatically by package
            // Migrations run automatically
            // Seeding happens automatically
            
            // Create subscription
            $tenant->subscription()->create([
                'plan_id' => $validated['plan_id'],
                'status' => 'trialing',
                'trial_ends_at' => $tenant->trial_ends_at,
            ]);
            
            return $tenant;
        });
        
        // Fire registered event for any additional processing
        event(new Registered($account));
        
        // Redirect to tenant domain
        $domain = $account->domains()->first();
        return redirect()->away('https://' . $domain->domain)
            ->with('success', 'Welcome! Your account is being set up.');
    }
}
```

### Model Events for Automatic Processing

```php
<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Account extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;
    
    protected static function booted()
    {
        // Create domain automatically when account is created
        static::created(function (Account $account) {
            $account->domains()->create([
                'domain' => $account->subdomain . '.' . config('app.domain'),
            ]);
        });
    }
    
    // Package handles database creation automatically!
    // No custom methods needed!
}
```

### Event Listeners for Post-Registration

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Stancl\Tenancy\Events;
use App\Mail\WelcomeTenantMail;
use App\Notifications\AdminNotification;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        // Listen to package events for post-registration actions
        Events\TenantCreated::class => [
            \App\Listeners\SendWelcomeEmail::class,
            \App\Listeners\NotifyAdminOfNewTenant::class,
        ],
        
        Events\DatabaseSeeded::class => [
            \App\Listeners\SendTenantReadyEmail::class,
        ],
    ];
}

// Simple event listeners
namespace App\Listeners;

use Stancl\Tenancy\Events\TenantCreated;
use App\Mail\WelcomeTenantMail;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail
{
    public function handle(TenantCreated $event): void
    {
        $tenant = $event->tenant;
        
        // Queue email to be sent after database is ready
        dispatch(function () use ($tenant) {
            Mail::to($tenant->metadata['admin_email'])
                ->send(new WelcomeTenantMail($tenant));
        })->delay(now()->addSeconds(30));
    }
}

class SendTenantReadyEmail  
{
    public function handle($event): void
    {
        $tenant = $event->tenant;
        
        Mail::to($tenant->metadata['admin_email'])
            ->send(new TenantReadyMail($tenant));
    }
}
```

### Domain Validation - Simplified Approach

Trust Laravel Tenancy's middleware to handle domain validation at runtime:

```php
// In your controller validation - minimal approach
'subdomain' => [
    'required',
    'string',
    'min:3',
    'max:63',
    'not_in:www,admin,api,app,mail,ftp',   // Reserved list only
    Rule::unique('domains', 'domain'),     // Simple unique check
],

// That's it! The package handles everything else:
// - InitializeTenancyBySubdomain validates domains when accessed
// - Automatic 404 for non-existent domains
// - No DNS validation needed (package handles it)
// - No complex regex patterns
// - No manual existence checks
```

## Database Seeding

### TenantDatabaseSeeder (Automatic Context)

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Package has already switched to tenant context!
        
        // Create roles
        $adminRole = Role::create(['name' => 'administrator']);
        $userRole = Role::create(['name' => 'user']);
        
        // Create admin user from metadata
        $tenant = tenant(); // Helper function to get current tenant
        
        $admin = User::create([
            'name' => $tenant->metadata['admin_name'],
            'email' => $tenant->metadata['admin_email'],
            'password' => $tenant->metadata['admin_password'], // Already hashed
            'email_verified_at' => now(),
        ]);
        
        $admin->assignRole($adminRole);
        
        // Clear sensitive data
        $metadata = $tenant->metadata;
        unset($metadata['admin_password']);
        $tenant->update(['metadata' => $metadata]);
        
        // Seed other data
        $this->call([
            UnitsOfMeasureSeeder::class,
            DefaultSettingsSeeder::class,
        ]);
    }
}
```

## Email Templates

### Welcome Email (Simple)

```php
<?php

namespace App\Mail;

use App\Models\Account;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeTenantMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Account $account
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Maintenance OS!',
        );
    }

    public function content(): Content
    {
        $domain = $this->account->domains()->first();
        
        return new Content(
            markdown: 'emails.welcome-tenant',
            with: [
                'accountName' => $this->account->name,
                'loginUrl' => 'https://' . $domain->domain . '/login',
                'trialDays' => 30,
            ],
        );
    }
}
```

## Error Handling

### Simple Error Handling

```php
// In App\Exceptions\Handler

public function render($request, Throwable $exception)
{
    // Handle subdomain taken edge case
    if ($exception instanceof \Illuminate\Database\QueryException) {
        if ($exception->errorInfo[0] === '23505') { // Unique violation
            if (str_contains($exception->getMessage(), 'accounts_subdomain_unique')) {
                return back()
                    ->withInput()
                    ->withErrors(['subdomain' => 'This subdomain was just taken. Please try another.']);
            }
        }
    }
    
    return parent::render($request, $exception);
}
```

## Testing

### Feature Tests

```php
<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\Central\Plan;
use App\Models\Account;
use Stancl\Tenancy\Events;
use Illuminate\Support\Facades\Event;

class TenantRegistrationTest extends TestCase
{
    public function test_registration_creates_everything_automatically()
    {
        Event::fake([
            Events\TenantCreated::class,
            Events\DatabaseCreated::class,
            Events\DatabaseMigrated::class,
            Events\DatabaseSeeded::class,
        ]);
        
        $plan = Plan::factory()->create();
        
        $response = $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => $plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@test.com',
            'admin_password' => 'password',
            'admin_password_confirmation' => 'password',
            'terms_accepted' => true,
        ]);
        
        // All events fired automatically
        Event::assertDispatched(Events\TenantCreated::class);
        Event::assertDispatched(Events\DatabaseCreated::class);
        Event::assertDispatched(Events\DatabaseMigrated::class);
        Event::assertDispatched(Events\DatabaseSeeded::class);
        
        $tenant = Account::where('subdomain', 'testcompany')->first();
        $this->assertNotNull($tenant);
        
        // Verify admin can login on tenant domain
        $tenant->run(function () {
            $this->assertDatabaseHas('users', [
                'email' => 'admin@test.com',
            ]);
        });
    }
    
    public function test_validation_rules()
    {
        $plan = Plan::factory()->create();
        
        // Test reserved subdomain
        $response = $this->post('/register', [
            'company_name' => 'Test',
            'subdomain' => 'admin',
            'plan_id' => $plan->id,
            'admin_name' => 'Test',
            'admin_email' => 'test@test.com',
            'admin_password' => 'password',
            'admin_password_confirmation' => 'password',
            'terms_accepted' => true,
        ]);
        
        $response->assertSessionHasErrors('subdomain');
    }
}
```

## Key Simplifications

### What We Eliminated

1. **❌ Custom database creation logic** - Package handles it
2. **❌ Manual migration running** - Automatic
3. **❌ Complex job queuing** - Use events
4. **❌ Manual domain creation** - Model event
5. **❌ Email verification flow** - Simplified
6. **❌ All custom validation rules** - Use simple unique check
7. **❌ DNS validation (regex, alpha_dash)** - Package validates at runtime
8. **❌ Complex closure validations** - Not needed
9. **❌ Manual domain concatenation** - Let middleware handle it

### What We Keep

1. **✅ Reserved subdomain list** (business rules only)
2. **✅ Basic length validation** (min:3, max:63)
3. **✅ Simple unique check** (Rule::unique)
4. **✅ Clean form UI**
5. **✅ Welcome emails via events**
6. **✅ Basic error handling**

## Performance Optimizations

```php
// config/tenancy.php
return [
    // Enable all automatic features
    'features' => [
        'database_creation' => true,
        'database_seeding' => true,
        'migrations_in_transaction' => true, // Faster migrations
        'throw_if_database_creation_fails' => true, // Better error handling
    ],
    
    // Cache tenant lookups
    'cache' => [
        'tenant_lookup' => true,
        'ttl' => 3600,
    ],
];
```

## Migration from Complex Implementation

### Remove These Components:
- ❌ EmailVerificationController & flow
- ❌ SubdomainAvailabilityController
- ❌ CreateTenantDatabaseJob
- ❌ TenantDatabaseService
- ❌ Complex validation services

### Keep Only:
- ✅ Simple registration controller
- ✅ Basic validation rules
- ✅ Event listeners for emails
- ✅ Clean UI components

## Conclusion

By leveraging Laravel Tenancy's automatic features, the signup flow becomes much simpler and more reliable. The package handles all the complex operations, allowing us to focus on user experience and business logic.
