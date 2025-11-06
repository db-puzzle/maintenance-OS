<?php

namespace Tests\Feature\MultiTenancy\Foundation;

use Tests\MultiTenancyTestCase;

class PackageInstallationTest extends MultiTenancyTestCase
{
    public function test_laravel_tenancy_package_is_installed(): void
    {
        $this->assertTrue(
            class_exists(\Stancl\Tenancy\TenancyServiceProvider::class),
            'Laravel Tenancy package is not installed'
        );
    }

    public function test_tenancy_config_file_exists(): void
    {
        $this->assertFileExists(config_path('tenancy.php'));
    }

    public function test_central_database_connection_works(): void
    {
        $connection = \DB::connection('central');
        $this->assertNotNull($connection);

        // Test the connection by running a simple query
        $result = $connection->select('SELECT 1');
        $this->assertNotEmpty($result);
    }

    public function test_account_model_extends_correct_base_class(): void
    {
        // Account model extends Model directly and implements Tenant interface
        $this->assertTrue(
            is_subclass_of(\App\Models\Account::class, \Illuminate\Database\Eloquent\Model::class),
            'Account model does not extend Model class'
        );

        $this->assertTrue(
            in_array(\Stancl\Tenancy\Contracts\Tenant::class, class_implements(\App\Models\Account::class)),
            'Account model does not implement Tenant interface'
        );
    }

    public function test_account_model_implements_required_interfaces(): void
    {
        $this->assertTrue(
            in_array(\Stancl\Tenancy\Contracts\TenantWithDatabase::class, class_implements(\App\Models\Account::class)),
            'Account model does not implement TenantWithDatabase interface'
        );
    }
}
