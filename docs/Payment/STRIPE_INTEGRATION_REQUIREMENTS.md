# Stripe Integration Requirements & Specification

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Status:** Draft - Pending Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [Pricing Structure](#pricing-structure)
4. [Technical Architecture](#technical-architecture)
5. [Feature Gating & Enforcement](#feature-gating--enforcement)
6. [User Flows](#user-flows)
7. [Admin Portal Capabilities](#admin-portal-capabilities)
8. [Payment Operations](#payment-operations)
9. [Integration Details](#integration-details)
10. [Security & Compliance](#security--compliance)
11. [Testing Strategy](#testing-strategy)
12. [Implementation Phases](#implementation-phases)
13. [Future Considerations](#future-considerations)

---

## Executive Summary

### Objective
Implement a complete Stripe-based subscription billing system for the multi-tenant Maintenance OS SaaS application using Laravel Cashier, enabling automated recurring billing, plan management, and usage enforcement.

### Key Goals
- Zero-friction trial signup with credit card required
- Automated plan limit enforcement with upgrade prompts
- Self-service billing portal for tenant admins
- Admin panel for subscription management and support
- Immediate plan changes with prorated billing
- Robust failed payment handling with grace periods

### Technology Stack
- **Payment Gateway:** Stripe
- **Laravel Package:** Laravel Cashier Stripe (v15.x for Laravel 12)
- **Database:** PostgreSQL (central database for billing)
- **Architecture:** Multi-tenant with central billing

---

## Business Requirements

### Target Market
- **Primary Markets:** Brazil and USA
- **Tax Handling:** Stripe Tax for automated tax collection
- **VAT:** EU VAT handling deferred to future phase

### Revenue Model
- **Billing Entity:** Per tenant/account (not per user)
- **Billing Frequency:** Monthly or Annual
- **Annual Discount:** 20% off monthly rate
- **Trial Period:** 30 days (all plans)
- **Credit Card:** Required at signup (even during trial)

### Customer Support
- **Self-Service:** Tenant admins manage their own billing
- **Admin Override:** System admins can manually adjust plans and apply credits
- **Cancellation:** Self-service through customer portal
- **Refunds:** Admin-initiated through admin panel

---

## Pricing Structure

### Plan Tiers

| Plan | Monthly Price (USD) | Annual Price (USD) | Annual Savings |
|------|--------------------|--------------------|----------------|
| **Starter** | $20 | $192 | $48 (20%) |
| **Professional** | $100 | $960 | $240 (20%) |
| **Enterprise** | $500 | $4,800 | $1,200 (20%) |

### Plan Features & Limits

**Starter Plan ($20/month)**
```json
{
  "name": "Starter",
  "price_monthly": 20.00,
  "price_annual": 192.00,
  "stripe_price_id_monthly": "price_starter_monthly",
  "stripe_price_id_annual": "price_starter_annual",
  "trial_days": 30,
  "features": {
    "users": 5,
    "assets": 50,
    "work_cells": 10,
    "work_orders_per_month": 100,
    "storage_gb": 5,
    "scheduling": false,
    "advanced_reporting": false,
    "api_access": false
  },
  "warning_thresholds": {
    "users": 4,        // Warn at 80%
    "assets": 40,      // Warn at 80%
    "work_cells": 8,   // Warn at 80%
    "work_orders_per_month": 80,
    "storage_gb": 4
  }
}
```

**Professional Plan ($100/month)**
```json
{
  "name": "Professional",
  "price_monthly": 100.00,
  "price_annual": 960.00,
  "stripe_price_id_monthly": "price_professional_monthly",
  "stripe_price_id_annual": "price_professional_annual",
  "trial_days": 30,
  "features": {
    "users": 25,
    "assets": 500,
    "work_cells": 50,
    "work_orders_per_month": 1000,
    "storage_gb": 50,
    "scheduling": true,
    "advanced_reporting": true,
    "api_access": false
  },
  "warning_thresholds": {
    "users": 20,
    "assets": 400,
    "work_cells": 40,
    "work_orders_per_month": 800,
    "storage_gb": 40
  }
}
```

**Enterprise Plan ($500/month)**
```json
{
  "name": "Enterprise",
  "price_monthly": 500.00,
  "price_annual": 4800.00,
  "stripe_price_id_monthly": "price_enterprise_monthly",
  "stripe_price_id_annual": "price_enterprise_annual",
  "trial_days": 30,
  "features": {
    "users": -1,        // Unlimited
    "assets": -1,       // Unlimited
    "work_cells": -1,   // Unlimited
    "work_orders_per_month": -1,
    "storage_gb": 500,
    "scheduling": true,
    "advanced_reporting": true,
    "api_access": true,
    "priority_support": true,
    "custom_integrations": true
  },
  "warning_thresholds": {
    "storage_gb": 450   // Warn at 90%
  }
}
```

### Plan Configuration Strategy

**Stripe as Source of Truth for Pricing:**
- Stripe Products and Prices are created manually in Stripe Dashboard
- Laravel stores: plan metadata, features, limits, warning thresholds
- Synchronization: Manual or via Artisan command (`stripe:sync-plans`)

**Database Schema Updates Needed:**

```sql
-- Add to plans table
ALTER TABLE plans ADD COLUMN stripe_product_id VARCHAR(255);
ALTER TABLE plans ADD COLUMN stripe_price_id_monthly VARCHAR(255);
ALTER TABLE plans ADD COLUMN stripe_price_id_annual VARCHAR(255);
ALTER TABLE plans ADD COLUMN warning_thresholds JSONB DEFAULT '{}';
ALTER TABLE plans ADD COLUMN is_available_for_signup BOOLEAN DEFAULT true;

-- Add indexes
CREATE INDEX idx_plans_stripe_product_id ON plans(stripe_product_id);
CREATE INDEX idx_plans_stripe_price_monthly ON plans(stripe_price_id_monthly);
CREATE INDEX idx_plans_stripe_price_annual ON plans(stripe_price_id_annual);
```

---

## Technical Architecture

### Laravel Cashier Integration

**Why Laravel Cashier:**
1. **Minimal Technical Risk:** Battle-tested package maintained by Laravel core team
2. **Comprehensive Features:** Handles 95% of subscription scenarios out-of-box
3. **Webhook Handling:** Automatic webhook processing and signature verification
4. **Multi-tenancy Compatible:** Works with central database model
5. **Customer Portal:** Built-in Stripe Billing Portal integration

**Cashier Setup Requirements:**
```bash
composer require laravel/cashier
php artisan cashier:install
```

### Database Architecture

**Central Database Tables (already exist, need modifications):**

1. **accounts table** - Add Cashier columns:
```sql
ALTER TABLE accounts ADD COLUMN stripe_id VARCHAR(255) UNIQUE;
ALTER TABLE accounts ADD COLUMN pm_type VARCHAR(255);
ALTER TABLE accounts ADD COLUMN pm_last_four VARCHAR(4);
ALTER TABLE accounts ADD COLUMN trial_ends_at TIMESTAMP;  -- Already exists

CREATE INDEX idx_accounts_stripe_id ON accounts(stripe_id);
```

2. **subscriptions table** - Update to match Cashier schema:
```sql
-- Cashier expects specific column names
ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO stripe_id;
ALTER TABLE subscriptions ADD COLUMN type VARCHAR(255) DEFAULT 'default';
ALTER TABLE subscriptions ADD COLUMN stripe_price VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN quantity INTEGER;

-- Keep our custom columns
-- account_id, plan_id, status, trial_ends_at, starts_at, ends_at, 
-- canceled_at, stripe_customer_id, metadata
```

3. **subscription_items table** - New (required by Cashier):
```sql
CREATE TABLE subscription_items (
    id BIGSERIAL PRIMARY KEY,
    subscription_id BIGINT NOT NULL,
    stripe_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_product VARCHAR(255) NOT NULL,
    stripe_price VARCHAR(255) NOT NULL,
    quantity INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_stripe_id ON subscription_items(stripe_id);
```

4. **payments table** - New (for payment history):
```sql
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50),  -- succeeded, pending, failed
    type VARCHAR(50),    -- subscription, refund, credit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_account_id ON payments(account_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Model Updates

**Account Model (Billable):**
```php
use Laravel\Cashier\Billable;

class Account extends Model implements Tenant, TenantWithDatabase
{
    use Billable;
    
    // Override Cashier's stripe_id column accessor if needed
    public function stripeId()
    {
        return $this->stripe_id;
    }
    
    // Tax ID for Stripe Tax
    public function taxIds()
    {
        // Return tax IDs if account provides them (e.g., Brazilian CNPJ)
    }
}
```

**Subscription Model:**
- Keep custom model but extend Cashier's Subscription model
- Or map Cashier's methods to existing model

**Plan Model:**
```php
class Plan extends Model
{
    protected $casts = [
        'features' => 'array',
        'warning_thresholds' => 'array',
        'metadata' => 'array',
        'is_active' => 'boolean',
        'is_available_for_signup' => 'boolean',
    ];
    
    public function getMonthlyPrice(): float
    {
        return $this->price;  // Assuming price is monthly
    }
    
    public function getAnnualPrice(): float
    {
        return $this->price * 12 * 0.8;  // 20% discount
    }
    
    public function hasFeature(string $feature): bool
    {
        return $this->features[$feature] ?? false;
    }
    
    public function getLimit(string $resource): int
    {
        return $this->features[$resource] ?? 0;
    }
    
    public function getWarningThreshold(string $resource): int
    {
        return $this->warning_thresholds[$resource] ?? 
               (int)($this->getLimit($resource) * 0.8);
    }
}
```

### Service Layer

**SubscriptionService:**
```php
namespace App\Services;

class SubscriptionService
{
    /**
     * Create subscription for new account during trial.
     */
    public function createTrialSubscription(
        Account $account, 
        Plan $plan, 
        string $paymentMethodId,
        string $billingInterval = 'monthly'
    ): Subscription;
    
    /**
     * Upgrade/downgrade subscription.
     */
    public function changeSubscription(
        Account $account,
        Plan $newPlan,
        string $billingInterval = 'monthly'
    ): Subscription;
    
    /**
     * Validate downgrade is allowed based on current usage.
     */
    public function validateDowngrade(
        Account $account,
        Plan $targetPlan
    ): array;  // Returns ['valid' => bool, 'violations' => []]
    
    /**
     * Cancel subscription (immediate or at period end).
     */
    public function cancelSubscription(
        Account $account,
        bool $immediately = false
    ): void;
    
    /**
     * Resume canceled subscription.
     */
    public function resumeSubscription(Account $account): void;
    
    /**
     * Apply credit to account.
     */
    public function applyCredit(
        Account $account,
        float $amount,
        string $description
    ): void;
    
    /**
     * Process refund.
     */
    public function processRefund(
        Account $account,
        string $paymentIntentId,
        float $amount = null
    ): void;
}
```

**PlanEnforcementService:**
```php
namespace App\Services;

class PlanEnforcementService
{
    /**
     * Check if account can create a resource.
     */
    public function canCreate(
        Account $account,
        string $resource
    ): array;  // ['allowed' => bool, 'limit' => int, 'current' => int, 'at_warning' => bool]
    
    /**
     * Get current usage for account.
     */
    public function getCurrentUsage(Account $account): array;
    
    /**
     * Check if account has feature access.
     */
    public function hasFeature(Account $account, string $feature): bool;
    
    /**
     * Get resources that are at warning threshold.
     */
    public function getWarnings(Account $account): array;
}
```

---

## Feature Gating & Enforcement

### Hard Limits (Blocking)

When a tenant attempts to create a resource that would exceed their plan limit, the system must:

1. **Block the creation** with a clear error message
2. **Show current usage** vs. plan limit
3. **Offer immediate upgrade** with pricing comparison
4. **Track blocked attempts** for analytics

**Implementation Points:**

```php
// In Controllers (before create)
$enforcement = app(PlanEnforcementService::class);
$canCreate = $enforcement->canCreate($account, 'assets');

if (!$canCreate['allowed']) {
    return redirect()->back()->with('error', [
        'message' => 'Asset limit reached',
        'limit' => $canCreate['limit'],
        'current' => $canCreate['current'],
        'upgrade_url' => route('tenant.billing.upgrade'),
    ]);
}

// In Observers (before creating)
public function creating(Asset $asset): void
{
    $account = tenant();
    $enforcement = app(PlanEnforcementService::class);
    
    if (!$enforcement->canCreate($account, 'assets')['allowed']) {
        throw new PlanLimitExceededException('Asset limit reached');
    }
}
```

**Resources to Gate:**
- Users (`users`)
- Assets (`assets`)
- Work Cells (`work_cells`)
- Work Orders per month (`work_orders_per_month`)
- Storage in GB (`storage_gb`)

**Feature Flags:**
- Scheduling Module (`scheduling`)
- Advanced Reporting (`advanced_reporting`)
- API Access (`api_access`)
- Priority Support (`priority_support`)
- Custom Integrations (`custom_integrations`)

### Soft Limits (Warnings)

**Warning Display:**
- Show warning banner when within 20% of limit (or custom threshold)
- Display in tenant dashboard
- Optional email notification at warning threshold

**Warning UI Component:**
```tsx
// PlanLimitWarning.tsx
interface PlanLimitWarningProps {
  resource: string;
  current: number;
  limit: number;
  threshold: number;
}

export function PlanLimitWarning({ resource, current, limit, threshold }: PlanLimitWarningProps) {
  const percentage = (current / limit) * 100;
  const isWarning = current >= threshold;
  
  if (!isWarning) return null;
  
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Approaching {resource} limit</AlertTitle>
      <AlertDescription>
        You're using {current} of {limit} {resource} ({percentage.toFixed(0)}%).
        <Link href="/billing/upgrade" className="ml-2 underline">
          Upgrade plan
        </Link>
      </AlertDescription>
    </Alert>
  );
}
```

### Downgrade Validation

Before allowing a downgrade, validate:

```php
public function validateDowngrade(Account $account, Plan $targetPlan): array
{
    $violations = [];
    $currentUsage = $this->getCurrentUsage($account);
    
    // Check each resource
    foreach (['users', 'assets', 'work_cells', 'storage_gb'] as $resource) {
        $targetLimit = $targetPlan->getLimit($resource);
        $currentCount = $currentUsage[$resource];
        
        if ($targetLimit !== -1 && $currentCount > $targetLimit) {
            $violations[$resource] = [
                'current' => $currentCount,
                'target_limit' => $targetLimit,
                'excess' => $currentCount - $targetLimit,
            ];
        }
    }
    
    return [
        'valid' => empty($violations),
        'violations' => $violations,
    ];
}
```

**Downgrade Prevention UI:**
- Show violations clearly
- Provide instructions to reduce usage
- Block downgrade button until compliant

---

## User Flows

### 1. New Account Signup Flow

**Steps:**
1. User visits landing page → clicks "Start Free Trial"
2. Registration form:
   - Company name
   - Subdomain
   - Admin name & email
   - Password
3. Plan selection (Starter/Professional/Enterprise)
4. Billing interval selection (Monthly/Annual)
5. **Credit card collection** (Stripe Elements)
6. Create account:
   - Create tenant in database
   - Create Stripe customer
   - Create subscription in trial mode
   - Trial ends in 30 days
7. Redirect to tenant dashboard

**Stripe API Calls:**
```php
// Create customer
$customer = $account->createAsStripeCustomer([
    'name' => $account->name,
    'email' => $adminEmail,
    'metadata' => [
        'account_id' => $account->id,
        'subdomain' => $account->subdomain,
    ],
]);

// Create subscription with trial
$subscription = $account->newSubscription('default', $plan->stripe_price_id_monthly)
    ->trialDays(30)
    ->create($paymentMethod);
```

### 2. Trial Expiration Flow

**Timeline:**
- **Day 0-30:** Trial period, full access
- **Day 25:** Email reminder "Trial ending in 5 days"
- **Day 28:** Email reminder "Trial ending in 2 days"
- **Day 30:** Trial ends
  - If payment succeeds → subscription becomes active
  - If payment fails → enter failed payment flow

**Webhook Handler:**
```php
// In WebhookController
public function handleCustomerSubscriptionUpdated(array $payload): void
{
    if ($payload['data']['object']['status'] === 'active' 
        && $payload['data']['object']['trial_end'] !== null) {
        // Trial converted to active subscription
        event(new TrialConvertedToActive($account));
    }
}
```

### 3. Failed Payment Flow

**Dunning Strategy:**
1. **Day 0:** Payment fails
   - Subscription status → `past_due`
   - Email: "Payment failed, we'll retry"
   - Account → Read-only mode
   
2. **Day 3:** Automatic retry
   - If succeeds → Restore full access
   - If fails → Email: "Payment failed again"
   
3. **Day 1-30:** Grace period
   - Read-only access continues
   - Display billing banner on all pages
   - Emails every 7 days
   
4. **Day 30:** Account deletion warning
   - Email: "Account will be deleted in 24 hours"
   
5. **Day 31:** Account deletion
   - Cancel subscription in Stripe
   - Delete tenant database
   - Delete account record
   - Email: "Account deleted"

**Read-Only Mode Implementation:**
```php
// Middleware: CheckAccountStatus
public function handle(Request $request, Closure $next)
{
    $account = tenant();
    $subscription = $account->subscription('default');
    
    if ($subscription && $subscription->past_due()) {
        // Allow only GET requests and billing pages
        if (!$request->isMethod('GET') && !$request->is('billing/*')) {
            return redirect()->route('tenant.billing.index')
                ->with('error', 'Account is in read-only mode due to payment issues.');
        }
    }
    
    return $next($request);
}
```

### 4. Plan Upgrade Flow

**User-Initiated:**
1. Tenant admin navigates to billing page
2. Clicks "Upgrade Plan"
3. Views plan comparison
4. Selects new plan + billing interval
5. Reviews prorated charges
6. Confirms upgrade
7. **Immediate access** to new features

**Stripe Handling:**
```php
// SubscriptionService
public function changeSubscription(
    Account $account, 
    Plan $newPlan, 
    string $billingInterval = 'monthly'
): Subscription {
    $priceId = $billingInterval === 'annual' 
        ? $newPlan->stripe_price_id_annual 
        : $newPlan->stripe_price_id_monthly;
    
    $subscription = $account->subscription('default');
    
    // Swap with proration
    $subscription->swap($priceId);
    
    // Update local plan_id
    $subscription->update(['plan_id' => $newPlan->id]);
    
    event(new SubscriptionPlanChanged($account, $newPlan));
    
    return $subscription;
}
```

**Proration:**
- Stripe automatically calculates prorated amount
- Invoice created immediately
- Charge attempted on default payment method
- If successful → Plan changed immediately

### 5. Plan Downgrade Flow

**With Validation:**
1. Tenant admin selects lower plan
2. System checks current usage vs. new limits
3. If violations exist:
   - Show violations list
   - Block downgrade
   - Provide remediation instructions
4. If compliant:
   - Review savings
   - Confirm downgrade
   - **Immediate downgrade** with proration (credit applied)

**Validation UI:**
```tsx
// DowngradeValidation.tsx
function DowngradeValidation({ violations, currentPlan, targetPlan }) {
  if (violations.length === 0) {
    return <DowngradeConfirmation />;
  }
  
  return (
    <Alert variant="destructive">
      <AlertTitle>Cannot downgrade to {targetPlan.name}</AlertTitle>
      <AlertDescription>
        <p>Your current usage exceeds the limits of the {targetPlan.name} plan:</p>
        <ul className="mt-2 space-y-1">
          {violations.map(v => (
            <li key={v.resource}>
              <strong>{v.resource}:</strong> {v.current} used, {v.target_limit} limit
              (reduce by {v.excess})
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Please reduce your usage before downgrading, or consider the {currentPlan.name} plan.
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

### 6. Cancellation Flow

**Self-Service Cancellation:**
1. Tenant admin → Billing → Cancel Subscription
2. Cancellation survey (optional, for analytics)
3. Choose cancellation timing:
   - Immediate (lose access now, prorated refund)
   - At period end (access until billing date)
4. Confirm cancellation
5. Email confirmation

**Stripe Implementation:**
```php
// Immediate cancellation
$account->subscription('default')->cancelNow();

// Cancel at period end (recommended)
$account->subscription('default')->cancel();
```

### 7. Billing Management (Customer Portal)

**Stripe Customer Portal:**
- Update payment method
- View invoices
- Download receipts
- View upcoming invoice
- Update billing email

**Integration:**
```php
// Generate portal session
Route::post('/billing/portal', function (Request $request) {
    return $request->user()->account->redirectToBillingPortal(
        route('tenant.billing.index')
    );
});
```

---

## Admin Portal Capabilities

### Admin Subscription Management

**Location:** `http://admin.localhost/accounts/{id}/subscription`

**Capabilities:**

1. **View Subscription Details:**
   - Current plan
   - Billing interval
   - Subscription status
   - Next billing date
   - Payment method (last 4 digits)
   - Stripe customer ID & subscription ID (for support)

2. **Change Plan Manually:**
   - Override plan without payment
   - Useful for custom deals, migrations
   - Logs action with admin user ID

3. **Apply Credits:**
   - Add account credit (balance)
   - Applies to next invoice
   - Can be used for goodwill, refunds, promotions

4. **Apply Discounts:**
   - Percentage or fixed amount
   - Duration: once, repeating, forever
   - Syncs with Stripe coupon

5. **View Payment History:**
   - All invoices
   - Payment statuses
   - Failed payments with retry info

6. **View Usage Stats:**
   - Current usage vs. plan limits
   - Storage consumption
   - API call counts (if applicable)

**Admin Controller Methods:**
```php
// app/Http/Controllers/Admin/SubscriptionManagementController.php

public function show(Account $account): Response
{
    return Inertia::render('admin/accounts/subscription', [
        'account' => $account->load('subscription.plan'),
        'usage' => app(PlanEnforcementService::class)->getCurrentUsage($account),
        'payments' => Payment::where('account_id', $account->id)
            ->latest()
            ->limit(20)
            ->get(),
    ]);
}

public function changePlan(Request $request, Account $account): RedirectResponse
{
    $validated = $request->validate([
        'plan_id' => 'required|exists:plans,id',
        'billing_interval' => 'required|in:monthly,annual',
        'reason' => 'required|string',
    ]);
    
    // Admin override - no payment validation
    app(SubscriptionService::class)->adminChangePlan(
        $account,
        Plan::find($validated['plan_id']),
        $validated['billing_interval'],
        $validated['reason'],
        auth()->id()
    );
    
    return back()->with('success', 'Plan changed successfully');
}

public function applyCredit(Request $request, Account $account): RedirectResponse
{
    $validated = $request->validate([
        'amount' => 'required|numeric|min:0.01',
        'description' => 'required|string',
    ]);
    
    app(SubscriptionService::class)->applyCredit(
        $account,
        $validated['amount'],
        $validated['description']
    );
    
    return back()->with('success', 'Credit applied successfully');
}

public function applyDiscount(Request $request, Account $account): RedirectResponse
{
    $validated = $request->validate([
        'type' => 'required|in:percentage,fixed',
        'value' => 'required|numeric|min:0',
        'duration' => 'required|in:once,repeating,forever',
        'duration_in_months' => 'required_if:duration,repeating|nullable|integer|min:1',
    ]);
    
    // Create Stripe coupon and apply to customer
    $discount = app(SubscriptionService::class)->applyDiscount($account, $validated);
    
    return back()->with('success', 'Discount applied successfully');
}
```

### Admin Plan Management

**Location:** `http://admin.localhost/plans`

**Capabilities:**
1. Create new plan
2. Edit existing plan (features, limits, warnings)
3. Update pricing (must sync with Stripe)
4. Activate/deactivate plan for signup
5. View active subscriptions per plan
6. Reorder plans (sort_order)

**Stripe Sync Considerations:**
- Prices in Stripe are immutable (can archive and create new)
- Plan features/limits stored in Laravel only
- Manual sync process or webhook listener

---

## Payment Operations

### Webhook Configuration

**Required Webhooks:**
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
invoice.payment_succeeded
invoice.payment_failed
invoice.finalized
payment_intent.succeeded
payment_intent.payment_failed
customer.updated
```

**Webhook Endpoint:**
- URL: `https://admin.maintenance-os.com/stripe/webhook`
- Handled by Cashier automatically
- Custom handlers for specific events

**Custom Webhook Handlers:**
```php
// In EventServiceProvider or WebhookController

protected function handleCustomerSubscriptionTrialWillEnd(array $payload): void
{
    $account = Account::where('stripe_id', $payload['data']['object']['customer'])->first();
    
    // Send reminder email
    Mail::to($account->admin_email)->send(new TrialEndingReminder($account));
}

protected function handleInvoicePaymentFailed(array $payload): void
{
    $account = Account::where('stripe_id', $payload['data']['object']['customer'])->first();
    
    // Schedule retry in 3 days
    ProcessFailedPaymentRetry::dispatch($account)->delay(now()->addDays(3));
    
    // Enable read-only mode
    $account->update(['status' => 'past_due']);
    
    // Send notification
    Mail::to($account->admin_email)->send(new PaymentFailedNotification($account));
}

protected function handleInvoicePaymentSucceeded(array $payload): void
{
    $account = Account::where('stripe_id', $payload['data']['object']['customer'])->first();
    
    // Restore full access if was past_due
    if ($account->status === 'past_due') {
        $account->update(['status' => 'active']);
    }
    
    // Record payment
    Payment::create([
        'account_id' => $account->id,
        'stripe_payment_intent_id' => $payload['data']['object']['payment_intent'],
        'amount' => $payload['data']['object']['amount_paid'] / 100,
        'currency' => strtoupper($payload['data']['object']['currency']),
        'status' => 'succeeded',
        'type' => 'subscription',
        'metadata' => $payload['data']['object'],
    ]);
}
```

### Tax Handling

**Stripe Tax Configuration:**
1. Enable Stripe Tax in Stripe Dashboard
2. Configure tax settings for US and Brazil
3. Cashier automatically adds tax to invoices

**Implementation:**
```php
// When creating subscription
$account->newSubscription('default', $plan->stripe_price_id_monthly)
    ->trialDays(30)
    ->create($paymentMethod, [
        'automatic_tax' => ['enabled' => true],
    ]);

// Account must have address for tax calculation
$account->updateStripeCustomer([
    'address' => [
        'line1' => $address,
        'city' => $city,
        'state' => $state,
        'postal_code' => $zip,
        'country' => $country,
    ],
]);
```

### Invoice Customization

**Add Logo to Invoices:**
```php
// In Stripe Dashboard
// Settings → Branding → Upload logo
// Logo automatically appears on all invoices
```

**Custom Invoice Metadata:**
```php
$subscription->update([
    'metadata' => [
        'account_subdomain' => $account->subdomain,
        'plan_name' => $plan->name,
    ],
]);
```

### Refund Processing

**Admin-Initiated Refunds:**
```php
public function processRefund(
    Account $account,
    string $paymentIntentId,
    float $amount = null,
    string $reason = 'requested_by_customer'
): void {
    $refund = $account->refund($paymentIntentId, [
        'amount' => $amount ? (int)($amount * 100) : null,
        'reason' => $reason,
        'metadata' => [
            'refunded_by_admin' => auth()->id(),
            'account_id' => $account->id,
        ],
    ]);
    
    // Log refund
    ActivityLog::create([
        'account_id' => $account->id,
        'admin_user_id' => auth()->id(),
        'action' => 'refund_processed',
        'metadata' => [
            'payment_intent_id' => $paymentIntentId,
            'refund_id' => $refund->id,
            'amount' => $amount,
        ],
    ]);
}
```

---

## Integration Details

### Environment Configuration

```env
# Stripe Keys (get from dashboard)
STRIPE_KEY=pk_test_xxxxx
STRIPE_SECRET=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Cashier Configuration
CASHIER_CURRENCY=usd
CASHIER_CURRENCY_LOCALE=en_US
CASHIER_LOGGER=daily

# Billing Portal
STRIPE_BILLING_PORTAL_URL=https://billing.stripe.com/p/login/xxxxx
```

### Configuration Files

**config/cashier.php:**
```php
return [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),
    'currency' => env('CASHIER_CURRENCY', 'usd'),
    'currency_locale' => env('CASHIER_CURRENCY_LOCALE', 'en'),
    'webhook' => [
        'secret' => env('STRIPE_WEBHOOK_SECRET'),
        'tolerance' => env('STRIPE_WEBHOOK_TOLERANCE', 300),
    ],
    'payment_method_types' => ['card'],
    'invoices' => [
        'days_until_due' => 30,
    ],
];
```

### Routes

**Tenant Routes (in tenant context):**
```php
// routes/tenant.php
Route::middleware(['auth', 'tenant.admin'])->group(function () {
    // Billing dashboard
    Route::get('/billing', [BillingController::class, 'index'])
        ->name('tenant.billing.index');
    
    // Plan upgrade
    Route::post('/billing/upgrade', [BillingController::class, 'upgrade'])
        ->name('tenant.billing.upgrade');
    
    // Stripe customer portal
    Route::post('/billing/portal', [BillingController::class, 'portal'])
        ->name('tenant.billing.portal');
    
    // Payment method update
    Route::get('/billing/payment-method', [BillingController::class, 'paymentMethod'])
        ->name('tenant.billing.payment-method');
    Route::post('/billing/payment-method', [BillingController::class, 'updatePaymentMethod']);
    
    // Invoices
    Route::get('/billing/invoices', [BillingController::class, 'invoices'])
        ->name('tenant.billing.invoices');
    Route::get('/billing/invoices/{invoice}', [BillingController::class, 'downloadInvoice'])
        ->name('tenant.billing.invoice.download');
});
```

**Central/Admin Routes:**
```php
// routes/central.php
Route::middleware(['auth:admin'])->prefix('admin')->group(function () {
    // Subscription management
    Route::get('/accounts/{account}/subscription', [SubscriptionManagementController::class, 'show'])
        ->name('admin.accounts.subscription');
    Route::post('/accounts/{account}/subscription/plan', [SubscriptionManagementController::class, 'changePlan'])
        ->name('admin.accounts.subscription.change-plan');
    Route::post('/accounts/{account}/subscription/credit', [SubscriptionManagementController::class, 'applyCredit'])
        ->name('admin.accounts.subscription.apply-credit');
    Route::post('/accounts/{account}/subscription/discount', [SubscriptionManagementController::class, 'applyDiscount'])
        ->name('admin.accounts.subscription.apply-discount');
    
    // Plan management
    Route::resource('plans', PlanController::class);
    Route::post('/plans/sync-stripe', [PlanController::class, 'syncWithStripe'])
        ->name('admin.plans.sync-stripe');
});

// Webhook (no auth, Stripe signature verification)
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook']);
```

### Frontend Components

**Stripe Elements (Payment Method Collection):**
```tsx
// PaymentMethodForm.tsx
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function PaymentMethodForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    const cardElement = elements.getElement(CardElement);
    
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });
    
    if (error) {
      onError(error.message);
    } else {
      onSuccess(paymentMethod.id);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      <Button type="submit" disabled={!stripe}>
        Save Payment Method
      </Button>
    </form>
  );
}
```

**Plan Selector:**
```tsx
// PlanSelector.tsx
interface PlanSelectorProps {
  plans: Plan[];
  currentPlanId?: number;
  billingInterval: 'monthly' | 'annual';
  onSelectPlan: (planId: number) => void;
  onChangeBillingInterval: (interval: 'monthly' | 'annual') => void;
}

export function PlanSelector({ 
  plans, 
  currentPlanId, 
  billingInterval,
  onSelectPlan,
  onChangeBillingInterval 
}: PlanSelectorProps) {
  return (
    <div>
      {/* Billing interval toggle */}
      <Tabs value={billingInterval} onValueChange={onChangeBillingInterval}>
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="annual">
            Annual <Badge variant="success">Save 20%</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingInterval={billingInterval}
            isCurrent={plan.id === currentPlanId}
            onSelect={() => onSelectPlan(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Security & Compliance

### Data Security

**PCI Compliance:**
- Never store credit card numbers
- Use Stripe Elements (PCI-compliant by default)
- Stripe handles all card data
- Store only: last 4 digits, brand, Stripe IDs

**Webhook Security:**
- Verify Stripe signatures (Cashier does this)
- Use HTTPS for webhook endpoint
- Log all webhook events
- Idempotency checks

**Database Security:**
- Encrypt sensitive metadata
- Separate billing data (central DB) from tenant data
- Audit logs for all billing changes
- Role-based access (tenant admin, system admin)

### Compliance

**Tax Compliance:**
- Stripe Tax handles tax collection
- Automatic tax calculation per location
- Tax ID collection for businesses
- Tax-compliant invoices

**GDPR Considerations:**
- Right to data export: Include billing data in export
- Right to deletion: Handle subscription cancellation + data removal
- Privacy policy: Mention Stripe as payment processor
- Data retention: Keep billing data per legal requirements even after account deletion

**Brazilian Regulations:**
- Accept Brazilian payment methods (consider Boleto for v2)
- CPF/CNPJ collection for tax purposes
- Portuguese language invoices (Stripe supports)

---

## Testing Strategy

### Unit Tests

**Test Coverage:**
```php
// tests/Unit/Services/SubscriptionServiceTest.php
it('creates trial subscription with correct plan', function () {
    $account = Account::factory()->create();
    $plan = Plan::factory()->create(['stripe_price_id_monthly' => 'price_test']);
    
    $service = app(SubscriptionService::class);
    $subscription = $service->createTrialSubscription($account, $plan, 'pm_test');
    
    expect($subscription)
        ->status->toBe('trialing')
        ->plan_id->toBe($plan->id);
});

it('validates downgrade constraints', function () {
    $account = Account::factory()->create();
    $currentPlan = Plan::factory()->create(['features' => ['assets' => 100]]);
    $targetPlan = Plan::factory()->create(['features' => ['assets' => 50]]);
    
    // Create 75 assets
    $account->run(fn() => Asset::factory()->count(75)->create());
    
    $service = app(SubscriptionService::class);
    $result = $service->validateDowngrade($account, $targetPlan);
    
    expect($result['valid'])->toBe(false);
    expect($result['violations'])->toHaveKey('assets');
});

it('enforces asset creation limits', function () {
    $account = Account::factory()->create();
    $plan = Plan::factory()->create(['features' => ['assets' => 5]]);
    $account->subscription()->create(['plan_id' => $plan->id, 'status' => 'active']);
    
    $account->run(fn() => Asset::factory()->count(5)->create());
    
    $service = app(PlanEnforcementService::class);
    $canCreate = $service->canCreate($account, 'assets');
    
    expect($canCreate['allowed'])->toBe(false);
    expect($canCreate['current'])->toBe(5);
    expect($canCreate['limit'])->toBe(5);
});
```

### Feature Tests

```php
// tests/Feature/Billing/SubscriptionTest.php
it('allows tenant admin to upgrade plan', function () {
    $account = tenancy()->create('test-tenant');
    tenancy()->initialize($account);
    
    $user = User::factory()->admin()->create();
    $starterPlan = Plan::factory()->starter()->create();
    $proPlan = Plan::factory()->professional()->create();
    
    $account->subscription()->create([
        'plan_id' => $starterPlan->id,
        'status' => 'active',
    ]);
    
    $this->actingAs($user)
        ->post(route('tenant.billing.upgrade'), [
            'plan_id' => $proPlan->id,
            'billing_interval' => 'monthly',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
    
    expect($account->fresh()->subscription->plan_id)->toBe($proPlan->id);
});

it('blocks resource creation when limit exceeded', function () {
    $account = tenancy()->create('test-tenant');
    tenancy()->initialize($account);
    
    $plan = Plan::factory()->create(['features' => ['assets' => 2]]);
    $account->subscription()->create(['plan_id' => $plan->id, 'status' => 'active']);
    $user = User::factory()->admin()->create();
    
    Asset::factory()->count(2)->create();
    
    $this->actingAs($user)
        ->post(route('tenant.assets.store'), [
            'name' => 'New Asset',
            'asset_type_code' => 'EQUIPMENT',
        ])
        ->assertSessionHasErrors();
});
```

### Integration Tests (Stripe)

**Use Stripe Test Mode:**
```php
// tests/Feature/Billing/StripeIntegrationTest.php
it('creates customer and subscription in Stripe', function () {
    $account = Account::factory()->create();
    $plan = Plan::factory()->create([
        'stripe_price_id_monthly' => config('test.stripe.price_id_starter_monthly'),
    ]);
    
    $paymentMethod = createTestPaymentMethod(); // Helper using Stripe test tokens
    
    $service = app(SubscriptionService::class);
    $subscription = $service->createTrialSubscription($account, $plan, $paymentMethod);
    
    // Verify in Stripe
    $stripeSubscription = $account->subscription('default')->asStripeSubscription();
    
    expect($stripeSubscription->status)->toBe('trialing');
    expect($stripeSubscription->trial_end)->toBeGreaterThan(now()->timestamp);
});

// Webhook tests
it('handles failed payment webhook', function () {
    $account = Account::factory()->create(['stripe_id' => 'cus_test123']);
    $account->subscription()->create(['status' => 'active']);
    
    $payload = [
        'type' => 'invoice.payment_failed',
        'data' => [
            'object' => [
                'customer' => 'cus_test123',
                'amount_due' => 2000,
            ],
        ],
    ];
    
    $this->postJson('/stripe/webhook', $payload, [
        'Stripe-Signature' => generateTestSignature($payload),
    ])->assertOk();
    
    expect($account->fresh()->status)->toBe('past_due');
});
```

### Manual Testing Checklist

**Before Production:**
- [ ] Sign up with test card (4242 4242 4242 4242)
- [ ] Complete trial and verify charge
- [ ] Upgrade plan and verify proration
- [ ] Downgrade plan (should work)
- [ ] Attempt downgrade with violations (should block)
- [ ] Try to exceed asset limit (should block)
- [ ] Test failed payment (use 4000 0000 0000 0341)
- [ ] Verify read-only mode activates
- [ ] Update payment method and retry
- [ ] Cancel subscription
- [ ] Access customer portal
- [ ] View and download invoice
- [ ] Admin: Change plan manually
- [ ] Admin: Apply credit
- [ ] Admin: Apply discount

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Install Cashier, setup database, basic subscription creation

**Tasks:**
1. Install Laravel Cashier
2. Run migrations (add Cashier columns)
3. Configure Stripe keys
4. Create/update Models (Account as Billable, Subscription, Plan)
5. Create SubscriptionService with basic methods
6. Create PlanEnforcementService skeleton
7. Write unit tests for core services

**Deliverables:**
- Cashier installed and configured
- Database schema updated
- Basic subscription creation working
- Tests passing

### Phase 2: Signup & Trial (Week 3-4)
**Goal:** Complete signup flow with trial

**Tasks:**
1. Create plan selection UI
2. Integrate Stripe Elements for payment method
3. Update registration controller to create subscription
4. Implement trial expiration handling
5. Create webhook handlers (basic)
6. Email notifications (trial ending, trial converted)
7. Write feature tests for signup flow

**Deliverables:**
- Complete signup flow
- Trial mechanism working
- Webhooks handling basic events
- Email notifications sent

### Phase 3: Plan Changes & Enforcement (Week 5-6)
**Goal:** Enable plan upgrades/downgrades with enforcement

**Tasks:**
1. Build tenant billing page UI
2. Implement plan upgrade flow
3. Implement plan downgrade with validation
4. Create PlanEnforcementService full implementation
5. Add enforcement to models (Observers)
6. Build limit warning components
7. Feature flag implementation
8. Write tests for enforcement

**Deliverables:**
- Tenant can upgrade/downgrade
- Limits enforced across system
- Warning messages display correctly
- Feature flags working

### Phase 4: Failed Payments & Recovery (Week 7)
**Goal:** Handle failed payments gracefully

**Tasks:**
1. Implement read-only mode middleware
2. Create dunning email sequence
3. Webhook handlers for payment failures
4. Auto-retry logic (3-day delay)
5. Grace period enforcement
6. Account deletion job (after 30 days)
7. Write tests for payment failure scenarios

**Deliverables:**
- Failed payment flow complete
- Read-only mode working
- Dunning emails sent
- Account deletion after grace period

### Phase 5: Admin Portal (Week 8)
**Goal:** Admin can manage subscriptions

**Tasks:**
1. Build admin subscription management UI
2. Implement manual plan changes
3. Credit application
4. Discount application
5. Payment history view
6. Usage statistics display
7. Admin action logging

**Deliverables:**
- Admin can manage all subscriptions
- Credits and discounts working
- Audit trail for admin actions

### Phase 6: Customer Portal & Polish (Week 9-10)
**Goal:** Tenant self-service + refinements

**Tasks:**
1. Integrate Stripe Customer Portal
2. Build custom billing dashboard
3. Invoice list and download
4. Payment method update UI
5. Cancellation flow
6. Polish all UI/UX
7. Comprehensive testing
8. Documentation

**Deliverables:**
- Complete tenant billing self-service
- Professional UI/UX
- All tests passing
- Documentation complete

### Phase 7: Production Deployment (Week 11)
**Goal:** Launch to production

**Tasks:**
1. Create production Stripe account
2. Configure production plans in Stripe
3. Sync plans to database
4. Set up production webhooks
5. Configure Stripe Tax
6. Add logo to invoices
7. Run final tests in production mode
8. Deploy to production
9. Monitor for issues

**Deliverables:**
- System live in production
- Monitoring in place
- Support documentation ready

---

## Future Considerations

### Phase 2 Features (Post-MVP)

**Enhanced Billing:**
- Multiple payment methods per account
- Brazilian payment methods (Boleto, PIX)
- Wire transfer option for Enterprise
- Custom invoicing for large accounts

**Advanced Plan Features:**
- Add-ons (extra storage, users, etc.)
- Metered billing for API usage
- Team seats (per-user pricing on top of plan)
- Usage-based pricing tiers

**Analytics & Reporting:**
- Subscription analytics dashboard
- MRR (Monthly Recurring Revenue) tracking
- Churn analysis
- Cohort analysis
- Revenue forecasting

**Marketing & Growth:**
- Affiliate program
- Referral credits
- Partner discounts
- Promotional campaigns
- Free plan (limited features)

**Enterprise Features:**
- Custom contracts
- Annual invoicing
- Purchase orders
- Multi-year agreements
- Volume discounts

**User Experience:**
- In-app upgrade prompts (contextual)
- Usage dashboards for tenants
- Predictive billing (estimated costs)
- Budget alerts
- Cost optimization recommendations

**Integrations:**
- QuickBooks sync
- Xero integration
- Salesforce integration
- HubSpot integration

---

## Appendices

### A. Stripe Products & Prices Setup

**In Stripe Dashboard:**

1. Navigate to Products
2. Create 3 products:

**Starter Plan:**
```
Name: Maintenance OS - Starter
Description: Perfect for small teams getting started
Prices:
  - Monthly: $20/month (recurring)
  - Annual: $192/year (recurring)
```

**Professional Plan:**
```
Name: Maintenance OS - Professional
Description: For growing businesses with advanced needs
Prices:
  - Monthly: $100/month (recurring)
  - Annual: $960/year (recurring)
```

**Enterprise Plan:**
```
Name: Maintenance OS - Enterprise
Description: For large organizations requiring maximum capacity
Prices:
  - Monthly: $500/month (recurring)
  - Annual: $4,800/year (recurring)
```

3. Copy Price IDs and add to database:
```sql
UPDATE plans SET 
  stripe_price_id_monthly = 'price_xxxxx',
  stripe_price_id_annual = 'price_yyyyy'
WHERE name = 'Starter';
```

### B. Webhook Configuration

**In Stripe Dashboard:**
1. Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://admin.maintenance-os.com/stripe/webhook`
3. Select events to send:
   - customer.subscription.*
   - invoice.*
   - payment_intent.*
   - customer.updated
4. Copy Signing Secret → `STRIPE_WEBHOOK_SECRET` in .env

### C. Database Schema Summary

**New Tables:**
- `subscription_items` - Required by Cashier
- `payments` - Payment history tracking

**Modified Tables:**
- `accounts` - Add Cashier columns (stripe_id, pm_type, pm_last_four)
- `subscriptions` - Rename stripe_subscription_id → stripe_id, add Cashier columns
- `plans` - Add Stripe product/price IDs, warning thresholds

### D. Environment Variables Checklist

```env
# Stripe
STRIPE_KEY=pk_live_xxxxx
STRIPE_SECRET=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Cashier
CASHIER_CURRENCY=usd
CASHIER_CURRENCY_LOCALE=en_US
CASHIER_LOGGER=daily

# App
APP_URL=https://maintenance-os.com
ADMIN_URL=https://admin.maintenance-os.com
```

### E. Common Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Requires Authentication (3D Secure): 4000 0025 0000 3155
```

### F. Cost Estimation

**Stripe Fees:**
- 2.9% + $0.30 per successful transaction (US)
- Brazilian cards: Higher (check Stripe pricing)
- Volume discounts available (negotiate after scale)

**Example Monthly Revenue (100 customers):**
- 60 Starter × $20 = $1,200
- 30 Professional × $100 = $3,000
- 10 Enterprise × $500 = $5,000
- **Total: $9,200/month**

**Stripe Fees:**
- ~$280/month (3% of $9,200)

### G. Support Resources

**Stripe Documentation:**
- https://stripe.com/docs/billing/subscriptions/overview
- https://stripe.com/docs/payments/payment-methods
- https://stripe.com/docs/tax

**Laravel Cashier:**
- https://laravel.com/docs/12.x/billing
- https://github.com/laravel/cashier-stripe

**Testing:**
- https://stripe.com/docs/testing

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | AI Assistant | Initial requirements document based on client specifications |

---

**Next Steps:**
1. Review and approve this requirements document
2. Set up development Stripe account
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews

---

**Questions or Clarifications:**
- Contact development team for technical questions
- Contact product owner for business logic questions
- Contact Stripe support for payment processing questions

