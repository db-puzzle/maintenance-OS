<?php

namespace Tests\Feature;

use App\Models\Skill;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkillTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $plantManager;
    protected User $technician;
    protected User $viewer;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles and permissions
        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);

        // Create users with different roles
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Administrator');

        $this->plantManager = User::factory()->create();
        $this->plantManager->assignRole('Plant Manager');

        $this->technician = User::factory()->create();
        $this->technician->assignRole('Technician');

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole('Viewer');
    }

    /** @test */
    public function admin_can_view_skills_list()
    {
        Skill::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)->get(route('skills.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('skills/index')
            ->has('skills.data', 5)
        );
    }

    /** @test */
    public function technician_can_view_skills_list()
    {
        Skill::factory()->count(3)->create();

        $response = $this->actingAs($this->technician)->get(route('skills.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('skills/index')
            ->has('skills.data', 3)
            ->where('can.create', false)
        );
    }

    /** @test */
    public function admin_can_create_skill()
    {
        $skillData = [
            'name' => 'Test Skill',
            'description' => 'Test Description',
            'category' => 'Técnica',
        ];

        $response = $this->actingAs($this->admin)->post(route('skills.store'), $skillData);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('skills', [
            'name' => 'Test Skill',
            'category' => 'Técnica',
        ]);
    }

    /** @test */
    public function technician_cannot_create_skill()
    {
        $skillData = [
            'name' => 'Test Skill',
            'description' => 'Test Description',
            'category' => 'Técnica',
        ];

        $response = $this->actingAs($this->technician)->post(route('skills.store'), $skillData);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('skills', [
            'name' => 'Test Skill',
        ]);
    }

    /** @test */
    public function admin_can_update_skill()
    {
        $skill = Skill::factory()->create([
            'name' => 'Old Name',
            'category' => 'Técnica',
        ]);

        $updateData = [
            'name' => 'New Name',
            'description' => 'New Description',
            'category' => 'Elétrica',
        ];

        $response = $this->actingAs($this->admin)->put(route('skills.update', $skill), $updateData);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('skills', [
            'id' => $skill->id,
            'name' => 'New Name',
            'category' => 'Elétrica',
        ]);
    }

    /** @test */
    public function viewer_cannot_update_skill()
    {
        $skill = Skill::factory()->create();

        $updateData = [
            'name' => 'New Name',
            'description' => 'New Description',
            'category' => 'Elétrica',
        ];

        $response = $this->actingAs($this->viewer)->put(route('skills.update', $skill), $updateData);

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_delete_skill_without_users()
    {
        $skill = Skill::factory()->create();

        $response = $this->actingAs($this->admin)->delete(route('skills.destroy', $skill));

        $response->assertRedirect(route('skills.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('skills', ['id' => $skill->id]);
    }

    /** @test */
    public function admin_cannot_delete_skill_with_users()
    {
        $skill = Skill::factory()->create();
        $user = User::factory()->create();
        $skill->users()->attach($user, ['proficiency_level' => 'intermediate']);

        $response = $this->actingAs($this->admin)->delete(route('skills.destroy', $skill));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('skills', ['id' => $skill->id]);
    }

    /** @test */
    public function check_dependencies_returns_correct_data()
    {
        $skill = Skill::factory()->create();
        $users = User::factory()->count(3)->create();
        
        foreach ($users as $user) {
            $skill->users()->attach($user, ['proficiency_level' => 'expert']);
        }

        $response = $this->actingAs($this->admin)
            ->get(route('skills.check-dependencies', $skill));

        $response->assertStatus(200);
        $response->assertJson([
            'canDelete' => false,
            'dependencies' => [
                'users' => [
                    'count' => 3,
                    'label' => 'Usuários',
                ],
            ],
        ]);
    }

    /** @test */
    public function skill_name_must_be_unique()
    {
        Skill::factory()->create(['name' => 'Existing Skill']);

        $skillData = [
            'name' => 'Existing Skill',
            'description' => 'Test Description',
            'category' => 'Técnica',
        ];

        $response = $this->actingAs($this->admin)->post(route('skills.store'), $skillData);

        $response->assertSessionHasErrors(['name']);
    }

    /** @test */
    public function search_filters_skills_correctly()
    {
        Skill::factory()->create(['name' => 'Soldagem MIG']);
        Skill::factory()->create(['name' => 'Programação CLP']);
        Skill::factory()->create(['description' => 'Habilidade em soldagem']);

        $response = $this->actingAs($this->admin)
            ->get(route('skills.index', ['search' => 'soldagem']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('skills.data', 2)
        );
    }

    /** @test */
    public function show_page_displays_skill_details()
    {
        $skill = Skill::factory()->create([
            'name' => 'Test Skill',
            'category' => 'Técnica',
        ]);

        $users = User::factory()->count(2)->create();
        foreach ($users as $user) {
            $skill->users()->attach($user, ['proficiency_level' => 'advanced']);
        }

        $response = $this->actingAs($this->admin)->get(route('skills.show', $skill));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('skills/show')
            ->where('skill.name', 'Test Skill')
            ->where('skill.category', 'Técnica')
            ->has('skill.users', 2)
        );
    }

    /** @test */
    public function plant_manager_has_full_skills_permissions()
    {
        $skill = Skill::factory()->create();

        // Can create
        $this->assertTrue($this->plantManager->can('create', Skill::class));
        
        // Can update
        $this->assertTrue($this->plantManager->can('update', $skill));
        
        // Can delete
        $this->assertTrue($this->plantManager->can('delete', $skill));
    }

    /** @test */
    public function maintenance_supervisor_has_full_skills_permissions()
    {
        $supervisor = User::factory()->create();
        $supervisor->assignRole('Maintenance Supervisor');

        $skill = Skill::factory()->create();

        // Can create
        $this->assertTrue($supervisor->can('create', Skill::class));
        
        // Can update
        $this->assertTrue($supervisor->can('update', $skill));
        
        // Can delete
        $this->assertTrue($supervisor->can('delete', $skill));
    }

    /** @test */
    public function skill_validation_rules_work_correctly()
    {
        // Test name is required
        $response = $this->actingAs($this->admin)->post(route('skills.store'), [
            'description' => 'Test Description',
            'category' => 'Técnica',
        ]);

        $response->assertSessionHasErrors(['name']);

        // Test category is required
        $response = $this->actingAs($this->admin)->post(route('skills.store'), [
            'name' => 'Test Skill',
            'description' => 'Test Description',
        ]);

        $response->assertSessionHasErrors(['category']);
    }
}