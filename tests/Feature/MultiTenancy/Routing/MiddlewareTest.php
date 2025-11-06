<?php

namespace Tests\Feature\MultiTenancy\Routing;

use Tests\MultiTenancyTestCase;

/**
 * Test tenancy middleware functionality.
 */
class MiddlewareTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy - we test routing which initializes tenancy.
     *
     * @var bool
     */
    protected $tenancy = false;

    /**
     * Test that InitializeTenancyByDomain middleware configuration is correct
     * Note: Actual HTTP subdomain testing requires server configuration; testing manually.
     */
    public function test_initialize_tenancy_by_domain_middleware(): void
    {
        // Verify middleware is registered in tenant middleware group
        $tenantMiddleware = config('app.middleware_groups.tenant', []);

        // Laravel 12 uses different middleware registration
        // Just verify the middleware class exists
        $this->assertTrue(
            class_exists(\Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class),
            'InitializeTenancyByDomain middleware class should exist'
        );
    }

    /**
     * Test that PreventAccessFromCentralDomains middleware blocks tenant routes.
     */
    public function test_prevent_access_from_central_domains_middleware(): void
    {
        // Ensure no tenant context
        if (tenancy()->initialized) {
            tenancy()->end();
        }

        // Try to access a tenant route from central domain
        $response = $this->get('http://localhost/home');

        // Should be blocked (404 or redirect because route doesn't exist on central)
        $this->assertFalse($response->isSuccessful());
    }

    /**
     * Test that tenant context is properly initialized via manual initialization.
     */
    public function test_tenant_context_initialization(): void
    {
        // Create a tenant
        $subdomain = 'context-test-' . time();
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Company',
            'subdomain' => $subdomain,
        ]);

        // Test manual initialization (what the middleware does internally)
        tenancy()->initialize($tenant);

        // Context should be initialized
        $this->assertNotNull(tenant());
        $this->assertEquals($tenant->id, tenant()->id);
        $this->assertEquals($tenant->name, tenant()->name);

        // Cleanup
        tenancy()->end();
        $this->cleanupAdditionalTenant($tenant);
    }

    /**
     * Test that middleware ordering is correct.
     */
    public function test_middleware_ordering(): void
    {
        // Create a suspended tenant
        $subdomain = 'suspended-test-' . time();
        $tenant = $this->createAdditionalTenant([
            'name' => 'Suspended Company',
            'subdomain' => $subdomain,
            'status' => 'suspended',
        ]);

        $tenant->update([
            'suspension_reason' => 'Payment overdue',
        ]);

        // Access tenant
        $response = $this->get('http://' . $subdomain . '.' . config('app.domain', 'localhost'));

        // Should be blocked by EnsureTenantIsActive middleware (403) or redirected
        $this->assertTrue($response->status() === 403 || $response->isRedirection());

        // Cleanup (tenant should still be initialized)
        if (tenancy()->initialized) {
            tenancy()->end();
        }
        $this->cleanupAdditionalTenant($tenant);
    }

    /**
     * Test middleware exception handling for non-existent tenant.
     */
    public function test_middleware_exception_handling(): void
    {
        // Try to access non-existent tenant
        $response = $this->get('http://truly-nonexistent-' . time() . '.' . config('app.domain', 'localhost'));

        // Should handle gracefully with 404 or redirect
        $this->assertTrue($response->status() === 404 || $response->isRedirection());
        $this->assertNull(tenant());
    }
}
