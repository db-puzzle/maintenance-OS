# Payment & Billing Documentation

**Maintenance OS - Stripe Integration**

This directory contains comprehensive documentation for implementing Stripe-based subscription billing in the Maintenance OS multi-tenant SaaS application.

---

## 📚 Documentation Overview

### 1. [Stripe Integration Requirements](./STRIPE_INTEGRATION_REQUIREMENTS.md)
**Purpose:** Complete business requirements and technical specifications  
**Audience:** Product managers, developers, stakeholders  
**Contents:**
- Business requirements and pricing structure
- Feature specifications and user flows
- Plan details and feature limits
- Payment operations and webhook handling
- Security and compliance requirements
- Testing strategy
- Implementation phases

**When to use:** Review before starting development to understand the complete scope.

---

### 2. [Cashier Implementation Guide](./CASHIER_IMPLEMENTATION_GUIDE.md)
**Purpose:** Technical guide for implementing Laravel Cashier  
**Audience:** Backend developers  
**Contents:**
- Why use Laravel Cashier vs direct Stripe integration
- Installation and setup instructions
- Multi-tenancy considerations
- Complete code examples for all scenarios
- Common pitfalls and solutions
- Performance optimization tips
- Debugging and monitoring strategies

**When to use:** Reference during development for implementation details and code examples.

---

### 3. [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)
**Purpose:** Step-by-step implementation tracker  
**Audience:** Development team, project managers  
**Contents:**
- Pre-implementation setup tasks
- Phase-by-phase checklists (7 phases)
- Testing procedures
- Production deployment steps
- Ongoing maintenance tasks
- Success metrics

**When to use:** Track progress during development and ensure nothing is missed.

---

## 🎯 Quick Start

### For Product Managers
1. Read [Requirements Document](./STRIPE_INTEGRATION_REQUIREMENTS.md) sections 1-7
2. Review pricing structure and user flows
3. Approve business requirements before development starts

### For Backend Developers
1. Skim [Requirements Document](./STRIPE_INTEGRATION_REQUIREMENTS.md) for context
2. Read [Cashier Implementation Guide](./CASHIER_IMPLEMENTATION_GUIDE.md) in full
3. Use [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md) to track progress
4. Reference code examples as needed during development

### For Frontend Developers
1. Read [Requirements Document](./STRIPE_INTEGRATION_REQUIREMENTS.md) sections 6-7 (User Flows, Admin Portal)
2. Review UI/UX requirements
3. Check code examples in Implementation Guide for API contracts
4. Build components per specifications

### For QA/Testing
1. Read [Requirements Document](./STRIPE_INTEGRATION_REQUIREMENTS.md) section 11 (Testing Strategy)
2. Use [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md) "Testing Checklist" section
3. Follow manual test scenarios before production deployment

---

## 🏗️ Architecture Summary

### Technology Stack
- **Payment Gateway:** Stripe
- **Laravel Package:** Laravel Cashier Stripe v15.x
- **Database:** PostgreSQL (central database)
- **Frontend:** React + TypeScript + Inertia.js

### Key Architectural Decisions

**1. Laravel Cashier over Direct Stripe API**
- Reduces development time by 4-6 weeks
- Handles 95% of subscription scenarios out-of-box
- Maintained by Laravel core team
- Extensible when custom logic needed

**2. Central Database for All Billing**
- All subscription data stored in central database
- No tenant context needed for billing operations
- Simplifies webhook processing
- Clearer separation of concerns

**3. Account as Billable Entity**
- One Stripe customer per tenant account
- Users within tenant don't have individual Stripe records
- Only tenant admins can manage billing

**4. Immediate Plan Changes with Proration**
- Upgrades and downgrades take effect immediately
- Stripe handles all proration calculations automatically
- Better user experience than waiting for billing cycle

---

## 💰 Pricing Structure

| Plan | Monthly | Annual | Trial |
|------|---------|--------|-------|
| **Starter** | $20 | $192 (20% off) | 30 days |
| **Professional** | $100 | $960 (20% off) | 30 days |
| **Enterprise** | $500 | $4,800 (20% off) | 30 days |

### Plan Features

**Starter:**
- 5 users
- 50 assets
- 10 work cells
- 100 work orders/month
- 5GB storage
- Basic features only

**Professional:**
- 25 users
- 500 assets
- 50 work cells
- 1,000 work orders/month
- 50GB storage
- ✅ Scheduling module
- ✅ Advanced reporting

**Enterprise:**
- Unlimited users, assets, work cells, work orders
- 500GB storage
- ✅ All Professional features
- ✅ API access
- ✅ Priority support
- ✅ Custom integrations

---

## 🔄 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
Install Cashier, setup database, create service layer

### Phase 2: Signup & Trial (Weeks 3-4)
Complete signup flow with trial and basic webhooks

### Phase 3: Plan Changes & Enforcement (Weeks 5-6)
Enable plan upgrades/downgrades with usage limits

### Phase 4: Failed Payments & Recovery (Week 7)
Handle payment failures, dunning, and grace periods

### Phase 5: Admin Portal (Week 8)
Admin can manage subscriptions, credits, discounts

### Phase 6: Customer Portal & Polish (Weeks 9-10)
Self-service billing, UI polish, comprehensive testing

### Phase 7: Production Deployment (Week 11)
Launch to production with monitoring

**Total Estimated Time:** 11 weeks

---

## 🧪 Testing Strategy

### Automated Testing
- **Unit Tests:** Service methods, validation logic
- **Feature Tests:** Complete user flows, webhook handling
- **Integration Tests:** Stripe API interactions

### Manual Testing
- Use Stripe test cards for various scenarios
- Test all user flows end-to-end
- Verify webhook handling with Stripe CLI
- Admin portal functionality
- Customer portal access

### Pre-Production Checklist
Complete testing checklist in [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md) before going live.

---

## 🔐 Security & Compliance

### PCI Compliance
- Never store credit card data
- Use Stripe Elements for card collection
- All card data handled by Stripe

### Tax Compliance
- Stripe Tax handles all tax calculation
- Automated tax collection for US & Brazil
- Tax-compliant invoices generated automatically

### GDPR Considerations
- Right to data export includes billing data
- Right to deletion handled appropriately
- Privacy policy mentions Stripe as processor

---

## 📊 Success Metrics

Track these metrics post-launch:
- **Conversion Rate:** Trial to paid conversion
- **MRR:** Monthly Recurring Revenue
- **Churn Rate:** Monthly subscription cancellations
- **Recovery Rate:** Failed payment recovery percentage
- **Upgrade Rate:** Plans upgraded over time
- **Support Tickets:** Billing-related support volume

---

## 🚀 Getting Started

### Prerequisites
1. Stripe account (test mode)
2. Laravel 12.x installed
3. PostgreSQL database configured
4. Understanding of multi-tenancy architecture

### Next Steps
1. **Review Requirements:** Read [STRIPE_INTEGRATION_REQUIREMENTS.md](./STRIPE_INTEGRATION_REQUIREMENTS.md)
2. **Understand Cashier:** Read [CASHIER_IMPLEMENTATION_GUIDE.md](./CASHIER_IMPLEMENTATION_GUIDE.md)
3. **Start Phase 1:** Follow [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
4. **Set up Stripe:** Create products and prices in Stripe Dashboard
5. **Install Cashier:** `composer require laravel/cashier`
6. **Build & Test:** Implement phase by phase

---

## 📞 Support Resources

### Documentation
- [Laravel Cashier Docs](https://laravel.com/docs/12.x/billing)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

### Help & Support
- **Cashier Questions:** [Laravel Discord #cashier](https://discord.gg/laravel)
- **Stripe Questions:** [Stripe Support](https://support.stripe.com/)
- **Internal Questions:** Development team lead

---

## 🔄 Document Status

| Document | Version | Last Updated | Status |
|----------|---------|--------------|--------|
| README.md | 1.0 | 2025-11-10 | ✅ Complete |
| STRIPE_INTEGRATION_REQUIREMENTS.md | 1.0 | 2025-11-10 | ✅ Complete |
| CASHIER_IMPLEMENTATION_GUIDE.md | 1.0 | 2025-11-10 | ✅ Complete |
| IMPLEMENTATION_CHECKLIST.md | 1.0 | 2025-11-10 | ✅ Complete |

---

## 🤝 Contributing

When updating these documents:
1. Update the "Last Updated" date
2. Increment version if significant changes
3. Document changes in git commit message
4. Notify team of important updates

---

## ❓ Frequently Asked Questions

### Why Laravel Cashier instead of building our own?
Cashier saves 4-6 weeks of development time, is battle-tested, and maintained by the Laravel team. It handles edge cases we'd likely miss in a custom implementation.

### Can we customize beyond what Cashier provides?
Yes! Cashier is built on top of the Stripe PHP SDK. You can always use the Stripe API directly for custom scenarios while using Cashier for standard operations.

### How does billing work with our multi-tenant architecture?
Each tenant account is a Stripe customer. Subscriptions are stored in the central database. Users within a tenant don't have individual Stripe records.

### What happens to tenant data when they cancel?
Tenants keep access until the end of their billing period. After that, they have 30 days of read-only access before account deletion.

### Can tenants change plans mid-month?
Yes! Plan changes happen immediately with automatic proration. They're charged or credited the difference on their next invoice.

### How do we handle failed payments?
Automatic retry after 3 days, 30-day grace period with read-only access, email notifications, and eventual account deletion if unresolved.

### Is tax collection handled automatically?
Yes, Stripe Tax automatically calculates and collects tax based on the customer's location and applicable tax laws.

### Can we offer custom pricing for enterprise customers?
Yes! Admins can manually override plans, apply credits, or create custom discounts through the admin portal.

---

**Ready to start?** Begin with [Phase 1 of the Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md#phase-1-foundation-week-1-2) 🚀

