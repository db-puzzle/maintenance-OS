<?php

namespace Tests\Feature;

use App\Models\Certification;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class CertificationTest extends TestCase
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
    public function admin_can_view_certifications_list()
    {
        Certification::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)->get(route('certifications.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('certifications/index')
            ->has('certifications.data', 5)
        );
    }

    /** @test */
    public function technician_can_view_certifications_list()
    {
        Certification::factory()->count(3)->create();

        $response = $this->actingAs($this->technician)->get(route('certifications.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('certifications/index')
            ->has('certifications.data', 3)
            ->where('can.create', false)
        );
    }

    /** @test */
    public function admin_can_create_certification()
    {
        $certificationData = [
            'name' => 'Test Certification',
            'description' => 'Test Description',
            'issuing_organization' => 'Test Organization',
            'validity_period_days' => 365,
            'active' => true,
        ];

        $response = $this->actingAs($this->admin)->post(route('certifications.store'), $certificationData);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('certifications', [
            'name' => 'Test Certification',
            'issuing_organization' => 'Test Organization',
            'validity_period_days' => 365,
        ]);
    }

    /** @test */
    public function admin_can_create_certification_without_expiration()
    {
        $certificationData = [
            'name' => 'Permanent Certification',
            'description' => 'Never expires',
            'issuing_organization' => 'Test Organization',
            'validity_period_days' => null,
            'active' => true,
        ];

        $response = $this->actingAs($this->admin)->post(route('certifications.store'), $certificationData);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('certifications', [
            'name' => 'Permanent Certification',
            'validity_period_days' => null,
        ]);
    }

    /** @test */
    public function technician_cannot_create_certification()
    {
        $certificationData = [
            'name' => 'Test Certification',
            'description' => 'Test Description',
            'issuing_organization' => 'Test Organization',
            'validity_period_days' => 365,
            'active' => true,
        ];

        $response = $this->actingAs($this->technician)->post(route('certifications.store'), $certificationData);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('certifications', [
            'name' => 'Test Certification',
        ]);
    }

    /** @test */
    public function admin_can_update_certification()
    {
        $certification = Certification::factory()->create([
            'name' => 'Old Name',
            'validity_period_days' => 365,
        ]);

        $updateData = [
            'name' => 'New Name',
            'description' => 'New Description',
            'issuing_organization' => 'New Organization',
            'validity_period_days' => 730,
            'active' => false,
        ];

        $response = $this->actingAs($this->admin)->put(route('certifications.update', $certification), $updateData);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('certifications', [
            'id' => $certification->id,
            'name' => 'New Name',
            'validity_period_days' => 730,
            'active' => false,
        ]);
    }

    /** @test */
    public function viewer_cannot_update_certification()
    {
        $certification = Certification::factory()->create();

        $updateData = [
            'name' => 'New Name',
            'description' => 'New Description',
            'issuing_organization' => 'New Organization',
            'validity_period_days' => 730,
            'active' => false,
        ];

        $response = $this->actingAs($this->viewer)->put(route('certifications.update', $certification), $updateData);

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_delete_certification_without_users()
    {
        $certification = Certification::factory()->create();

        $response = $this->actingAs($this->admin)->delete(route('certifications.destroy', $certification));

        $response->assertRedirect(route('certifications.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('certifications', ['id' => $certification->id]);
    }

    /** @test */
    public function admin_cannot_delete_certification_with_users()
    {
        $certification = Certification::factory()->create();
        $user = User::factory()->create();
        $certification->users()->attach($user, [
            'issued_at' => now(),
            'expires_at' => now()->addYear(),
            'certificate_number' => 'CERT-12345',
        ]);

        $response = $this->actingAs($this->admin)->delete(route('certifications.destroy', $certification));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('certifications', ['id' => $certification->id]);
    }

    /** @test */
    public function check_dependencies_returns_correct_data()
    {
        $certification = Certification::factory()->create();
        $users = User::factory()->count(3)->create();
        
        foreach ($users as $user) {
            $certification->users()->attach($user, [
                'issued_at' => now(),
                'expires_at' => now()->addYear(),
                'certificate_number' => 'CERT-' . $user->id,
            ]);
        }

        $response = $this->actingAs($this->admin)
            ->get(route('certifications.check-dependencies', $certification));

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
    public function certification_name_must_be_unique()
    {
        Certification::factory()->create(['name' => 'Existing Certification']);

        $certificationData = [
            'name' => 'Existing Certification',
            'description' => 'Test Description',
            'issuing_organization' => 'Test Organization',
            'validity_period_days' => 365,
            'active' => true,
        ];

        $response = $this->actingAs($this->admin)->post(route('certifications.store'), $certificationData);

        $response->assertSessionHasErrors(['name']);
    }

    /** @test */
    public function search_filters_certifications_correctly()
    {
        Certification::factory()->create(['name' => 'NR-10 Safety']);
        Certification::factory()->create(['name' => 'ISO 9001']);
        Certification::factory()->create(['issuing_organization' => 'ISO Organization']);

        $response = $this->actingAs($this->admin)
            ->get(route('certifications.index', ['search' => 'ISO']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('certifications.data', 2)
        );
    }

    /** @test */
    public function active_filter_works_correctly()
    {
        Certification::factory()->count(3)->active()->create();
        Certification::factory()->count(2)->inactive()->create();

        $response = $this->actingAs($this->admin)
            ->get(route('certifications.index', ['active' => '1']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('certifications.data', 3)
        );
    }

    /** @test */
    public function show_page_displays_certification_details()
    {
        $certification = Certification::factory()->create([
            'name' => 'Test Certification',
            'issuing_organization' => 'Test Org',
            'validity_period_days' => 365,
        ]);

        $users = User::factory()->count(2)->create();
        foreach ($users as $index => $user) {
            $issuedAt = now()->subMonths($index * 6);
            $certification->users()->attach($user, [
                'issued_at' => $issuedAt,
                'expires_at' => $issuedAt->copy()->addYear(),
                'certificate_number' => 'CERT-' . ($index + 1),
            ]);
        }

        $response = $this->actingAs($this->admin)->get(route('certifications.show', $certification));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('certifications/show')
            ->where('certification.name', 'Test Certification')
            ->where('certification.issuing_organization', 'Test Org')
            ->has('certification.users', 2)
        );
    }

    /** @test */
    public function show_page_correctly_identifies_expired_certifications()
    {
        $certification = Certification::factory()->create([
            'validity_period_days' => 365,
        ]);

        $user = User::factory()->create();
        
        // Add an expired certification
        $certification->users()->attach($user, [
            'issued_at' => now()->subYears(2),
            'expires_at' => now()->subYear(), // Expired 1 year ago
            'certificate_number' => 'EXPIRED-CERT',
        ]);

        $response = $this->actingAs($this->admin)->get(route('certifications.show', $certification));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->where('certification.users.0.is_expired', true)
        );
    }

    /** @test */
    public function plant_manager_has_full_certifications_permissions()
    {
        $certification = Certification::factory()->create();

        // Can create
        $this->assertTrue($this->plantManager->can('create', Certification::class));
        
        // Can update
        $this->assertTrue($this->plantManager->can('update', $certification));
        
        // Can delete
        $this->assertTrue($this->plantManager->can('delete', $certification));
    }

    /** @test */
    public function maintenance_supervisor_has_full_certifications_permissions()
    {
        $supervisor = User::factory()->create();
        $supervisor->assignRole('Maintenance Supervisor');

        $certification = Certification::factory()->create();

        // Can create
        $this->assertTrue($supervisor->can('create', Certification::class));
        
        // Can update
        $this->assertTrue($supervisor->can('update', $certification));
        
        // Can delete
        $this->assertTrue($supervisor->can('delete', $certification));
    }

    /** @test */
    public function issuing_organization_is_required()
    {
        $certificationData = [
            'name' => 'Test Certification',
            'description' => 'Test Description',
            'issuing_organization' => '', // Empty
            'validity_period_days' => 365,
            'active' => true,
        ];

        $response = $this->actingAs($this->admin)->post(route('certifications.store'), $certificationData);

        $response->assertSessionHasErrors(['issuing_organization']);
    }
}