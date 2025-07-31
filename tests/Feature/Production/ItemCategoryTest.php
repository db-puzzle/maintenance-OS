<?php

namespace Tests\Feature\Production;

use App\Models\Production\ItemCategory;
use App\Models\Production\Item;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class ItemCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $plantManagerUser;
    protected User $technicianUser;
    protected User $viewerUser;
    protected User $unauthorizedUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles and permissions
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        // Create test users with different roles
        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('Administrator');

        $this->plantManagerUser = User::factory()->create();
        $this->plantManagerUser->assignRole('Plant Manager');

        $this->technicianUser = User::factory()->create();
        $this->technicianUser->assignRole('Technician');

        $this->viewerUser = User::factory()->create();
        $this->viewerUser->assignRole('Viewer');

        $this->unauthorizedUser = User::factory()->create();
        // No roles assigned
    }

    /** @test */
    public function admin_can_view_item_categories_index()
    {
        $categories = ItemCategory::factory(5)->create();

        $response = $this->actingAs($this->adminUser)
            ->get(route('production.categories.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('production/item-categories/index')
                ->has('categories.data', 5)
            );
    }

    /** @test */
    public function plant_manager_can_view_item_categories_index()
    {
        $categories = ItemCategory::factory(3)->create();

        $response = $this->actingAs($this->plantManagerUser)
            ->get(route('production.categories.index'));

        $response->assertOk();
    }

    /** @test */
    public function technician_can_view_item_categories_index()
    {
        $categories = ItemCategory::factory(3)->create();

        $response = $this->actingAs($this->technicianUser)
            ->get(route('production.categories.index'));

        $response->assertOk();
    }

    /** @test */
    public function unauthorized_user_cannot_view_item_categories_index()
    {
        $response = $this->actingAs($this->unauthorizedUser)
            ->get(route('production.categories.index'));

        $response->assertForbidden();
    }

    /** @test */
    public function admin_can_create_item_category()
    {
        $categoryData = [
            'name' => 'Test Category',
            'description' => 'Test Description',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->adminUser)
            ->post(route('production.categories.store'), $categoryData);

        $response->assertRedirect(route('production.categories.index'));
        
        $this->assertDatabaseHas('item_categories', [
            'name' => 'Test Category',
            'description' => 'Test Description',
            'is_active' => true,
            'created_by' => $this->adminUser->id,
        ]);
    }

    /** @test */
    public function plant_manager_can_create_item_category()
    {
        $categoryData = [
            'name' => 'Plant Manager Category',
            'description' => 'Created by Plant Manager',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->plantManagerUser)
            ->post(route('production.categories.store'), $categoryData);

        $response->assertRedirect(route('production.categories.index'));
        
        $this->assertDatabaseHas('item_categories', [
            'name' => 'Plant Manager Category',
            'created_by' => $this->plantManagerUser->id,
        ]);
    }

    /** @test */
    public function technician_cannot_create_item_category()
    {
        $categoryData = [
            'name' => 'Technician Category',
            'description' => 'Should not be created',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->technicianUser)
            ->post(route('production.categories.store'), $categoryData);

        $response->assertForbidden();
        
        $this->assertDatabaseMissing('item_categories', [
            'name' => 'Technician Category',
        ]);
    }

    /** @test */
    public function category_name_must_be_unique()
    {
        $existingCategory = ItemCategory::factory()->create(['name' => 'Existing Category']);

        $categoryData = [
            'name' => 'Existing Category',
            'description' => 'Duplicate name',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->adminUser)
            ->post(route('production.categories.store'), $categoryData);

        $response->assertSessionHasErrors('name');
    }

    /** @test */
    public function admin_can_view_item_category_details()
    {
        $category = ItemCategory::factory()->create();
        $items = Item::factory(3)->create(['item_category_id' => $category->id]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('production.categories.show', $category));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('production/item-categories/show')
                ->has('category')
                ->where('category.id', $category->id)
                ->has('items.data', 3)
            );
    }

    /** @test */
    public function admin_can_update_item_category()
    {
        $category = ItemCategory::factory()->create([
            'name' => 'Original Name',
            'description' => 'Original Description',
            'is_active' => true,
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'description' => 'Updated Description',
            'is_active' => false,
        ];

        $response = $this->actingAs($this->adminUser)
            ->put(route('production.categories.update', $category), $updateData);

        $response->assertRedirect(route('production.categories.show', $category));
        
        $category->refresh();
        $this->assertEquals('Updated Name', $category->name);
        $this->assertEquals('Updated Description', $category->description);
        $this->assertFalse($category->is_active);
    }

    /** @test */
    public function technician_cannot_update_item_category()
    {
        $category = ItemCategory::factory()->create(['name' => 'Original Name']);

        $updateData = [
            'name' => 'Should Not Update',
            'description' => 'Should not change',
            'is_active' => false,
        ];

        $response = $this->actingAs($this->technicianUser)
            ->put(route('production.categories.update', $category), $updateData);

        $response->assertForbidden();
        
        $category->refresh();
        $this->assertEquals('Original Name', $category->name);
    }

    /** @test */
    public function admin_can_delete_item_category_without_items()
    {
        $category = ItemCategory::factory()->create();

        $response = $this->actingAs($this->adminUser)
            ->delete(route('production.categories.destroy', $category));

        $response->assertRedirect(route('production.categories.index'));
        
        $this->assertDatabaseMissing('item_categories', [
            'id' => $category->id,
        ]);
    }

    /** @test */
    public function cannot_delete_item_category_with_items()
    {
        $category = ItemCategory::factory()->create();
        $item = Item::factory()->create(['item_category_id' => $category->id]);

        $response = $this->actingAs($this->adminUser)
            ->delete(route('production.categories.destroy', $category));

        $response->assertRedirect()
            ->assertSessionHas('error');
        
        $this->assertDatabaseHas('item_categories', [
            'id' => $category->id,
        ]);
    }

    /** @test */
    public function can_check_category_dependencies()
    {
        $category = ItemCategory::factory()->create();
        $items = Item::factory(5)->create(['item_category_id' => $category->id]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('production.categories.check-dependencies', $category));

        $response->assertOk()
            ->assertJson([
                'has_dependencies' => true,
                'dependencies' => [
                    'items' => [
                        'count' => 5,
                    ],
                ],
            ]);
    }

    /** @test */
    public function category_without_items_has_no_dependencies()
    {
        $category = ItemCategory::factory()->create();

        $response = $this->actingAs($this->adminUser)
            ->get(route('production.categories.check-dependencies', $category));

        $response->assertOk()
            ->assertJson([
                'has_dependencies' => false,
                'dependencies' => [
                    'items' => [
                        'count' => 0,
                    ],
                ],
            ]);
    }

    /** @test */
    public function stay_parameter_keeps_user_on_same_page_after_create()
    {
        $categoryData = [
            'name' => 'Stay Test Category',
            'description' => 'Testing stay parameter',
            'is_active' => true,
            'stay' => true,
        ];

        $response = $this->actingAs($this->adminUser)
            ->from('/some-page')
            ->post(route('production.categories.store'), $categoryData);

        $response->assertRedirect('/some-page');
    }

    /** @test */
    public function stay_parameter_keeps_user_on_same_page_after_update()
    {
        $category = ItemCategory::factory()->create();

        $updateData = [
            'name' => 'Updated with Stay',
            'description' => 'Testing stay parameter',
            'is_active' => true,
            'stay' => true,
        ];

        $response = $this->actingAs($this->adminUser)
            ->from('/some-page')
            ->put(route('production.categories.update', $category), $updateData);

        $response->assertRedirect('/some-page');
    }
}