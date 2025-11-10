<?php

namespace Tests\Feature\MultiTenancy;

use Tests\MultiTenancyTestCase;

/**
 * Test that accessing non-existent tenants displays a graceful error page.
 */
class TenantNotFoundExceptionTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy - we test routing which initializes tenancy.
     *
     * @var bool
     */
    protected $tenancy = false;

    /**
     * Test that accessing a non-existent subdomain shows the tenant-not-found error page.
     */
    public function test_non_existent_subdomain_shows_graceful_error_page(): void
    {
        // Generate a unique subdomain that definitely doesn't exist
        $nonExistentSubdomain = 'nonexistent-' . time();
        $domain = $nonExistentSubdomain . '.' . config('app.domain', 'localhost');

        // Try to access the non-existent tenant
        $response = $this->get('http://' . $domain);

        // Should return 200 with the error page (not a raw exception)
        $response->assertStatus(200);

        // Should render the tenant-not-found Inertia page
        $response->assertInertia(
            fn ($page) => $page
                ->component('error/tenant-not-found')
                ->has('subdomain')
                ->where('subdomain', $nonExistentSubdomain)
                ->has('homeUrl')
        );
    }

    /**
     * Test that the error page includes the correct subdomain in the props.
     */
    public function test_error_page_includes_subdomain_in_props(): void
    {
        $testSubdomain = 'test-subdomain-' . time();
        $domain = $testSubdomain . '.' . config('app.domain', 'localhost');

        $response = $this->get('http://' . $domain . '/login');

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('error/tenant-not-found')
                ->where('subdomain', $testSubdomain)
        );
    }

    /**
     * Test that the home URL is correctly generated in the error page.
     */
    public function test_error_page_includes_correct_home_url(): void
    {
        $nonExistentSubdomain = 'missing-tenant-' . time();
        $domain = $nonExistentSubdomain . '.' . config('app.domain', 'localhost');

        $response = $this->get('http://' . $domain);

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('error/tenant-not-found')
                ->has('homeUrl')
                ->where('homeUrl', fn ($url) => str_ends_with($url, '/'))
        );
    }

    /**
     * Test that tenant is not initialized for non-existent domains.
     */
    public function test_tenant_not_initialized_for_non_existent_domain(): void
    {
        $nonExistentSubdomain = 'invalid-' . time();
        $domain = $nonExistentSubdomain . '.' . config('app.domain', 'localhost');

        $response = $this->get('http://' . $domain);

        // Tenant should not be initialized
        $this->assertNull(tenant());

        // Should still get a graceful error page
        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('error/tenant-not-found')
        );
    }
}
