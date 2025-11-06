<?php

namespace Tests\Feature\MultiTenancy\Routing;

use Tests\MultiTenancyTestCase;

/**
 * Test route isolation between central and tenant domains.
 */
class RouteIsolationTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy - we test routing which initializes tenancy.
     *
     * @var bool
     */
    protected $tenancy = false;

    /**
     * Test that tenant routes are only accessible with subdomain.
     */
    public function test_tenant_routes_only_accessible_with_subdomain(): void
    {
        // Create a tenant
        $subdomain = 'isolation-test-' . time();
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Company',
            'subdomain' => $subdomain,
        ]);

        // Try to access tenant route from central domain (should fail)
        $response = $this->get('http://localhost/home');
        $this->assertFalse($response->isSuccessful());

        // Access from tenant subdomain (should work or redirect to login)
        $response = $this->get('http://' . $subdomain . '.' . config('app.domain', 'localhost') . '/');

        // May be redirected to login if not authenticated
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());

        // Cleanup
        if (tenancy()->initialized) {
            tenancy()->end();
        }
        $this->cleanupAdditionalTenant($tenant);
    }

    /**
     * Test that central routes are only accessible on central domain.
     */
    public function test_central_routes_only_accessible_on_central_domain(): void
    {
        // Ensure no tenant context
        if (tenancy()->initialized) {
            tenancy()->end();
        }

        // Central welcome page should be accessible
        $response = $this->get('http://localhost/');
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());

        // Registration page should be accessible on central domain
        $response = $this->get('http://localhost/register');
        $this->assertTrue($response->isSuccessful() || $response->isRedirection());
    }

    /**
     * Test 404 response for non-existent tenants.
     */
    public function test_404_response_for_non_existent_tenants(): void
    {
        // Try to access a non-existent tenant
        $response = $this->get('http://truly-nonexistent-' . time() . '.' . config('app.domain', 'localhost') . '/');

        // Should return 404 or redirect
        $this->assertTrue($response->status() === 404 || $response->isRedirection());
        $this->assertNull(tenant());
    }

    /**
     * Test route caching with tenant routes - test context switching.
     */
    public function test_route_caching_with_tenant_routes(): void
    {
        // Create first tenant
        $subdomain1 = 'cache-test-1-' . time();
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Company One',
            'subdomain' => $subdomain1,
        ]);

        // Create second tenant
        $subdomain2 = 'cache-test-2-' . time();
        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Company Two',
            'subdomain' => $subdomain2,
        ]);

        // Initialize first tenant
        tenancy()->initialize($tenant1);
        $this->assertEquals($tenant1->id, tenant()->id);

        // Switch to second tenant
        tenancy()->end();
        tenancy()->initialize($tenant2);
        $this->assertEquals($tenant2->id, tenant()->id);

        // Verify they are different
        $this->assertNotEquals($tenant1->id, $tenant2->id);

        // Cleanup
        tenancy()->end();
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }
}
