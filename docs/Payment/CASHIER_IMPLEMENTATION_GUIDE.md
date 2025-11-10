# Laravel Cashier Implementation Guide

**Version:** 1.0  
**For:** Maintenance OS Multi-Tenant SaaS  
**Laravel Version:** 12.x  
**Cashier Version:** 15.x

---

## Table of Contents

1. [Why Laravel Cashier?](#why-laravel-cashier)
2. [Cashier vs Direct Stripe Integration](#cashier-vs-direct-stripe-integration)
3. [Installation & Setup](#installation--setup)
4. [Multi-Tenancy Considerations](#multi-tenancy-considerations)
5. [Code Examples](#code-examples)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring & Debugging](#monitoring--debugging)

---

## Why Laravel Cashier?

### What is Laravel Cashier?

Laravel Cashier is an official Laravel package that provides an expressive, fluent interface to Stripe's subscription billing services. It handles almost all of the boilerplate subscription billing code you're dreading writing.

### Benefits for Your Project

**1. Reduced Development Time**
- Saves 4-6 weeks of development
- Pre-built webhook handlers
- Automatic invoice generation
- Built-in proration logic

**2. Maintained by Laravel Core Team**
- Regular updates with Laravel releases
- Security patches
- Community support
- Extensive documentation

**3. Battle-Tested**
- Used by thousands of Laravel apps
- Edge cases handled
- Proven in production at scale

**4. Multi-Tenant Friendly**
- Works with any billable model (your `Account` model)
- Central database compatible
- No tenant context issues

**5. Feature Complete**
- Subscriptions with trials
- Plan swapping with proration
- Quantity-based billing (if needed later)
- Metered billing support
- Webhook security
- Payment method management
- Invoice generation
- Customer portal integration

### What Cashier Does NOT Do

**You Still Need to Handle:**
- Plan feature enforcement (usage limits)
- Business logic (when to block users)
- UI/UX for billing pages
- Email notifications (trial ending, etc.)
- Account suspension logic
- Plan feature definitions

---

## Cashier vs Direct Stripe Integration

### Comparison Table

| Feature | Laravel Cashier | Direct Stripe API | Recommendation |
|---------|----------------|-------------------|----------------|
| **Setup Time** | 1-2 hours | 2-3 days | ✅ Cashier |
| **Subscription Creation** | 3 lines of code | 50+ lines | ✅ Cashier |
| **Webhook Handling** | Automatic | Manual implementation | ✅ Cashier |
| **Security** | Built-in signature verification | Manual implementation | ✅ Cashier |
| **Proration** | Automatic | Manual calculation | ✅ Cashier |
| **Invoice Generation** | Automatic | Manual | ✅ Cashier |
| **Flexibility** | High (can use Stripe API directly too) | Complete control | ✅ Cashier |
| **Learning Curve** | Low (Laravel-style) | Medium (Stripe API) | ✅ Cashier |
| **Maintenance** | Low | High | ✅ Cashier |
| **Customization** | Very good | Complete | Tie |
| **Multi-Currency** | Supported | Supported | Tie |
| **Tax Collection** | Supported (Stripe Tax) | Supported | Tie |

### Verdict: Use Laravel Cashier

**Why:**
1. **Minimal Risk:** Proven, stable package
2. **Time Savings:** 80% less code to write
3. **Best Practices:** Follows Laravel conventions
4. **Future-Proof:** Regular updates
5. **Extensible:** Can use Stripe API for custom needs

**When You Might Need Direct Stripe API:**
- Complex marketplace scenarios (not your case)
- Multiple payment processors (not planned)
- Extremely custom billing logic (not needed)

---

## Installation & Setup

### Step 1: Install Cashier

```bash
composer require laravel/cashier
```

### Step 2: Publish Configuration

```bash
php artisan vendor:publish --tag="cashier-config"
php artisan vendor:publish --tag="cashier-migrations"
```

This creates:
- `config/cashier.php` - Configuration file
- `database/migrations/*_create_customer_columns.php` - Migration for billable model
- `database/migrations/*_create_subscriptions_table.php` - Subscription table
- `database/migrations/*_create_subscription_items_table.php` - Subscription items

### Step 3: Customize Migrations for Multi-Tenancy

**Important:** Cashier's default migrations assume tenant context. We need central database.

**Original Migration (DO NOT USE):**
```php
// Default Cashier migration
Schema::create('subscriptions', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id');  // ❌ We need account_id
    // ...
});
```

**Customized Migration (USE THIS):**
```php
// database/migrations/central/XXXX_update_subscriptions_for_cashier.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        // We already have subscriptions table, just add Cashier columns
        Schema::table('subscriptions', function (Blueprint $table) {
            // Cashier required columns
            $table->string('type')->default('default')->after('account_id');
            $table->string('stripe_price')->nullable()->after('stripe_id');
            $table->integer('quantity')->nullable()->after('stripe_price');
            
            // Rename stripe_subscription_id to stripe_id (Cashier convention)
            // Do this manually via raw SQL if needed:
            // ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO stripe_id;
        });
        
        // Add to accounts table
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('stripe_id')->nullable()->unique()->after('id');
            $table->string('pm_type')->nullable()->after('stripe_id');
            $table->string('pm_last_four', 4)->nullable()->after('pm_type');
            
            $table->index('stripe_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['type', 'stripe_price', 'quantity']);
        });
        
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['stripe_id', 'pm_type', 'pm_last_four']);
        });
    }
};
```

**Create Subscription Items Table:**
```php
// database/migrations/central/XXXX_create_subscription_items_table.php
return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        Schema::create('subscription_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subscription_id');
            $table->string('stripe_id')->unique();
            $table->string('stripe_product');
            $table->string('stripe_price');
            $table->integer('quantity')->nullable();
            $table->timestamps();

            $table->foreign('subscription_id')
                ->references('id')
                ->on('subscriptions')
                ->onDelete('cascade');
            
            $table->index('subscription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_items');
    }
};
```

### Step 4: Run Migrations

```bash
php artisan migrate --path=database/migrations/central
```

### Step 5: Configure Environment

```env
STRIPE_KEY=pk_test_xxxxx
STRIPE_SECRET=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

CASHIER_CURRENCY=usd
CASHIER_CURRENCY_LOCALE=en_US
CASHIER_MODEL=App\Models\Account
```

### Step 6: Update Account Model

```php
namespace App\Models;

use Laravel\Cashier\Billable;

class Account extends Model implements Tenant, TenantWithDatabase
{
    use Billable;
    use CentralConnection;
    // ... other traits
    
    protected $connection = 'central';
    
    /**
     * Get the billable entity name.
     */
    public function stripeName(): string
    {
        return $this->name;
    }
    
    /**
     * Get the billable entity email.
     */
    public function stripeEmail(): ?string
    {
        return $this->metadata['admin_email'] ?? null;
    }
}
```

### Step 7: Configure Cashier

**config/cashier.php:**
```php
return [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),
    
    // USD for now, multi-currency later
    'currency' => env('CASHIER_CURRENCY', 'usd'),
    'currency_locale' => env('CASHIER_CURRENCY_LOCALE', 'en'),
    
    // Webhook configuration
    'webhook' => [
        'secret' => env('STRIPE_WEBHOOK_SECRET'),
        'tolerance' => env('STRIPE_WEBHOOK_TOLERANCE', 300),
    ],
    
    // Payment methods
    'payment_method_types' => ['card'],
    
    // Invoice configuration
    'invoices' => [
        'days_until_due' => 30,
    ],
    
    // Logger
    'logger' => env('CASHIER_LOGGER'),
];
```

---

## Multi-Tenancy Considerations

### Key Differences from Standard Laravel App

**1. Billable Model is Account (not User)**
```php
// Standard Laravel app
$user = auth()->user();
$user->newSubscription('default', 'price_xxxx')->create($paymentMethod);

// Your multi-tenant app
$account = tenant();  // or Account::find($id)
$account->newSubscription('default', 'price_xxxx')->create($paymentMethod);
```

**2. Central Database for All Billing**
- All subscription data in central database
- No tenant context needed for billing operations
- Webhook processing happens in central context

**3. Stripe Customer Per Account**
- One Stripe customer = One tenant account
- Not one customer per user
- Users within tenant don't have their own Stripe records

**4. Subscription Access Control**
- Only tenant admins can manage billing
- Regular users don't see billing pages
- Admin portal can override

### Middleware Setup

**Tenant Billing Access:**
```php
// app/Http/Middleware/TenantBillingAccess.php
namespace App\Http\Middleware;

class TenantBillingAccess
{
    public function handle(Request $request, Closure $next)
    {
        // Ensure user is authenticated
        if (!auth()->check()) {
            return redirect()->route('login');
        }
        
        // Ensure user is tenant admin
        if (!auth()->user()->isTenantAdmin()) {
            abort(403, 'Only tenant administrators can manage billing.');
        }
        
        return $next($request);
    }
}
```

**Register in bootstrap/app.php:**
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'tenant.billing' => \App\Http\Middleware\TenantBillingAccess::class,
    ]);
})
```

---

## Code Examples

### Creating a Subscription (Signup Flow)

```php
namespace App\Http\Controllers\Auth;

use App\Models\Account;
use App\Models\Central\Plan;
use Illuminate\Http\Request;

class TenantRegistrationController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'subdomain' => 'required|string|unique:domains,domain',
            'admin_email' => 'required|email',
            'admin_name' => 'required|string',
            'password' => 'required|string|min:8',
            'plan_id' => 'required|exists:plans,id',
            'billing_interval' => 'required|in:monthly,annual',
            'payment_method' => 'required|string',  // Stripe PM ID from frontend
        ]);
        
        $plan = Plan::findOrFail($validated['plan_id']);
        
        // Create account (tenant)
        $account = Account::create([
            'name' => $validated['name'],
            'subdomain' => $validated['subdomain'],
            'status' => 'trialing',
            'metadata' => [
                'admin_email' => $validated['admin_email'],
                'admin_name' => $validated['admin_name'],
            ],
        ]);
        
        try {
            // Get correct price ID based on interval
            $priceId = $validated['billing_interval'] === 'annual'
                ? $plan->stripe_price_id_annual
                : $plan->stripe_price_id_monthly;
            
            // Create Stripe customer and subscription
            $subscription = $account->newSubscription('default', $priceId)
                ->trialDays($plan->trial_days)
                ->create($validated['payment_method'], [
                    'email' => $validated['admin_email'],
                    'name' => $validated['name'],
                    'metadata' => [
                        'account_id' => $account->id,
                        'subdomain' => $account->subdomain,
                    ],
                ]);
            
            // Store plan_id in subscription
            $subscription->update(['plan_id' => $plan->id]);
            
            // Create admin user in tenant context
            $account->run(function () use ($validated) {
                $user = User::create([
                    'name' => $validated['admin_name'],
                    'email' => $validated['admin_email'],
                    'password' => Hash::make($validated['password']),
                ]);
                
                // Make first user admin
                $user->assignRole('Admin');
            });
            
            // Send welcome email
            Mail::to($validated['admin_email'])
                ->send(new WelcomeEmail($account));
            
            // Log activity
            activity()
                ->performedOn($account)
                ->event('account_created')
                ->log('Account created with trial subscription');
            
            return redirect()
                ->to('https://' . $account->subdomain . '.' . config('app.domain') . '/login')
                ->with('success', 'Account created! Your trial starts now.');
            
        } catch (\Exception $e) {
            // Rollback: delete account and Stripe customer
            if ($account->stripe_id) {
                $account->asStripeCustomer()->delete();
            }
            $account->delete();
            
            Log::error('Subscription creation failed', [
                'error' => $e->getMessage(),
                'account_id' => $account->id,
            ]);
            
            return back()->withErrors([
                'payment_method' => 'Failed to create subscription. Please try again.',
            ]);
        }
    }
}
```

### Upgrading a Subscription

```php
namespace App\Http\Controllers\Tenant;

use App\Models\Account;
use App\Models\Central\Plan;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}
    
    public function index()
    {
        $account = tenant();
        $subscription = $account->subscription('default');
        
        return Inertia::render('tenant/billing/index', [
            'account' => $account,
            'subscription' => [
                'plan' => $subscription->plan,
                'status' => $subscription->stripe_status,
                'trial_ends_at' => $subscription->trial_ends_at,
                'ends_at' => $subscription->ends_at,
                'on_trial' => $subscription->onTrial(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'canceled' => $subscription->canceled(),
            ],
            'payment_method' => [
                'type' => $account->pm_type,
                'last_four' => $account->pm_last_four,
            ],
            'plans' => Plan::where('is_active', true)->get(),
        ]);
    }
    
    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_interval' => 'required|in:monthly,annual',
        ]);
        
        $account = tenant();
        $newPlan = Plan::findOrFail($validated['plan_id']);
        $currentSubscription = $account->subscription('default');
        
        // Validate upgrade (not downgrade with violations)
        if ($newPlan->price < $currentSubscription->plan->price) {
            $validation = $this->subscriptionService->validateDowngrade($account, $newPlan);
            
            if (!$validation['valid']) {
                return back()->withErrors([
                    'plan' => 'Cannot downgrade to this plan due to usage constraints.',
                    'violations' => $validation['violations'],
                ]);
            }
        }
        
        try {
            $priceId = $validated['billing_interval'] === 'annual'
                ? $newPlan->stripe_price_id_annual
                : $newPlan->stripe_price_id_monthly;
            
            // Swap subscription (Cashier handles proration)
            $currentSubscription->swap($priceId);
            
            // Update our plan reference
            $currentSubscription->update(['plan_id' => $newPlan->id]);
            
            // Log activity
            activity()
                ->performedOn($account)
                ->event('subscription_changed')
                ->withProperties([
                    'old_plan' => $currentSubscription->plan->name,
                    'new_plan' => $newPlan->name,
                    'interval' => $validated['billing_interval'],
                ])
                ->log('Subscription plan changed');
            
            return redirect()
                ->route('tenant.billing.index')
                ->with('success', 'Plan updated successfully!');
            
        } catch (\Exception $e) {
            Log::error('Plan upgrade failed', [
                'error' => $e->getMessage(),
                'account_id' => $account->id,
                'new_plan_id' => $newPlan->id,
            ]);
            
            return back()->withErrors([
                'plan' => 'Failed to update plan. Please try again or contact support.',
            ]);
        }
    }
}
```

### Handling Webhooks

**Default Webhook Controller (Cashier provides this):**

Cashier automatically handles webhooks at `/stripe/webhook` route. It processes:
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Custom Webhook Handlers:**

```php
namespace App\Http\Controllers;

use App\Models\Account;
use App\Notifications\TrialEndingReminder;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierController;

class StripeWebhookController extends CashierController
{
    /**
     * Handle customer subscription trial will end.
     */
    public function handleCustomerSubscriptionTrialWillEnd(array $payload): void
    {
        $account = $this->getAccountFromPayload($payload);
        
        if ($account) {
            // Send email 5 days before trial ends
            $account->notify(new TrialEndingReminder($account));
            
            Log::info('Trial ending reminder sent', [
                'account_id' => $account->id,
                'trial_ends_at' => $account->subscription('default')->trial_ends_at,
            ]);
        }
    }
    
    /**
     * Handle invoice payment failed.
     */
    public function handleInvoicePaymentFailed(array $payload): void
    {
        // Cashier already updates subscription status to 'past_due'
        // We add custom logic for read-only mode
        
        $account = $this->getAccountFromPayload($payload);
        
        if ($account) {
            // Update account status
            $account->update(['status' => 'past_due']);
            
            // Schedule retry in 3 days
            \App\Jobs\RetryFailedPayment::dispatch($account)
                ->delay(now()->addDays(3));
            
            // Send notification
            $account->notify(new PaymentFailedNotification($account, $payload['data']['object']));
            
            Log::warning('Payment failed', [
                'account_id' => $account->id,
                'invoice_id' => $payload['data']['object']['id'],
                'amount' => $payload['data']['object']['amount_due'],
            ]);
        }
    }
    
    /**
     * Handle invoice payment succeeded.
     */
    public function handleInvoicePaymentSucceeded(array $payload): void
    {
        $account = $this->getAccountFromPayload($payload);
        
        if ($account) {
            // Restore active status if was past_due
            if ($account->status === 'past_due') {
                $account->update(['status' => 'active']);
                
                Log::info('Account restored from past_due', [
                    'account_id' => $account->id,
                ]);
            }
            
            // Record payment (for history)
            \App\Models\Central\Payment::create([
                'account_id' => $account->id,
                'stripe_payment_intent_id' => $payload['data']['object']['payment_intent'],
                'amount' => $payload['data']['object']['amount_paid'] / 100,
                'currency' => strtoupper($payload['data']['object']['currency']),
                'status' => 'succeeded',
                'type' => 'subscription',
                'metadata' => $payload['data']['object'],
            ]);
        }
    }
    
    /**
     * Get account from webhook payload.
     */
    private function getAccountFromPayload(array $payload): ?Account
    {
        $customerId = $payload['data']['object']['customer'] ?? null;
        
        if (!$customerId) {
            return null;
        }
        
        return Account::where('stripe_id', $customerId)->first();
    }
}
```

**Register Custom Webhook Controller:**

```php
// routes/central.php (or web.php in central context)

use App\Http\Controllers\StripeWebhookController;

Route::post(
    'stripe/webhook',
    [StripeWebhookController::class, 'handleWebhook']
)->name('cashier.webhook');
```

### Customer Portal Integration

**Simplest Approach (Recommended):**

```php
// In BillingController
public function portal(Request $request)
{
    return $request->user()
        ->account
        ->redirectToBillingPortal(
            route('tenant.billing.index')  // Return URL
        );
}
```

**Route:**
```php
Route::post('/billing/portal', [BillingController::class, 'portal'])
    ->name('tenant.billing.portal');
```

**Frontend Button:**
```tsx
<form method="POST" action={route('tenant.billing.portal')}>
  <Button type="submit">
    Manage Billing
  </Button>
</form>
```

### Canceling Subscription

```php
// Cancel at period end (recommended)
$account->subscription('default')->cancel();

// Cancel immediately with refund
$account->subscription('default')->cancelNow();

// Resume canceled subscription (before period ends)
$account->subscription('default')->resume();
```

---

## Common Pitfalls & Solutions

### 1. Webhook Signature Verification Failures

**Problem:** Webhooks return 400 errors

**Solution:**
```bash
# Ensure webhook secret is correct
php artisan tinker
>>> config('cashier.webhook.secret')
```

**Testing Locally:**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:8000/stripe/webhook

# Copy webhook signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 2. Subscription Status Mismatch

**Problem:** Local subscription status doesn't match Stripe

**Solution:**
```php
// Sync subscription from Stripe
$subscription = $account->subscription('default');
$subscription->syncStripeStatus();

// Or manually:
$stripeSubscription = $subscription->asStripeSubscription();
$subscription->update([
    'stripe_status' => $stripeSubscription->status,
    'ends_at' => $stripeSubscription->cancel_at 
        ? Carbon::createFromTimestamp($stripeSubscription->cancel_at) 
        : null,
]);
```

### 3. Trial Not Working

**Problem:** Customer charged immediately

**Solution:**
```php
// Ensure trial_days is set
$account->newSubscription('default', $priceId)
    ->trialDays(30)  // ← Don't forget this
    ->create($paymentMethod);

// Check if trial is active
$subscription->onTrial();  // true/false
$subscription->trial_ends_at;  // Carbon instance
```

### 4. Proration Issues

**Problem:** Unexpected charges when swapping plans

**Solution:**
```php
// Proration is automatic in Cashier
// To disable proration (not recommended):
$subscription->noProrate()->swap($newPriceId);

// To anchor billing to specific date:
$subscription->anchorBillingCycleOn(
    now()->addMonth()->startOfMonth()
)->swap($newPriceId);
```

### 5. Multiple Subscriptions

**Problem:** Account has multiple subscriptions

**Solution:**
```php
// We use 'default' type, but you can have multiple:
$account->newSubscription('default', $priceId)->create($pm);
$account->newSubscription('addon', $addonPriceId)->create();

// Access specific subscription:
$account->subscription('default');
$account->subscription('addon');

// For our case, stick to one subscription type: 'default'
```

---

## Performance Optimization

### 1. Cache Subscription Status

```php
// In Account model
public function getCachedSubscriptionStatus(): string
{
    return Cache::remember(
        "account_{$this->id}_subscription_status",
        60,  // 1 minute
        fn() => $this->subscription('default')->stripe_status
    );
}

// Clear cache on webhook events
public function clearSubscriptionCache(): void
{
    Cache::forget("account_{$this->id}_subscription_status");
}
```

### 2. Eager Load Relationships

```php
// When listing accounts in admin panel
$accounts = Account::with(['subscription.plan'])
    ->paginate(50);

// Access without N+1 queries
foreach ($accounts as $account) {
    echo $account->subscription->plan->name;  // No extra query
}
```

### 3. Webhook Queue Processing

**Important:** Cashier processes webhooks synchronously by default.

**For better performance:**

```php
// In your WebhookController
public function handleInvoicePaymentSucceeded(array $payload): void
{
    // Dispatch job instead of processing inline
    \App\Jobs\ProcessSuccessfulPayment::dispatch($payload);
}
```

**Queue Configuration:**
```php
// config/queue.php
'connections' => [
    'stripe-webhooks' => [
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'stripe-webhooks',
        'retry_after' => 300,
    ],
],
```

### 4. Stripe API Request Optimization

```php
// Batch API calls when possible
$account->updateStripeCustomer([
    'email' => $newEmail,
    'name' => $newName,
    'address' => $address,  // All in one API call
]);

// Instead of:
$customer->email = $newEmail;  // 1 API call
$customer->name = $newName;    // 2nd API call
$customer->address = $address; // 3rd API call
```

---

## Monitoring & Debugging

### Logging Stripe Events

```php
// config/cashier.php
'logger' => env('CASHIER_LOGGER', 'daily'),

// Creates logs in storage/logs/cashier-YYYY-MM-DD.log
```

### Useful Artisan Commands

```bash
# Test webhook locally
stripe trigger customer.subscription.created

# Listen to all webhook events
stripe listen --forward-to localhost:8000/stripe/webhook

# View Stripe customer in browser
stripe customers retrieve cus_xxxxx

# View subscription
stripe subscriptions retrieve sub_xxxxx
```

### Debugging Queries

```php
// In tinker
$account = Account::find('uuid-here');

// Check Stripe customer
$account->asStripeCustomer();  // Returns Stripe\Customer object

// Check subscription in Stripe
$account->subscription('default')->asStripeSubscription();  // Returns Stripe\Subscription

// Check all invoices
$account->invoices();

// Upcoming invoice
$account->upcomingInvoice();

// Check payment methods
$account->defaultPaymentMethod();
$account->paymentMethods();
```

### Common Errors & Fixes

**Error: No such customer**
```php
// Stripe customer was deleted
$account->stripe_id = null;
$account->save();
$account->createAsStripeCustomer();  // Recreate
```

**Error: No such subscription**
```php
// Subscription deleted in Stripe but not locally
$subscription->delete();  // Remove local record
```

**Error: This customer has no attached payment source**
```php
// Add payment method
$account->updateDefaultPaymentMethod($paymentMethodId);
```

---

## Next Steps

1. **Review this guide** with your requirements document
2. **Set up test Stripe account**
3. **Install Cashier** and run migrations
4. **Test basic subscription creation** in development
5. **Implement webhook handlers** for your specific needs
6. **Build UI components** for billing pages
7. **Test all flows** with Stripe test cards
8. **Deploy to production** with production Stripe keys

---

## Additional Resources

- [Laravel Cashier Documentation](https://laravel.com/docs/12.x/billing)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Event Reference](https://stripe.com/docs/api/events/types)
- [Cashier GitHub Repo](https://github.com/laravel/cashier-stripe)

---

**Questions?**
- Cashier questions: [Laravel Discord #cashier](https://discord.gg/laravel)
- Stripe questions: [Stripe Support](https://support.stripe.com/)
- Implementation questions: Contact development team

