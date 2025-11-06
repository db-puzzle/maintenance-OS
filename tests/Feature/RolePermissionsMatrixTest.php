<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionsMatrixTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user
        $this->admin = User::factory()->create();
        $adminRole = Role::findByName('Administrator');
        $this->admin->assignRole($adminRole);
    }

    /** @test */
    public function it_can_display_roles_in_grid_view_with_permissions_matrix()
    {
        // Arrange
        $this->actingAs($this->admin);

        // Create some permissions
        $viewUsersPermission = Permission::firstOrCreate(
            ['name' => 'users.view', 'guard_name' => 'web'],
            ['display_name' => 'View Users']
        );
        $createUsersPermission = Permission::firstOrCreate(
            ['name' => 'users.create', 'guard_name' => 'web'],
            ['display_name' => 'Create Users']
        );
        $viewAssetsPermission = Permission::firstOrCreate(
            ['name' => 'assets.view', 'guard_name' => 'web'],
            ['display_name' => 'View Assets']
        );

        // Create custom roles
        $managerRole = Role::create(['name' => 'manager', 'display_name' => 'Manager']);
        $managerRole->givePermissionTo([$viewUsersPermission, $viewAssetsPermission]);

        $operatorRole = Role::create(['name' => 'operator', 'display_name' => 'Operator']);
        $operatorRole->givePermissionTo($viewAssetsPermission);

        // Act
        $response = $this->get('/settings/roles?view=grid&include_permissions=true');

        // Assert
        $response->assertSuccessful();
        $response->assertInertia(
            fn ($page) => $page
                ->component('settings/roles/index')
                ->has('permissions') // Has permissions array
                ->has('rolesWithPermissions') // Has roles with permissions
                ->where('filters.view', 'grid')
                ->has('rolesWithPermissions.0.permissions') // First role should have permissions
        );
    }

    /** @test */
    public function it_displays_list_view_by_default_without_permissions_data()
    {
        // Arrange
        $this->actingAs($this->admin);

        // Act
        $response = $this->get('/settings/roles');

        // Assert
        $response->assertSuccessful();
        $response->assertInertia(
            fn ($page) => $page
                ->component('settings/roles/index')
                ->missing('permissions')
                ->missing('rolesWithPermissions')
                ->missing('filters.view') // Default doesn't include view parameter
        );
    }

    /** @test */
    public function it_can_switch_between_list_and_grid_views()
    {
        // Arrange
        $this->actingAs($this->admin);

        // Act - First check list view
        $listResponse = $this->get('/settings/roles?view=list');

        // Assert list view
        $listResponse->assertSuccessful();
        $listResponse->assertInertia(
            fn ($page) => $page
                ->where('filters.view', 'list')
                ->missing('permissions')
        );

        // Act - Then check grid view
        $gridResponse = $this->get('/settings/roles?view=grid');

        // Assert grid view
        $gridResponse->assertSuccessful();
        $gridResponse->assertInertia(
            fn ($page) => $page
                ->where('filters.view', 'grid')
                ->has('permissions')
                ->has('rolesWithPermissions')
        );
    }

    /** @test */
    public function it_preserves_other_filters_when_switching_views()
    {
        // Arrange
        $this->actingAs($this->admin);

        // Act
        $response = $this->get('/settings/roles?search=admin&type=system&view=grid&sort=name&direction=desc');

        // Assert
        $response->assertSuccessful();
        $response->assertInertia(
            fn ($page) => $page
                ->where('filters.search', 'admin')
                ->where('filters.type', 'system')
                ->where('filters.view', 'grid')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'desc')
        );
    }

    /** @test */
    public function it_requires_authentication_to_view_roles_matrix()
    {
        // Act
        $response = $this->get('/settings/roles?view=grid');

        // Assert
        $response->assertRedirect('/login');
    }

    /** @test */
    public function it_requires_proper_permissions_to_view_roles_matrix()
    {
        // Arrange
        $user = User::factory()->create();
        $this->actingAs($user);

        // Act
        $response = $this->get('/settings/roles?view=grid');

        // Assert
        $response->assertForbidden();
    }
}
