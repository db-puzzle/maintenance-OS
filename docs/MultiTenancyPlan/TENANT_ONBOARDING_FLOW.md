# Tenant Onboarding Flow

## Overview

This document details the complete onboarding flow for new tenants in the multi-tenant Maintenance OS, from initial signup to full system activation.

## Onboarding Stages

### 1. Registration Stage

#### Self-Service Signup Flow
```
1. Landing Page
   └── Choose Plan (Free/Starter/Professional/Enterprise)
       └── Registration Form
           ├── Company Information
           ├── Admin User Details
           ├── Subdomain Selection
           └── Terms Acceptance
```

#### Registration Form Fields
```yaml
company:
  - name: required
  - industry: required (dropdown)
  - size: required (1-50, 51-200, 201-500, 500+)
  - country: required
  - timezone: required

admin_user:
  - full_name: required
  - email: required, unique
  - password: required, min 8 chars
  - phone: optional

preferences:
  - subdomain: required, unique, alphanumeric
  - language: required, default: en
  - currency: required, default: USD
```

### 2. Verification Stage

#### Email Verification
- Verification email sent immediately
- Link expires in 24 hours
- Resend option available
- Domain verification for enterprise plans

#### Phone Verification (Optional)
- SMS verification for 2FA setup
- Required for enterprise plans
- Optional for other plans

### 3. Provisioning Stage

#### Automated Provisioning Steps
```php
// 1. Create tenant record
$tenant = Tenant::create([
    'uuid' => Str::uuid(),
    'name' => $request->company_name,
    'subdomain' => $request->subdomain,
    'plan' => $request->plan,
    'status' => 'provisioning'
]);

// 2. Create database
$tenant->createDatabase();

// 3. Run migrations
$tenant->migrate();

// 4. Seed initial data
$tenant->seed(InitialDataSeeder::class);

// 5. Create admin user
$tenant->createAdminUser($request->admin_user);

// 6. Configure domain
$tenant->createDomain($request->subdomain);

// 7. Send welcome email
$tenant->sendWelcomeEmail();
```

#### Initial Data Seeding
```
Default Data Created:
├── Asset Types (10 common types)
├── Shift Configuration (Standard 8-hour shifts)
├── Form Templates (5 basic maintenance forms)
├── Sample Plant/Area/Sector structure
└── Demo assets (optional, based on preference)
```

### 4. Configuration Stage

#### Setup Wizard Steps
```
Step 1: Company Profile
├── Logo upload
├── Primary colors
├── Company details
└── Contact information

Step 2: Plant Structure
├── Create first plant
├── Define areas
├── Set up sectors
└── Configure shifts

Step 3: Asset Setup
├── Import assets (CSV/Excel)
├── Manual asset creation
├── Asset type configuration
└── Manufacturer setup

Step 4: User Management
├── Invite team members
├── Assign roles
├── Set permissions
└── Configure departments

Step 5: Maintenance Configuration
├── Create routine types
├── Set up forms
├── Configure schedules
└── Notification preferences
```

### 5. Training Stage

#### Interactive Tutorial
```javascript
// Tutorial steps
const tutorialSteps = [
  {
    element: '.create-asset-btn',
    title: 'Create Your First Asset',
    content: 'Click here to add equipment to your maintenance system'
  },
  {
    element: '.routine-section',
    title: 'Set Up Maintenance Routines',
    content: 'Define recurring maintenance tasks for your assets'
  },
  {
    element: '.dashboard-link',
    title: 'Monitor Performance',
    content: 'Track maintenance KPIs and asset performance'
  }
];
```

#### Resource Center
- Video tutorials
- Documentation links
- Best practices guide
- FAQ section
- Live chat support

## Technical Implementation

### Database Provisioning

```php
class TenantProvisioner
{
    public function provision(Tenant $tenant)
    {
        // Create database
        DB::statement("CREATE DATABASE tenant_{$tenant->uuid}");
        
        // Set up connection
        config(['database.connections.tenant' => [
            'driver' => 'pgsql',
            'host' => env('DB_HOST'),
            'database' => "tenant_{$tenant->uuid}",
            'username' => env('DB_USERNAME'),
            'password' => env('DB_PASSWORD'),
        ]]);
        
        // Run migrations
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
        ]);
        
        // Seed data
        Artisan::call('db:seed', [
            '--database' => 'tenant',
            '--class' => 'TenantDatabaseSeeder',
        ]);
    }
}
```

### Subdomain Configuration

```php
class SubdomainManager
{
    public function configure(Tenant $tenant, string $subdomain)
    {
        // Validate subdomain
        $this->validateSubdomain($subdomain);
        
        // Create domain record
        $domain = $tenant->domains()->create([
            'domain' => $subdomain . '.' . config('app.domain'),
            'is_primary' => true,
        ]);
        
        // Update DNS (if using automated DNS)
        if (config('tenancy.auto_dns')) {
            $this->updateDNS($domain);
        }
        
        // Configure SSL
        if (config('tenancy.auto_ssl')) {
            $this->provisionSSL($domain);
        }
    }
}
```

## Onboarding Metrics

### Key Performance Indicators
```yaml
metrics:
  - time_to_activation: "< 5 minutes"
  - completion_rate: "> 85%"
  - setup_wizard_completion: "> 90%"
  - first_asset_created: "< 24 hours"
  - team_member_invited: "< 48 hours"
```

### Tracking Implementation
```javascript
// Frontend tracking
const trackOnboardingStep = (step, data) => {
  analytics.track('Onboarding Step Completed', {
    tenant_id: tenantId,
    step: step,
    duration: data.duration,
    errors: data.errors,
    timestamp: new Date()
  });
};
```

## Error Handling

### Common Issues and Solutions

| Issue | Detection | Resolution |
|-------|-----------|------------|
| Subdomain taken | Real-time validation | Suggest alternatives |
| Database creation failed | Provisioning check | Retry with backoff |
| Email delivery failed | Bounce tracking | Alternative verification |
| Payment failed | Stripe webhook | Grace period + retry |

### Rollback Procedures
```php
class TenantRollback
{
    public function rollback(Tenant $tenant)
    {
        // Remove domain records
        $tenant->domains()->delete();
        
        // Drop database
        DB::statement("DROP DATABASE IF EXISTS tenant_{$tenant->uuid}");
        
        // Clean up storage
        Storage::deleteDirectory("tenant/{$tenant->uuid}");
        
        // Remove tenant record
        $tenant->delete();
        
        // Log rollback
        Log::info("Tenant rollback completed", ['tenant_id' => $tenant->id]);
    }
}
```

## Post-Onboarding

### Success Indicators
- First maintenance routine created
- At least 5 assets added
- 2+ team members invited
- First execution completed
- Dashboard accessed 3+ times

### Follow-up Communications
```
Day 1: Welcome email with quick start guide
Day 3: Check-in email with tutorial links
Day 7: Usage report and tips
Day 14: Feature highlight and best practices
Day 30: Satisfaction survey and upgrade options
```

### Support Escalation
```
Tier 1: Self-service (docs, FAQ, tutorials)
  ↓ If unresolved
Tier 2: Chat support (business hours)
  ↓ If complex
Tier 3: Email/ticket support
  ↓ If critical
Tier 4: Phone/screen share support
```

## Integration Points

### Third-Party Integrations
- **Payment**: Stripe/PayPal integration
- **Email**: SendGrid/Postmark for transactional emails
- **Analytics**: Mixpanel/Amplitude for behavior tracking
- **Support**: Intercom/Zendesk for customer support
- **Monitoring**: Datadog/New Relic for performance

### API Access
```json
{
  "onboarding_endpoints": {
    "POST /api/tenants/register": "Initial registration",
    "POST /api/tenants/verify": "Email verification",
    "GET /api/tenants/status": "Provisioning status",
    "POST /api/tenants/configure": "Initial configuration",
    "GET /api/tenants/onboarding-progress": "Progress tracking"
  }
}
```

## Security Considerations

### During Onboarding
- Rate limiting on registration endpoint
- CAPTCHA for signup form
- Email verification required
- Subdomain validation and sanitization
- SQL injection prevention in tenant creation
- XSS protection in company/user inputs

### Post-Onboarding
- Automatic security audit
- Default secure settings
- Password policy enforcement
- 2FA encouragement/requirement
- API key generation with proper scoping 