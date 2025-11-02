# Multi-Tenant Signup Flow Implementation

## Overview

This document provides complete code examples for implementing the self-service signup flow for the multi-tenant Maintenance OS, including frontend components, backend controllers, validation, and the complete onboarding process.

## Table of Contents

1. [Frontend Components](#frontend-components)
2. [Backend Implementation](#backend-implementation)
3. [Validation and Security](#validation-and-security)
4. [Email Verification](#email-verification)
5. [Trial Management](#trial-management)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

## Frontend Components

### Signup Page Component

```tsx
// resources/js/pages/auth/signup.tsx
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import TextInput from '@/components/ui/text-input';
import Button from '@/components/ui/button';
import { createFormAdapter } from '@/utils/form-adapters';
import PlanSelector from './components/plan-selector';
import SubdomainInput from './components/subdomain-input';
import { Plan } from '@/types';

interface SignupPageProps {
    plans: Plan[];
}

export default function SignupPage({ plans }: SignupPageProps) {
    const [step, setStep] = useState(1);
    const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        // Company Information
        company_name: '',
        subdomain: '',
        
        // Plan Selection
        plan_id: plans.find(p => p.slug === 'professional')?.id || plans[0].id,
        
        // Admin User
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
        
        // Preferences
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Legal
        terms_accepted: false,
        marketing_emails: false,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const currentPlan = plans.find(p => p.id === data.plan_id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (step < 3) {
            setStep(step + 1);
            return;
        }

        post('/register', {
            onSuccess: () => {
                // Will redirect to email verification page
            },
        });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <StepOne />;
            case 2:
                return <StepTwo />;
            case 3:
                return <StepThree />;
            default:
                return null;
        }
    };

    // Step 1: Company Information & Plan Selection
    const StepOne = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">
                    Let's get started with your account
                </h2>
                <p className="text-gray-600">
                    Choose your plan and tell us about your company
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Your Plan
                </label>
                <PlanSelector
                    plans={plans}
                    selectedPlanId={data.plan_id}
                    onSelect={(planId) => setData('plan_id', planId)}
                />
                {errors.plan_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.plan_id}</p>
                )}
            </div>

            <TextInput
                form={formAdapter}
                name="company_name"
                label="Company Name"
                placeholder="Acme Corporation"
                required
                autoFocus
            />

            <SubdomainInput
                value={data.subdomain}
                onChange={(value) => setData('subdomain', value)}
                error={errors.subdomain}
                onCheck={setIsCheckingSubdomain}
            />
        </div>
    );

    // Step 2: Admin User Information
    const StepTwo = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">
                    Create your administrator account
                </h2>
                <p className="text-gray-600">
                    This will be the primary administrator for {data.company_name}
                </p>
            </div>

            <TextInput
                form={formAdapter}
                name="admin_name"
                label="Full Name"
                placeholder="John Doe"
                required
                autoFocus
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
                helperText="At least 8 characters"
            />

            <TextInput
                form={formAdapter}
                name="admin_password_confirmation"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                required
            />

            <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                </label>
                <select
                    id="timezone"
                    value={data.timezone}
                    onChange={(e) => setData('timezone', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                        <option key={tz} value={tz}>
                            {tz.replace(/_/g, ' ')}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    // Step 3: Review & Legal
    const StepThree = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">
                    Review and confirm
                </h2>
                <p className="text-gray-600">
                    You're almost done! Review your information and accept the terms.
                </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium">{data.company_name}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Subdomain</p>
                    <p className="font-medium">{data.subdomain}.maintenance-os.com</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Plan</p>
                    <p className="font-medium">
                        {currentPlan?.name} - ${currentPlan?.price}/month
                    </p>
                    <p className="text-sm text-gray-600">30-day free trial included</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Administrator</p>
                    <p className="font-medium">{data.admin_name}</p>
                    <p className="text-sm text-gray-600">{data.admin_email}</p>
                </div>
            </div>

            <div className="space-y-3">
                <label className="flex items-start">
                    <input
                        type="checkbox"
                        checked={data.terms_accepted}
                        onChange={(e) => setData('terms_accepted', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        required
                    />
                    <span className="ml-2 text-sm text-gray-700">
                        I agree to the{' '}
                        <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                            Privacy Policy
                        </Link>
                    </span>
                </label>
                {errors.terms_accepted && (
                    <p className="text-sm text-red-600">{errors.terms_accepted}</p>
                )}

                <label className="flex items-start">
                    <input
                        type="checkbox"
                        checked={data.marketing_emails}
                        onChange={(e) => setData('marketing_emails', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                        Send me tips and updates about Maintenance OS
                    </span>
                </label>
            </div>
        </div>
    );

    return (
        <AuthLayout>
            <div className="mx-auto w-full max-w-md">
                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`flex-1 ${i < 3 ? 'mr-4' : ''}`}
                            >
                                <div
                                    className={`h-2 rounded-full transition-colors ${
                                        i <= step
                                            ? 'bg-indigo-600'
                                            : 'bg-gray-200'
                                    }`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-600">
                        <span>Company Info</span>
                        <span>Administrator</span>
                        <span>Confirm</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {renderStep()}

                    <div className="mt-8 flex items-center justify-between">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(step - 1)}
                                disabled={processing}
                            >
                                Previous
                            </Button>
                        )}
                        
                        <Button
                            type="submit"
                            className={step === 1 ? 'ml-auto' : ''}
                            disabled={processing || isCheckingSubdomain || (step === 3 && !data.terms_accepted)}
                            loading={processing}
                        >
                            {step === 3 ? 'Create Account' : 'Next'}
                        </Button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
```

### Plan Selector Component

```tsx
// resources/js/pages/auth/components/plan-selector.tsx
import React from 'react';
import { CheckIcon } from 'lucide-react';
import { Plan } from '@/types';
import { formatCurrency } from '@/utils/number';

interface PlanSelectorProps {
    plans: Plan[];
    selectedPlanId: number;
    onSelect: (planId: number) => void;
}

export default function PlanSelector({ plans, selectedPlanId, onSelect }: PlanSelectorProps) {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
                <button
                    key={plan.id}
                    type="button"
                    onClick={() => onSelect(plan.id)}
                    className={`relative rounded-lg border-2 p-4 text-left transition-colors ${
                        selectedPlanId === plan.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    {plan.slug === 'professional' && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                            Recommended
                        </span>
                    )}
                    
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                        {formatCurrency(plan.price)}
                        <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                    
                    <ul className="mt-4 space-y-2 text-sm">
                        {plan.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-start">
                                <CheckIcon className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                                <span className="text-gray-600">{feature}</span>
                            </li>
                        ))}
                    </ul>
                    
                    {selectedPlanId === plan.id && (
                        <div className="absolute right-2 top-2">
                            <div className="h-5 w-5 rounded-full bg-indigo-600 p-0.5">
                                <CheckIcon className="h-full w-full text-white" />
                            </div>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
```

### Subdomain Input Component

```tsx
// resources/js/pages/auth/components/subdomain-input.tsx
import React, { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import axios from 'axios';

interface SubdomainInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    onCheck: (checking: boolean) => void;
}

export default function SubdomainInput({ value, onChange, error, onCheck }: SubdomainInputProps) {
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const checkAvailability = useCallback(
        debounce(async (subdomain: string) => {
            if (!subdomain || subdomain.length < 3) {
                setIsAvailable(null);
                setValidationError(null);
                return;
            }

            setIsChecking(true);
            onCheck(true);

            try {
                const response = await axios.post('/api/check-subdomain', {
                    subdomain,
                });

                setIsAvailable(response.data.available);
                setValidationError(response.data.available ? null : 'This subdomain is already taken');
            } catch (error: any) {
                if (error.response?.status === 422) {
                    setValidationError(error.response.data.errors.subdomain[0]);
                    setIsAvailable(false);
                } else {
                    setValidationError('Unable to check availability');
                }
            } finally {
                setIsChecking(false);
                onCheck(false);
            }
        }, 500),
        [onCheck]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '');

        onChange(newValue);
        setIsAvailable(null);
        setValidationError(null);

        if (newValue) {
            checkAvailability(newValue);
        }
    };

    return (
        <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
                Choose Your Subdomain
            </label>
            <div className="relative">
                <div className="flex">
                    <input
                        id="subdomain"
                        type="text"
                        value={value}
                        onChange={handleChange}
                        placeholder="mycompany"
                        className={`flex-1 rounded-l-md border ${
                            error || validationError
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : isAvailable === true
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        } px-3 py-2 shadow-sm`}
                        required
                    />
                    <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                        .maintenance-os.com
                    </span>
                </div>
                
                {isChecking && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 transform">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    </div>
                )}
                
                {!isChecking && isAvailable === true && (
                    <CheckCircleIcon className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-500" />
                )}
                
                {!isChecking && isAvailable === false && (
                    <XCircleIcon className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 transform text-red-500" />
                )}
            </div>
            
            {(error || validationError) && (
                <p className="mt-1 text-sm text-red-600">{error || validationError}</p>
            )}
            
            {isAvailable === true && (
                <p className="mt-1 text-sm text-green-600">Great! This subdomain is available.</p>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
                Letters, numbers, and dashes only. At least 3 characters.
            </p>
        </div>
    );
}
```

## Backend Implementation

### Registration Controller

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\TenantRegistrationRequest;
use App\Services\AccountService;
use App\Services\EmailVerificationService;
use App\Models\Central\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TenantRegistrationController extends Controller
{
    protected AccountService $accountService;
    protected EmailVerificationService $verificationService;

    public function __construct(
        AccountService $accountService,
        EmailVerificationService $verificationService
    ) {
        $this->accountService = $accountService;
        $this->verificationService = $verificationService;
    }

    public function create(): Response
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price' => $plan->price,
                    'features' => $this->getDisplayFeatures($plan),
                ];
            });

        return Inertia::render('auth/signup', [
            'plans' => $plans,
        ]);
    }

    public function store(TenantRegistrationRequest $request): RedirectResponse
    {
        DB::beginTransaction();

        try {
            // Create account
            $account = $this->accountService->createAccount($request->validated());

            // Send verification email
            $this->verificationService->sendVerificationEmail(
                $account,
                $request->input('admin_email')
            );

            // Store account ID in session for verification
            session(['pending_verification_account_id' => $account->id]);

            DB::commit();

            // Log registration
            activity()
                ->performedOn($account)
                ->withProperties([
                    'plan_id' => $request->input('plan_id'),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ])
                ->log('Account registered');

            return redirect()->route('verification.notice');

        } catch (\Exception $e) {
            DB::rollBack();

            report($e);

            return back()
                ->withInput()
                ->withErrors(['general' => 'Unable to create account. Please try again.']);
        }
    }

    protected function getDisplayFeatures(Plan $plan): array
    {
        $features = [];

        // Add limit-based features
        $limits = $plan->planLimits;
        
        if ($limit = $limits->firstWhere('resource_type', 'users')) {
            $features[] = $limit->limit_value == -1 
                ? 'Unlimited users' 
                : "Up to {$limit->limit_value} users";
        }

        if ($limit = $limits->firstWhere('resource_type', 'assets')) {
            $features[] = $limit->limit_value == -1 
                ? 'Unlimited assets' 
                : "Up to {$limit->limit_value} assets";
        }

        if ($limit = $limits->firstWhere('resource_type', 'storage_gb')) {
            $features[] = $limit->limit_value == -1 
                ? 'Unlimited storage' 
                : "{$limit->limit_value}GB storage";
        }

        // Add feature flags
        $featureFlags = $plan->planFeatures;

        if ($featureFlags->where('feature_key', 'production_module')->where('enabled', true)->count()) {
            $features[] = 'Production scheduling';
        }

        if ($featureFlags->where('feature_key', 'api_access')->where('enabled', true)->count()) {
            $features[] = 'API access';
        }

        if ($featureFlags->where('feature_key', 'priority_support')->where('enabled', true)->count()) {
            $features[] = 'Priority support';
        }

        return $features;
    }
}
```

### Registration Request Validation

```php
<?php

namespace App\Http\Requests\Auth;

use App\Rules\SubdomainRule;
use App\Models\Central\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class TenantRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Company Information
            'company_name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                new SubdomainRule(),
                'unique:central.accounts,subdomain',
            ],
            
            // Plan Selection
            'plan_id' => [
                'required',
                'integer',
                'exists:central.plans,id,is_active,1',
            ],
            
            // Admin User
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'string', 'email', 'max:255'],
            'admin_password' => ['required', 'confirmed', Password::defaults()],
            
            // Preferences
            'timezone' => ['required', 'string', 'timezone'],
            
            // Legal
            'terms_accepted' => ['required', 'accepted'],
            'marketing_emails' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'subdomain.unique' => 'This subdomain is already taken.',
            'terms_accepted.accepted' => 'You must accept the terms of service.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional validation logic if needed
            if ($this->plan_id) {
                $plan = Plan::find($this->plan_id);
                
                if ($plan && $plan->slug === 'enterprise') {
                    // Enterprise plans might require additional validation
                    // or manual approval process
                }
            }
        });
    }
}
```

### Subdomain Validation Rule

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SubdomainRule implements ValidationRule
{
    protected array $reserved = [
        'www', 'admin', 'api', 'app', 'mail', 'ftp', 'sftp',
        'email', 'blog', 'help', 'support', 'status', 'cdn',
        'dashboard', 'account', 'accounts', 'billing', 'invoice',
        'login', 'register', 'signup', 'signin', 'auth',
        'staging', 'dev', 'development', 'test', 'demo',
        'public', 'private', 'secure', 'portal', 'my',
        'maintenance-os', 'maintenanceos',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Check format
        if (!preg_match('/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/', $value)) {
            $fail('The :attribute must contain only lowercase letters, numbers, and dashes.');
            return;
        }

        // Check reserved words
        if (in_array($value, $this->reserved)) {
            $fail('The :attribute is reserved and cannot be used.');
            return;
        }

        // Check for double dashes
        if (str_contains($value, '--')) {
            $fail('The :attribute cannot contain consecutive dashes.');
            return;
        }

        // Check numeric only (not allowed)
        if (is_numeric($value)) {
            $fail('The :attribute cannot be only numbers.');
            return;
        }
    }
}
```

### Account Service

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Domain;
use App\Models\Central\AccountUser;
use App\Jobs\Tenancy\CreateTenantDatabaseJob;
use App\Jobs\Tenancy\SendWelcomeEmailJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountService
{
    public function createAccount(array $data): Account
    {
        DB::connection('central')->beginTransaction();

        try {
            // Create account
            $account = Account::create([
                'id' => Str::uuid(),
                'name' => $data['company_name'],
                'subdomain' => $data['subdomain'],
                'database' => $this->generateDatabaseName($data['subdomain']),
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'metadata' => [
                    'admin_email' => $data['admin_email'],
                    'admin_name' => $data['admin_name'],
                    'admin_password' => $data['admin_password'], // Will be hashed in seeder
                    'timezone' => $data['timezone'],
                    'marketing_emails' => $data['marketing_emails'] ?? false,
                    'signup_ip' => request()->ip(),
                    'signup_at' => now()->toIso8601String(),
                ],
                'settings' => [
                    'timezone' => $data['timezone'],
                    'date_format' => 'Y-m-d',
                    'time_format' => 'H:i',
                ],
            ]);

            // Create primary domain
            $domain = Domain::create([
                'tenant_id' => $account->id,
                'domain' => $this->generateDomain($data['subdomain']),
                'is_primary' => true,
                'is_verified' => true, // Auto-verified for subdomains
            ]);

            // Create subscription
            $account->subscriptions()->create([
                'plan_id' => $data['plan_id'],
                'status' => 'trialing',
                'current_period_start' => now(),
                'current_period_end' => now()->addDays(30),
                'trial_ends_at' => now()->addDays(30),
            ]);

            // Track user for cross-account identification
            AccountUser::create([
                'account_id' => $account->id,
                'email' => $data['admin_email'],
            ]);

            DB::connection('central')->commit();

            // Queue database creation (outside transaction)
            CreateTenantDatabaseJob::dispatch($account->id)
                ->onQueue('high-priority');

            // Queue welcome email (after database is ready)
            SendWelcomeEmailJob::dispatch($account->id)
                ->delay(now()->addMinutes(2))
                ->onQueue('emails');

            return $account;

        } catch (\Exception $e) {
            DB::connection('central')->rollBack();
            throw $e;
        }
    }

    protected function generateDatabaseName(string $subdomain): string
    {
        $uuid = Str::uuid()->toString();
        $cleanUuid = str_replace('-', '', $uuid);
        
        return "tenant_{$cleanUuid}_{$subdomain}";
    }

    protected function generateDomain(string $subdomain): string
    {
        $baseDomain = config('app.domain', 'maintenance-os.com');
        $environment = app()->environment();

        return match($environment) {
            'production' => "{$subdomain}.{$baseDomain}",
            'staging' => "{$subdomain}.staging.{$baseDomain}",
            'local' => "{$subdomain}.{$baseDomain}.test",
            default => "{$subdomain}.{$baseDomain}",
        };
    }
}
```

## Validation and Security

### Subdomain Availability Check

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Rules\SubdomainRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Account;
use App\Models\Domain;

class SubdomainAvailabilityController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                new SubdomainRule(),
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'available' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $subdomain = $request->input('subdomain');

        // Check if subdomain exists in accounts
        $accountExists = Account::where('subdomain', $subdomain)->exists();

        // Check if domain exists
        $domainExists = Domain::where('domain', 'LIKE', $subdomain . '%')->exists();

        $available = !$accountExists && !$domainExists;

        // Log subdomain check for rate limiting
        cache()->put(
            "subdomain_check:{$request->ip()}:{$subdomain}",
            now(),
            now()->addMinutes(5)
        );

        return response()->json([
            'available' => $available,
            'subdomain' => $subdomain,
        ]);
    }
}
```

### Rate Limiting for Signup

```php
<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->routes(function () {
            // ... route configuration
        });
    }

    protected function configureRateLimiting(): void
    {
        // Signup rate limiting
        RateLimiter::for('signup', function (Request $request) {
            return [
                // 3 signup attempts per IP per hour
                Limit::perHour(3)->by($request->ip()),
                // 10 signup attempts per IP per day
                Limit::perDay(10)->by($request->ip()),
            ];
        });

        // Subdomain check rate limiting
        RateLimiter::for('subdomain-check', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // Email verification rate limiting
        RateLimiter::for('verification-email', function (Request $request) {
            return Limit::perHour(5)->by($request->session()->get('pending_verification_account_id'));
        });
    }
}
```

### CSRF Protection for API Routes

```php
// routes/api.php
Route::middleware(['web', 'throttle:subdomain-check'])->group(function () {
    Route::post('/check-subdomain', [SubdomainAvailabilityController::class, 'check']);
});

// Note: Using 'web' middleware ensures CSRF protection
```

## Email Verification

### Verification Service

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Central\EmailVerification;
use App\Mail\VerifyAccountEmail;
use App\Mail\AccountVerifiedEmail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EmailVerificationService
{
    public function sendVerificationEmail(Account $account, string $email): void
    {
        // Generate verification token
        $token = Str::random(64);

        // Store verification record
        EmailVerification::create([
            'account_id' => $account->id,
            'email' => $email,
            'token' => hash('sha256', $token),
            'expires_at' => now()->addHours(24),
        ]);

        // Send email
        Mail::to($email)->send(new VerifyAccountEmail($account, $token));
    }

    public function verifyEmail(string $token): ?Account
    {
        $hashedToken = hash('sha256', $token);

        $verification = EmailVerification::where('token', $hashedToken)
            ->where('expires_at', '>', now())
            ->whereNull('verified_at')
            ->first();

        if (!$verification) {
            return null;
        }

        // Mark as verified
        $verification->update([
            'verified_at' => now(),
        ]);

        // Get account
        $account = Account::find($verification->account_id);

        // Update account metadata
        $account->metadata = array_merge($account->metadata, [
            'email_verified_at' => now()->toIso8601String(),
        ]);
        $account->save();

        // Send welcome email
        $this->sendWelcomeEmail($account, $verification->email);

        return $account;
    }

    protected function sendWelcomeEmail(Account $account, string $email): void
    {
        Mail::to($email)->send(new AccountVerifiedEmail($account));
    }
}
```

### Verification Controller

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    protected EmailVerificationService $verificationService;

    public function __construct(EmailVerificationService $verificationService)
    {
        $this->verificationService = $verificationService;
    }

    public function notice(Request $request): Response|RedirectResponse
    {
        $accountId = session('pending_verification_account_id');

        if (!$accountId) {
            return redirect()->route('register');
        }

        return Inertia::render('auth/verify-email', [
            'status' => session('status'),
        ]);
    }

    public function verify(Request $request, string $token): RedirectResponse
    {
        $account = $this->verificationService->verifyEmail($token);

        if (!$account) {
            return redirect()->route('register')
                ->withErrors(['email' => 'Invalid or expired verification link.']);
        }

        // Clear session
        session()->forget('pending_verification_account_id');

        // Redirect to tenant domain
        $domain = $account->domains()->where('is_primary', true)->first();
        $url = "https://{$domain->domain}/login?verified=1";

        return redirect()->away($url);
    }

    public function resend(Request $request): RedirectResponse
    {
        $accountId = session('pending_verification_account_id');

        if (!$accountId) {
            return redirect()->route('register');
        }

        $account = Account::find($accountId);

        if (!$account) {
            return redirect()->route('register');
        }

        $this->verificationService->sendVerificationEmail(
            $account,
            $account->metadata['admin_email']
        );

        return back()->with('status', 'verification-link-sent');
    }
}
```

### Email Templates

```php
<?php
// app/Mail/VerifyAccountEmail.php

namespace App\Mail;

use App\Models\Account;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerifyAccountEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Account $account,
        public string $token
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify your Maintenance OS account',
        );
    }

    public function content(): Content
    {
        $verificationUrl = route('verification.verify', ['token' => $this->token]);

        return new Content(
            markdown: 'emails.auth.verify',
            with: [
                'accountName' => $this->account->name,
                'verificationUrl' => $verificationUrl,
                'expirationHours' => 24,
            ],
        );
    }
}
```

```blade
{{-- resources/views/emails/auth/verify.blade.php --}}
@component('mail::message')
# Welcome to Maintenance OS!

Thank you for creating an account for **{{ $accountName }}**.

Please click the button below to verify your email address and activate your account:

@component('mail::button', ['url' => $verificationUrl])
Verify Email Address
@endcomponent

This verification link will expire in {{ $expirationHours }} hours.

If you did not create an account, no further action is required.

Thanks,<br>
{{ config('app.name') }}
@endcomponent
```

## Trial Management

### Trial Expiration Job

```php
<?php

namespace App\Jobs\Tenancy;

use App\Models\Account;
use App\Mail\TrialExpiringEmail;
use App\Mail\TrialExpiredEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class CheckTrialExpirationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // Check accounts expiring in 7 days
        $expiringInWeek = Account::where('status', 'active')
            ->whereDate('trial_ends_at', now()->addDays(7)->toDateString())
            ->whereDoesntHave('subscriptions', function ($query) {
                $query->where('status', 'active');
            })
            ->get();

        foreach ($expiringInWeek as $account) {
            if (!$this->hasReceivedWarning($account, 'trial_expiring_7_days')) {
                Mail::to($account->metadata['admin_email'])
                    ->send(new TrialExpiringEmail($account, 7));
                
                $this->markWarningAsSent($account, 'trial_expiring_7_days');
            }
        }

        // Check accounts expiring tomorrow
        $expiringTomorrow = Account::where('status', 'active')
            ->whereDate('trial_ends_at', now()->addDay()->toDateString())
            ->whereDoesntHave('subscriptions', function ($query) {
                $query->where('status', 'active');
            })
            ->get();

        foreach ($expiringTomorrow as $account) {
            if (!$this->hasReceivedWarning($account, 'trial_expiring_1_day')) {
                Mail::to($account->metadata['admin_email'])
                    ->send(new TrialExpiringEmail($account, 1));
                
                $this->markWarningAsSent($account, 'trial_expiring_1_day');
            }
        }

        // Check expired trials
        $expiredTrials = Account::where('status', 'active')
            ->where('trial_ends_at', '<', now())
            ->whereDoesntHave('subscriptions', function ($query) {
                $query->where('status', 'active');
            })
            ->get();

        foreach ($expiredTrials as $account) {
            // Mark as suspended
            $account->suspend('Trial expired - no active subscription');

            Mail::to($account->metadata['admin_email'])
                ->send(new TrialExpiredEmail($account));
        }
    }

    protected function hasReceivedWarning(Account $account, string $type): bool
    {
        return cache()->has("trial_warning:{$account->id}:{$type}");
    }

    protected function markWarningAsSent(Account $account, string $type): void
    {
        cache()->put(
            "trial_warning:{$account->id}:{$type}",
            true,
            now()->addDays(30)
        );
    }
}
```

### Trial Extension Command

```php
<?php

namespace App\Console\Commands;

use App\Models\Account;
use Illuminate\Console\Command;

class ExtendTrialCommand extends Command
{
    protected $signature = 'accounts:extend-trial
                          {account : Account ID or subdomain}
                          {days : Number of days to extend}';
    
    protected $description = 'Extend trial period for an account';

    public function handle(): int
    {
        $identifier = $this->argument('account');
        $days = (int) $this->argument('days');

        // Find account
        $account = Account::find($identifier) 
            ?? Account::where('subdomain', $identifier)->first();

        if (!$account) {
            $this->error('Account not found');
            return Command::FAILURE;
        }

        // Extend trial
        $currentTrialEnd = $account->trial_ends_at ?? now();
        $newTrialEnd = $currentTrialEnd->addDays($days);

        $account->update([
            'trial_ends_at' => $newTrialEnd,
        ]);

        // Update subscription if exists
        if ($account->subscription) {
            $account->subscription->update([
                'trial_ends_at' => $newTrialEnd,
            ]);
        }

        // Log activity
        activity()
            ->performedOn($account)
            ->causedBy(auth('admin')->user())
            ->withProperties([
                'days_extended' => $days,
                'new_trial_end' => $newTrialEnd->toDateString(),
            ])
            ->log("Trial extended by {$days} days");

        $this->info("Trial extended for {$account->name} until {$newTrialEnd->toDateString()}");

        return Command::SUCCESS;
    }
}
```

## Error Handling

### Global Error Handler for Signup

```php
<?php

namespace App\Exceptions\Handlers;

use App\Exceptions\AccountCreationException;
use App\Exceptions\SubdomainNotAvailableException;
use App\Exceptions\DatabaseCreationException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class SignupErrorHandler
{
    public function handle(
        \Throwable $exception,
        Request $request
    ): JsonResponse|RedirectResponse|null {
        if ($exception instanceof SubdomainNotAvailableException) {
            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'The selected subdomain is no longer available.',
                    'errors' => [
                        'subdomain' => ['This subdomain was taken while you were signing up.'],
                    ],
                ], 422);
            }

            return back()
                ->withInput()
                ->withErrors(['subdomain' => 'This subdomain was taken while you were signing up.']);
        }

        if ($exception instanceof AccountCreationException) {
            // Clean up partial data
            $this->cleanupPartialAccount($exception->getAccountId());

            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Unable to create your account. Please try again.',
                    'errors' => [
                        'general' => [$exception->getMessage()],
                    ],
                ], 500);
            }

            return back()
                ->withInput()
                ->withErrors(['general' => $exception->getMessage()]);
        }

        if ($exception instanceof DatabaseCreationException) {
            // Mark account for retry
            $this->markAccountForDatabaseRetry($exception->getAccountId());

            // Still allow signup to complete
            return null;
        }

        return null;
    }

    protected function cleanupPartialAccount(string $accountId): void
    {
        // Queue cleanup job
        CleanupPartialAccountJob::dispatch($accountId)
            ->delay(now()->addMinutes(5));
    }

    protected function markAccountForDatabaseRetry(string $accountId): void
    {
        // Queue retry job
        RetryDatabaseCreationJob::dispatch($accountId)
            ->delay(now()->addMinutes(10));
    }
}
```

### Custom Exceptions

```php
<?php

namespace App\Exceptions;

use Exception;

class AccountCreationException extends Exception
{
    protected string $accountId;

    public function __construct(string $message, string $accountId)
    {
        parent::__construct($message);
        $this->accountId = $accountId;
    }

    public function getAccountId(): string
    {
        return $this->accountId;
    }
}

class SubdomainNotAvailableException extends Exception
{
    protected string $subdomain;

    public function __construct(string $subdomain)
    {
        parent::__construct("Subdomain '{$subdomain}' is not available");
        $this->subdomain = $subdomain;
    }

    public function getSubdomain(): string
    {
        return $this->subdomain;
    }
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
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->plan = Plan::factory()->create([
            'name' => 'Professional',
            'slug' => 'professional',
            'price' => 149.00,
        ]);
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('auth/signup')
            ->has('plans', 1)
        );
    }

    public function test_new_accounts_can_register()
    {
        $response = $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'America/New_York',
            'terms_accepted' => true,
            'marketing_emails' => false,
        ]);

        $response->assertRedirect(route('verification.notice'));

        $this->assertDatabaseHas('accounts', [
            'name' => 'Test Company',
            'subdomain' => 'testcompany',
            'status' => 'active',
        ], 'central');

        $account = Account::where('subdomain', 'testcompany')->first();
        
        $this->assertNotNull($account->trial_ends_at);
        $this->assertTrue($account->trial_ends_at->isFuture());
        $this->assertEquals(30, $account->trial_ends_at->diffInDays(now()));
    }

    public function test_subdomain_must_be_unique()
    {
        Account::factory()->create(['subdomain' => 'existing']);

        $response = $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'existing',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'UTC',
            'terms_accepted' => true,
        ]);

        $response->assertSessionHasErrors(['subdomain']);
    }

    public function test_reserved_subdomains_are_rejected()
    {
        $reservedSubdomains = ['www', 'admin', 'api', 'mail'];

        foreach ($reservedSubdomains as $subdomain) {
            $response = $this->post('/register', [
                'company_name' => 'Test Company',
                'subdomain' => $subdomain,
                'plan_id' => $this->plan->id,
                'admin_name' => 'Test Admin',
                'admin_email' => 'admin@testcompany.com',
                'admin_password' => 'password123',
                'admin_password_confirmation' => 'password123',
                'timezone' => 'UTC',
                'terms_accepted' => true,
            ]);

            $response->assertSessionHasErrors(['subdomain']);
        }
    }

    public function test_terms_must_be_accepted()
    {
        $response = $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'UTC',
            'terms_accepted' => false,
        ]);

        $response->assertSessionHasErrors(['terms_accepted']);
    }

    public function test_subdomain_availability_check()
    {
        Account::factory()->create(['subdomain' => 'taken']);

        // Test available subdomain
        $response = $this->postJson('/api/check-subdomain', [
            'subdomain' => 'available',
        ]);

        $response->assertOk();
        $response->assertJson(['available' => true]);

        // Test taken subdomain
        $response = $this->postJson('/api/check-subdomain', [
            'subdomain' => 'taken',
        ]);

        $response->assertOk();
        $response->assertJson(['available' => false]);
    }

    public function test_database_is_created_after_registration()
    {
        $this->expectsJobs(CreateTenantDatabaseJob::class);

        $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'UTC',
            'terms_accepted' => true,
        ]);
    }

    public function test_verification_email_is_sent()
    {
        Mail::fake();

        $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'UTC',
            'terms_accepted' => true,
        ]);

        Mail::assertSent(VerifyAccountEmail::class, function ($mail) {
            return $mail->hasTo('admin@testcompany.com');
        });
    }

    public function test_rate_limiting_prevents_spam_registrations()
    {
        // Make 3 successful registrations (the limit)
        for ($i = 1; $i <= 3; $i++) {
            $response = $this->post('/register', [
                'company_name' => "Test Company {$i}",
                'subdomain' => "testcompany{$i}",
                'plan_id' => $this->plan->id,
                'admin_name' => 'Test Admin',
                'admin_email' => "admin{$i}@testcompany.com",
                'admin_password' => 'password123',
                'admin_password_confirmation' => 'password123',
                'timezone' => 'UTC',
                'terms_accepted' => true,
            ]);

            $response->assertRedirect();
        }

        // 4th attempt should be rate limited
        $response = $this->post('/register', [
            'company_name' => 'Test Company 4',
            'subdomain' => 'testcompany4',
            'plan_id' => $this->plan->id,
            'admin_name' => 'Test Admin',
            'admin_email' => 'admin4@testcompany.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'timezone' => 'UTC',
            'terms_accepted' => true,
        ]);

        $response->assertStatus(429); // Too Many Requests
    }
}
```

### Unit Tests

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AccountService;
use App\Models\Central\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AccountServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AccountService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AccountService();
    }

    public function test_generates_correct_database_name()
    {
        $method = new \ReflectionMethod(AccountService::class, 'generateDatabaseName');
        $method->setAccessible(true);

        $dbName = $method->invoke($this->service, 'testcompany');

        $this->assertStringStartsWith('tenant_', $dbName);
        $this->assertStringEndsWith('_testcompany', $dbName);
        $this->assertMatchesRegularExpression('/^tenant_[a-f0-9]{32}_testcompany$/', $dbName);
    }

    public function test_generates_correct_domain_for_environment()
    {
        $method = new \ReflectionMethod(AccountService::class, 'generateDomain');
        $method->setAccessible(true);

        // Test production
        app()->detectEnvironment(fn() => 'production');
        $domain = $method->invoke($this->service, 'testcompany');
        $this->assertEquals('testcompany.maintenance-os.com', $domain);

        // Test staging
        app()->detectEnvironment(fn() => 'staging');
        $domain = $method->invoke($this->service, 'testcompany');
        $this->assertEquals('testcompany.staging.maintenance-os.com', $domain);

        // Test local
        app()->detectEnvironment(fn() => 'local');
        $domain = $method->invoke($this->service, 'testcompany');
        $this->assertEquals('testcompany.maintenance-os.com.test', $domain);
    }
}
```

This comprehensive signup flow implementation covers all aspects from the frontend React components to backend validation, email verification, and testing. The implementation follows Laravel and React best practices while ensuring security through proper validation, rate limiting, and CSRF protection.
