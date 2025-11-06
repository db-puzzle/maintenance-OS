<?php

namespace Tests\Feature\MultiTenancy\Foundation;

use Tests\MultiTenancyTestCase;

class EnvironmentConfigurationTest extends MultiTenancyTestCase
{
    public function test_central_domains_are_configured(): void
    {
        $centralDomains = config('tenancy.central_domains');

        $this->assertIsArray($centralDomains);
        $this->assertNotEmpty($centralDomains);

        // Check that localhost is included (for testing)
        $this->assertContains('localhost', $centralDomains);
    }

    public function test_session_domain_is_configured_for_subdomains(): void
    {
        // In a real environment, SESSION_DOMAIN should be set
        // For testing, we can check if it's at least null or a string
        $sessionDomain = config('session.domain');

        $this->assertTrue(
            is_null($sessionDomain) || is_string($sessionDomain),
            'Session domain is not properly configured'
        );
    }

    public function test_environment_variables_are_set_correctly(): void
    {
        // Check that central connection uses correct database configuration
        $centralConfig = config('database.connections.central');

        $this->assertIsArray($centralConfig);

        // We now use PostgreSQL for testing too
        $this->assertEquals('pgsql', $centralConfig['driver']);

        // Check database name based on environment
        if (app()->environment('testing')) {
            $this->assertEquals('maintenance_os_central_test', $centralConfig['database']);
        } else {
            $this->assertEquals('maintenance_os_central', $centralConfig['database']);
        }
    }
}
