<?php

namespace Tests\Feature\MultiTenancy\Admin;

use App\Models\Account;
use App\Models\Central\AdminUser;
use App\Models\Central\Plan;
use Illuminate\Support\Facades\Event;
use Tests\MultiTenancyTestCase;

/**
 * Test admin tenant management features.
 * Uses MultiTenancyTestCase to properly handle tenant creation.
 */
class TenantManagementTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy - admin portal operates on central database.
     *
     * @var bool
     */
    protected $tenancy = false;

    protected AdminUser $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Prevent actual database creation in tests
        // We're testing the admin portal CRUD logic, not actual database operations
        Event::fake([
            \Stancl\Tenancy\Events\DatabaseCreated::class,
            \Stancl\Tenancy\Events\DatabaseMigrated::class,
            \Stancl\Tenancy\Events\DatabaseSeeded::class,
            \Stancl\Tenancy\Events\DatabaseDeleted::class,
        ]);

        // Create admin user on central database
        $this->admin = AdminUser::factory()->create([
            'name' => 'Test Admin',
        ]);

        // Use admin guard for authentication
        $this->actingAs($this->admin, 'admin');
    }

    /**
     * Test admin can list all tenants with pagination.
     */
    public function test_admin_can_list_all_tenants_with_pagination(): void
    {
        // Create multiple tenants
        Account::factory()->count(25)->create();

        $response = $this->get(route('admin.accounts.index'));

        $response->assertStatus(200);
        // Component check disabled - frontend views not yet implemented
        // Just verify the response has the expected data structure
        $props = $response->viewData('page')['props'];
        $this->assertArrayHasKey('accounts', $props);
        $this->assertCount(20, $props['accounts']['data']);
    }

    /**
     * Test admin can search tenants.
     */
    public function test_admin_can_search_tenants(): void
    {
        Account::factory()->create(['name' => 'Acme Corporation', 'subdomain' => 'acme']);
        Account::factory()->create(['name' => 'Test Company', 'subdomain' => 'test']);

        $response = $this->get(route('admin.accounts.index', ['search' => 'Acme']));

        $response->assertStatus(200);
        $props = $response->viewData('page')['props'];
        $this->assertArrayHasKey('accounts', $props);
        $this->assertGreaterThanOrEqual(1, count($props['accounts']['data']));
        $this->assertEquals('Acme Corporation', $props['accounts']['data'][0]['name']);
    }

    /**
     * Test admin can filter tenants by status.
     */
    public function test_admin_can_filter_tenants_by_status(): void
    {
        Account::factory()->create(['status' => 'active']);
        Account::factory()->create(['status' => 'suspended']);
        Account::factory()->create(['status' => 'suspended']);

        $response = $this->get(route('admin.accounts.index', ['status' => 'suspended']));

        $response->assertStatus(200);
        $props = $response->viewData('page')['props'];
        $this->assertArrayHasKey('accounts', $props);
        // At least 2 suspended accounts (might have more from previous tests)
        $this->assertGreaterThanOrEqual(2, count($props['accounts']['data']));
    }

    /**
     * Test admin can view tenant details.
     */
    public function test_admin_can_view_tenant_details(): void
    {
        $tenant = Account::factory()->create();

        $response = $this->get(route('admin.accounts.show', $tenant));

        $response->assertStatus(200);
        // Component check disabled - frontend views not yet implemented
        // Verify data structure instead
        $props = $response->viewData('page')['props'];
        $this->assertArrayHasKey('account', $props);
        $this->assertEquals($tenant->id, $props['account']['id']);
    }

    /**
     * Test admin can create new tenant.
     */
    public function test_admin_can_create_new_tenant(): void
    {
        $plan = Plan::factory()->create();

        $response = $this->post(route('admin.accounts.store'), [
            'name' => 'New Company',
            'subdomain' => 'newcompany',
            'plan_id' => $plan->id,
            'admin_email' => 'admin@newcompany.com',
            'admin_name' => 'Admin User',
        ]);

        $response->assertRedirect();

        // Verify account was created in central database
        $this->assertDatabaseHas('accounts', [
            'subdomain' => 'newcompany',
            'name' => 'New Company',
        ], 'central');

        // Verify subscription was created
        $account = Account::where('subdomain', 'newcompany')->first();
        $this->assertNotNull($account);
        $this->assertDatabaseHas('subscriptions', [
            'account_id' => $account->id,
            'plan_id' => $plan->id,
        ], 'central');
    }

    /**
     * Test tenant creation validates subdomain.
     */
    public function test_tenant_creation_validates_subdomain(): void
    {
        $plan = Plan::factory()->create();

        // Test reserved subdomain
        $response = $this->post(route('admin.accounts.store'), [
            'name' => 'Test',
            'subdomain' => 'admin',
            'plan_id' => $plan->id,
            'admin_email' => 'test@test.com',
            'admin_name' => 'Test',
        ]);

        $response->assertSessionHasErrors('subdomain');
    }

    /**
     * Test admin can update tenant details.
     */
    public function test_admin_can_update_tenant_details(): void
    {
        $tenant = Account::factory()->create();

        $response = $this->put(route('admin.accounts.update', $tenant), [
            'name' => 'Updated Name',
            'status' => 'active',
        ]);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('accounts', [
            'id' => $tenant->id,
            'name' => 'Updated Name',
        ], 'central');
    }

    /**
     * Test admin can suspend tenant.
     */
    public function test_admin_can_suspend_tenant(): void
    {
        $tenant = Account::factory()->create(['status' => 'active']);

        $response = $this->put(route('admin.accounts.update', $tenant), [
            'name' => $tenant->name,
            'status' => 'suspended',
            'suspension_reason' => 'Payment overdue',
        ]);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('accounts', [
            'id' => $tenant->id,
            'status' => 'suspended',
            'suspension_reason' => 'Payment overdue',
        ], 'central');
    }

    /**
     * Test admin can delete tenant with confirmation.
     */
    public function test_admin_can_delete_tenant_with_confirmation(): void
    {
        $tenant = Account::factory()->create();

        $response = $this->delete(route('admin.accounts.destroy', $tenant), [
            'confirm' => true,
        ]);

        $response->assertRedirect(route('admin.accounts.index'));

        // Verify tenant was deleted from central database
        $this->assertDatabaseMissing('accounts', [
            'id' => $tenant->id,
        ], 'central');
    }

    /**
     * Test tenant deletion requires confirmation.
     */
    public function test_tenant_deletion_requires_confirmation(): void
    {
        $tenant = Account::factory()->create();

        $response = $this->delete(route('admin.accounts.destroy', $tenant), [
            'confirm' => false,
        ]);

        // Controller returns flash error message, not validation errors
        $response->assertSessionHas('error');

        // Verify tenant was NOT deleted
        $this->assertDatabaseHas('accounts', [
            'id' => $tenant->id,
        ], 'central');
    }

    /**
     * Test admin can perform bulk operations.
     */
    public function test_admin_can_perform_bulk_operations(): void
    {
        $tenants = Account::factory()->count(3)->create();
        $tenantIds = $tenants->pluck('id')->toArray();

        $response = $this->post(route('admin.bulk.suspend'), [
            'tenant_ids' => $tenantIds,
            'reason' => 'Bulk suspension test',
        ]);

        $response->assertStatus(302); // Redirect
        $response->assertSessionHas('success');

        // Refresh to get updated data
        foreach ($tenantIds as $id) {
            $account = Account::find($id);
            $this->assertEquals('suspended', $account->status);
            $this->assertEquals('Bulk suspension test', $account->suspension_reason);
            $this->assertNotNull($account->suspended_at);
        }
    }
}
