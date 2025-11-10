# Stripe Integration Implementation Checklist

**Project:** Maintenance OS  
**Version:** 1.0  
**Last Updated:** November 10, 2025

---

## Pre-Implementation Setup

### Stripe Account Setup
- [ ] Create Stripe account (test mode first)
- [ ] Enable Stripe Tax in dashboard
- [ ] Configure tax settings for US & Brazil
- [ ] Upload company logo for invoices
- [ ] Create webhook endpoint (will configure URL later)
- [ ] Copy API keys to secure location

### Create Products & Prices in Stripe Dashboard

**Starter Plan:**
- [ ] Create product "Maintenance OS - Starter"
- [ ] Create price: $20/month (recurring monthly)
- [ ] Create price: $192/year (recurring yearly)
- [ ] Copy price IDs

**Professional Plan:**
- [ ] Create product "Maintenance OS - Professional"
- [ ] Create price: $100/month (recurring monthly)
- [ ] Create price: $960/year (recurring yearly)
- [ ] Copy price IDs

**Enterprise Plan:**
- [ ] Create product "Maintenance OS - Enterprise"
- [ ] Create price: $500/month (recurring monthly)
- [ ] Create price: $4,800/year (recurring yearly)
- [ ] Copy price IDs

---

## Phase 1: Foundation (Week 1-2)

### Installation
- [ ] `composer require laravel/cashier`
- [ ] `php artisan vendor:publish --tag="cashier-config"`
- [ ] `php artisan vendor:publish --tag="cashier-migrations"`
- [ ] Review generated migrations
- [ ] Customize migrations for central database multi-tenancy

### Database Setup
- [ ] Create migration to add Cashier columns to `accounts` table
  - [ ] `stripe_id`
  - [ ] `pm_type`
  - [ ] `pm_last_four`
- [ ] Create migration to update `subscriptions` table
  - [ ] Rename `stripe_subscription_id` to `stripe_id`
  - [ ] Add `type` column (default: 'default')
  - [ ] Add `stripe_price` column
  - [ ] Add `quantity` column
- [ ] Create `subscription_items` table migration
- [ ] Create `payments` table migration (for payment history)
- [ ] Update `plans` table migration
  - [ ] Add `stripe_product_id`
  - [ ] Add `stripe_price_id_monthly`
  - [ ] Add `stripe_price_id_annual`
  - [ ] Add `warning_thresholds` JSONB column
  - [ ] Add `is_available_for_signup` boolean
- [ ] Run migrations: `php artisan migrate --path=database/migrations/central`

### Configuration
- [ ] Update `.env` with Stripe keys
  ```env
  STRIPE_KEY=pk_test_xxxxx
  STRIPE_SECRET=sk_test_xxxxx
  STRIPE_WEBHOOK_SECRET=whsec_xxxxx
  CASHIER_CURRENCY=usd
  CASHIER_CURRENCY_LOCALE=en_US
  CASHIER_LOGGER=daily
  ```
- [ ] Review `config/cashier.php`
- [ ] Update production `.env.example` with Stripe variables

### Model Updates
- [ ] Add `Billable` trait to `Account` model
- [ ] Implement `stripeName()` method
- [ ] Implement `stripeEmail()` method
- [ ] Update `Subscription` model to work with Cashier
- [ ] Update `Plan` model with Stripe price IDs
- [ ] Update `Plan` factory with test price IDs

### Seed Plans
- [ ] Update `PlansSeeder` with Stripe price IDs
- [ ] Seed plans: `php artisan db:seed --class=PlansSeeder`
- [ ] Verify in database

### Service Layer
- [ ] Create `app/Services/SubscriptionService.php`
  - [ ] `createTrialSubscription()`
  - [ ] `changeSubscription()`
  - [ ] `validateDowngrade()`
  - [ ] `cancelSubscription()`
  - [ ] `resumeSubscription()`
  - [ ] `applyCredit()`
  - [ ] `processRefund()`
- [ ] Create `app/Services/PlanEnforcementService.php`
  - [ ] `canCreate()`
  - [ ] `getCurrentUsage()`
  - [ ] `hasFeature()`
  - [ ] `getWarnings()`

### Unit Tests
- [ ] Test `SubscriptionService::createTrialSubscription()`
- [ ] Test `SubscriptionService::validateDowngrade()`
- [ ] Test `PlanEnforcementService::canCreate()`
- [ ] Test `PlanEnforcementService::getCurrentUsage()`
- [ ] All tests passing: `php artisan test --filter=Subscription`

---

## Phase 2: Signup & Trial (Week 3-4)

### Frontend Components
- [ ] Install Stripe.js: `npm install @stripe/stripe-js @stripe/react-stripe-js`
- [ ] Create `PaymentMethodForm.tsx` component
- [ ] Create `PlanSelector.tsx` component
- [ ] Create `PlanCard.tsx` component
- [ ] Create `BillingIntervalToggle.tsx` component

### Registration Flow
- [ ] Update registration page with plan selection
- [ ] Add payment method collection step
- [ ] Update `TenantRegistrationController::store()`
  - [ ] Create account
  - [ ] Create Stripe customer
  - [ ] Create subscription with trial
  - [ ] Handle errors and rollback
- [ ] Test signup flow end-to-end
- [ ] Test with Stripe test cards

### Webhook Setup
- [ ] Create `StripeWebhookController` extending Cashier's
- [ ] Implement `handleCustomerSubscriptionTrialWillEnd()`
- [ ] Implement `handleInvoicePaymentSucceeded()`
- [ ] Implement `handleInvoicePaymentFailed()`
- [ ] Add webhook route: `POST /stripe/webhook`
- [ ] Test webhooks with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:8000/stripe/webhook
  ```

### Email Notifications
- [ ] Create `TrialEndingReminder` mailable
- [ ] Create `TrialConvertedToActive` mailable
- [ ] Create `WelcomeEmail` mailable
- [ ] Test email sending

### Feature Tests
- [ ] Test complete signup flow
- [ ] Test trial creation
- [ ] Test webhook handling
- [ ] All tests passing: `php artisan test --filter=Registration`

---

## Phase 3: Plan Changes & Enforcement (Week 5-6)

### Tenant Billing Pages
- [ ] Create `resources/js/pages/tenant/billing/index.tsx`
- [ ] Display current subscription info
- [ ] Show plan comparison
- [ ] Add upgrade/downgrade buttons
- [ ] Create `BillingController` with methods:
  - [ ] `index()`
  - [ ] `upgrade()`
  - [ ] `paymentMethod()`
  - [ ] `updatePaymentMethod()`
  - [ ] `invoices()`
  - [ ] `downloadInvoice()`
  - [ ] `portal()`

### Plan Change Logic
- [ ] Implement upgrade flow
- [ ] Implement downgrade with validation
- [ ] Show violations UI when downgrade blocked
- [ ] Test proration calculations
- [ ] Test immediate access to new features

### Enforcement Implementation
- [ ] Add enforcement to `AssetObserver::creating()`
- [ ] Add enforcement to `UserObserver::creating()`
- [ ] Add enforcement to `WorkCellObserver::creating()`
- [ ] Add enforcement to `WorkOrderObserver::creating()`
- [ ] Create `CheckStorageLimit` middleware
- [ ] Create `CheckFeatureAccess` middleware

### Warning System
- [ ] Create `PlanLimitWarning.tsx` component
- [ ] Add warnings to dashboard
- [ ] Create `GetPlanWarnings` query/service
- [ ] Display warnings when approaching limits

### Feature Flags
- [ ] Implement feature flag check for Scheduling module
- [ ] Implement feature flag check for Advanced Reporting
- [ ] Implement feature flag check for API Access
- [ ] Hide/show features based on plan

### Routes
- [ ] Add tenant billing routes to `routes/tenant.php`
- [ ] Add `tenant.billing` middleware
- [ ] Test route access control

### Feature Tests
- [ ] Test plan upgrade
- [ ] Test plan downgrade (success case)
- [ ] Test plan downgrade (blocked by violations)
- [ ] Test asset creation limit enforcement
- [ ] Test user creation limit enforcement
- [ ] Test feature access gating
- [ ] All tests passing: `php artisan test --filter=Billing`

---

## Phase 4: Failed Payments & Recovery (Week 7)

### Read-Only Mode
- [ ] Create `CheckAccountStatus` middleware
- [ ] Block POST/PUT/DELETE when `past_due`
- [ ] Allow GET requests and billing pages
- [ ] Add banner to all pages when `past_due`
- [ ] Test read-only mode behavior

### Dunning Process
- [ ] Create `PaymentFailedNotification` mailable
- [ ] Create `PaymentRetryNotification` mailable
- [ ] Create `AccountDeletionWarning` mailable
- [ ] Create `ProcessFailedPaymentRetry` job
- [ ] Schedule retry in 3 days
- [ ] Test dunning email sequence

### Grace Period
- [ ] Track failed payment date in database
- [ ] Create `CheckAccountGracePeriod` scheduled job
- [ ] Send warnings at 7, 14, 21, 28 days
- [ ] Send final warning at 30 days
- [ ] Create `DeleteExpiredAccount` job
- [ ] Test grace period flow

### Account Deletion
- [ ] Implement account deletion logic
  - [ ] Cancel Stripe subscription
  - [ ] Delete tenant database
  - [ ] Delete account record
  - [ ] Log deletion
- [ ] Send deletion confirmation email
- [ ] Test deletion process

### Tests
- [ ] Test payment failure webhook
- [ ] Test read-only mode activation
- [ ] Test payment retry
- [ ] Test payment recovery
- [ ] Test account deletion after grace period
- [ ] All tests passing: `php artisan test --filter=FailedPayment`

---

## Phase 5: Admin Portal (Week 8)

### Admin Subscription Pages
- [ ] Create `resources/js/pages/admin/subscriptions/show.tsx`
- [ ] Display subscription details
- [ ] Display usage statistics
- [ ] Display payment history
- [ ] Create `SubscriptionManagementController` with methods:
  - [ ] `show()`
  - [ ] `changePlan()`
  - [ ] `applyCredit()`
  - [ ] `applyDiscount()`

### Manual Plan Changes
- [ ] Implement admin plan override
- [ ] Log admin actions
- [ ] Create audit trail
- [ ] Test admin plan changes

### Credits & Discounts
- [ ] Implement credit application via Stripe API
- [ ] Implement discount/coupon creation
- [ ] Display credits on invoices
- [ ] Display discounts on invoices
- [ ] Test credit application
- [ ] Test discount application

### Payment History
- [ ] Query all payments for account
- [ ] Display in table with filters
- [ ] Show payment status
- [ ] Link to Stripe dashboard
- [ ] Test payment history display

### Admin Routes
- [ ] Add routes to `routes/central.php`
- [ ] Protect with `auth:admin` middleware
- [ ] Test route access control

### Tests
- [ ] Test admin plan change
- [ ] Test credit application
- [ ] Test discount application
- [ ] Test payment history retrieval
- [ ] All tests passing: `php artisan test --filter=Admin`

---

## Phase 6: Customer Portal & Polish (Week 9-10)

### Stripe Customer Portal
- [ ] Enable Customer Portal in Stripe Dashboard
- [ ] Configure portal settings (allowed actions)
- [ ] Implement portal redirect route
- [ ] Add "Manage Billing" button to billing page
- [ ] Test portal access

### Billing Dashboard
- [ ] Show current plan details
- [ ] Show payment method
- [ ] Show next billing date
- [ ] Show billing history
- [ ] Show usage statistics
- [ ] Add quick action buttons

### Invoice Management
- [ ] List all invoices
- [ ] Download invoice PDFs
- [ ] View invoice details
- [ ] Test invoice download

### Payment Method Update
- [ ] Create payment method update page
- [ ] Use Stripe Elements
- [ ] Update default payment method
- [ ] Show success confirmation
- [ ] Test payment method update

### Cancellation Flow
- [ ] Create cancellation confirmation dialog
- [ ] Optional cancellation survey
- [ ] Choose: immediate or period end
- [ ] Send cancellation confirmation email
- [ ] Test cancellation

### UI/UX Polish
- [ ] Consistent styling across billing pages
- [ ] Loading states
- [ ] Error handling
- [ ] Success messages
- [ ] Mobile responsive
- [ ] Accessibility review

### Comprehensive Testing
- [ ] Test all user flows end-to-end
- [ ] Test all admin flows
- [ ] Test all webhook scenarios
- [ ] Test error cases
- [ ] Performance testing
- [ ] All tests passing: `php artisan test`

### Documentation
- [ ] Update README with billing setup
- [ ] Document environment variables
- [ ] Document Stripe configuration
- [ ] Document testing procedures
- [ ] Document troubleshooting steps

---

## Phase 7: Production Deployment (Week 11)

### Production Stripe Setup
- [ ] Create production Stripe account
- [ ] Enable Stripe Tax for production
- [ ] Configure tax settings
- [ ] Upload logo
- [ ] Create production products
- [ ] Create production prices
- [ ] Copy production API keys

### Plan Synchronization
- [ ] Update `PlansSeeder` with production price IDs
- [ ] Run seeder in production
- [ ] Verify plans in database
- [ ] Test plan selection

### Webhook Configuration
- [ ] Add production webhook endpoint to Stripe
- [ ] URL: `https://admin.maintenance-os.com/stripe/webhook`
- [ ] Select all necessary events
- [ ] Copy webhook signing secret
- [ ] Update production `.env`
- [ ] Test webhook delivery

### Environment Configuration
- [ ] Update production `.env`:
  ```env
  STRIPE_KEY=pk_live_xxxxx
  STRIPE_SECRET=sk_live_xxxxx
  STRIPE_WEBHOOK_SECRET=whsec_xxxxx
  CASHIER_CURRENCY=usd
  ```
- [ ] Verify all Stripe env vars set
- [ ] Verify tax configuration

### Pre-Launch Testing
- [ ] Test signup flow in production
- [ ] Test trial creation
- [ ] Test plan upgrade
- [ ] Test payment method update
- [ ] Test cancellation
- [ ] Test webhooks are received
- [ ] Test customer portal access
- [ ] Test admin panel functions

### Deployment
- [ ] Deploy code to production
- [ ] Run migrations
- [ ] Clear caches
- [ ] Verify queues are running
- [ ] Monitor error logs

### Monitoring Setup
- [ ] Set up Stripe dashboard monitoring
- [ ] Configure webhook failure alerts
- [ ] Configure payment failure alerts
- [ ] Set up revenue tracking
- [ ] Document on-call procedures

### Launch
- [ ] Enable billing for new signups
- [ ] Monitor first transactions
- [ ] Check webhook processing
- [ ] Verify tax collection
- [ ] Monitor for errors

### Post-Launch
- [ ] Monitor for 48 hours
- [ ] Review error logs
- [ ] Check webhook success rate
- [ ] Verify invoice generation
- [ ] Gather user feedback

---

## Ongoing Maintenance

### Weekly
- [ ] Review failed payments
- [ ] Check webhook failures
- [ ] Monitor subscription changes
- [ ] Review support tickets

### Monthly
- [ ] Review revenue metrics
- [ ] Analyze churn rate
- [ ] Review plan distribution
- [ ] Check for Stripe API updates
- [ ] Review and update documentation

### Quarterly
- [ ] Review and adjust pricing if needed
- [ ] Plan new features based on plan tiers
- [ ] Review and optimize costs
- [ ] Security audit

---

## Testing Checklist (Before Production)

### Manual Test Scenarios

**Signup Flow:**
- [ ] Sign up with valid card (4242 4242 4242 4242)
- [ ] Verify trial starts immediately
- [ ] Verify no charge during trial
- [ ] Verify access to all features
- [ ] Check Stripe Dashboard for customer & subscription

**Trial Expiration:**
- [ ] Set trial to expire soon (or update in Stripe)
- [ ] Verify reminder emails sent
- [ ] Verify charge at trial end
- [ ] Verify transition to active subscription

**Plan Upgrades:**
- [ ] Upgrade from Starter to Professional
- [ ] Verify proration charge
- [ ] Verify immediate feature access
- [ ] Check invoice in Stripe

**Plan Downgrades:**
- [ ] Attempt downgrade with violations (should block)
- [ ] Reduce usage and downgrade (should succeed)
- [ ] Verify proration credit
- [ ] Verify features locked immediately

**Failed Payments:**
- [ ] Use failing card (4000 0000 0000 0341)
- [ ] Verify read-only mode activates
- [ ] Verify email sent
- [ ] Update payment method
- [ ] Verify retry succeeds
- [ ] Verify full access restored

**Cancellation:**
- [ ] Cancel subscription
- [ ] Verify access until period end
- [ ] Verify no future charges
- [ ] Verify data retained during grace period

**Customer Portal:**
- [ ] Access portal
- [ ] Update payment method
- [ ] View invoices
- [ ] Download invoice PDF

**Admin Functions:**
- [ ] Manually change plan
- [ ] Apply credit
- [ ] Apply discount
- [ ] View payment history
- [ ] View usage stats

---

## Common Issues & Solutions

### Issue: Webhook signature verification fails
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint URL is accessible
- Use Stripe CLI for local testing

### Issue: Subscription not created
**Solution:**
- Check payment method is valid
- Verify price ID exists in Stripe
- Check error logs for details
- Ensure Cashier migrations ran

### Issue: Trial not starting
**Solution:**
- Verify `trialDays()` is called
- Check price requires payment method
- Verify customer has payment method attached

### Issue: Proration not working
**Solution:**
- Check Stripe Dashboard settings
- Verify `swap()` method used (not manual update)
- Review invoice in Stripe Dashboard

### Issue: Tax not collected
**Solution:**
- Enable Stripe Tax in Stripe Dashboard
- Ensure customer has address
- Verify `automatic_tax` enabled on subscription

---

## Success Metrics

After implementation, track:
- [ ] Successful signup conversion rate
- [ ] Trial-to-paid conversion rate
- [ ] Failed payment recovery rate
- [ ] Plan upgrade rate
- [ ] Churn rate
- [ ] MRR (Monthly Recurring Revenue)
- [ ] Average revenue per account
- [ ] Support tickets related to billing

---

## Resources

- [Requirements Document](./STRIPE_INTEGRATION_REQUIREMENTS.md)
- [Implementation Guide](./CASHIER_IMPLEMENTATION_GUIDE.md)
- [Laravel Cashier Docs](https://laravel.com/docs/12.x/billing)
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Last Updated:** November 10, 2025  
**Next Review:** At completion of each phase

