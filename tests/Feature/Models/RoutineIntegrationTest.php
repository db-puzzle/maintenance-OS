<?php

namespace Tests\Feature\Models;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoutineIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create and authenticate a user for all tests
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    /**
     * Test that routine can be created with factory and automatically creates a form
     */
    public function test_routine_can_be_created_with_factory_and_creates_form()
    {
        $routine = Routine::factory()->create();

        $this->assertDatabaseHas('routines', [
            'id' => $routine->id,
            'name' => $routine->name,
        ]);
        
        // Verify form was automatically created
        $this->assertNotNull($routine->form_id);
        $this->assertInstanceOf(Form::class, $routine->form);
        $this->assertEquals($routine->name . ' - Form', $routine->form->name);
        
        // Verify audit logs were created
        $auditLogs = PermissionAuditLog::where('user_id', $this->user->id)
            ->where('event_type', 'permissions.generated')
            ->get();
        
        $this->assertNotEmpty($auditLogs);
        
        // Check that a log exists for the plant permissions
        $plantLog = $auditLogs->where('auditable_type', 'App\Models\AssetHierarchy\Plant')->first();
        $this->assertNotNull($plantLog);
        $this->assertEquals($this->user->id, $plantLog->user_id);
    }

    /**
     * Test routine automatically creates form on creation
     */
    public function test_routine_automatically_creates_form()
    {
        $asset = Asset::factory()->create();
        
        $routine = Routine::create([
            'asset_id' => $asset->id,
            'name' => 'Test Routine',
            'trigger_hours' => 168,
            'status' => 'Active',
            'description' => 'Test description',
        ]);

        $this->assertNotNull($routine->form);
        $this->assertEquals('Test Routine - Form', $routine->form->name);
        $this->assertEquals('Form for routine: Test Routine', $routine->form->description);
        
        // Verify the form was created by the authenticated user
        $this->assertEquals($this->user->id, $routine->form->created_by);
    }

    /**
     * Test routine relationships
     */
    public function test_routine_belongs_to_asset()
    {
        $routine = Routine::factory()->create();
        
        $this->assertInstanceOf(Asset::class, $routine->asset);
        $this->assertEquals($routine->asset_id, $routine->asset->id);
    }

    /**
     * Test routine belongs to form
     */
    public function test_routine_belongs_to_form()
    {
        $routine = Routine::factory()->create();
        
        $this->assertInstanceOf(Form::class, $routine->form);
        $this->assertEquals($routine->form_id, $routine->form->id);
    }

    /**
     * Test routine has many executions
     */
    public function test_routine_has_many_executions()
    {
        $routine = Routine::factory()->create();
        $executions = RoutineExecution::factory()
            ->count(3)
            ->create(['routine_id' => $routine->id]);

        $this->assertCount(3, $routine->routineExecutions);
        $this->assertTrue($routine->routineExecutions->contains($executions->first()));
    }

    /**
     * Test routine with published form factory state
     */
    public function test_routine_with_published_form_factory_state()
    {
        $routine = Routine::factory()->withPublishedForm()->create();

        $this->assertNotNull($routine->form);
        
        // Reload the routine with relationships to ensure we have the latest data
        $routine->load('form.currentVersion', 'activeFormVersion');
        
        // The form should have been updated with a current version
        $this->assertNotNull($routine->active_form_version_id);
        $this->assertNotNull($routine->activeFormVersion);
        $this->assertTrue($routine->activeFormVersion->is_active);
        $this->assertNotNull($routine->activeFormVersion->published_at);
        $this->assertTrue($routine->hasPublishedForm());
    }

    /**
     * Test routine factory states for different frequencies
     */
    public function test_routine_daily_factory_state()
    {
        $routine = Routine::factory()->daily()->create();
        $this->assertEquals(24, $routine->trigger_hours);
    }

    public function test_routine_weekly_factory_state()
    {
        $routine = Routine::factory()->weekly()->create();
        $this->assertEquals(168, $routine->trigger_hours);
    }

    public function test_routine_monthly_factory_state()
    {
        $routine = Routine::factory()->monthly()->create();
        $this->assertEquals(720, $routine->trigger_hours);
    }

    /**
     * Test inactive routine factory state
     */
    public function test_routine_inactive_factory_state()
    {
        $routine = Routine::factory()->inactive()->create();
        $this->assertEquals('Inactive', $routine->status);
    }

    /**
     * Test get form version for execution
     */
    public function test_routine_get_form_version_for_execution()
    {
        // Test with active form version set
        $routine = Routine::factory()->create();
        $version = FormVersion::factory()->published()->create([
            'form_id' => $routine->form_id,
        ]);
        $routine->update(['active_form_version_id' => $version->id]);

        $this->assertTrue($routine->getFormVersionForExecution()->is($version));

        // Test without active form version (uses form's current version)
        $routine2 = Routine::factory()->withPublishedForm()->create();
        
        // Reload to get the updated relationships
        $routine2->load('form.currentVersion', 'activeFormVersion');
        
        // The factory should have set an active form version
        $this->assertNotNull($routine2->getFormVersionForExecution());
        
        // It should use the active form version set by the factory
        $this->assertEquals($routine2->active_form_version_id, $routine2->getFormVersionForExecution()->id);
    }

    /**
     * Test has published form method
     */
    public function test_routine_has_published_form()
    {
        // Routine without published form
        $routine1 = Routine::factory()->create();
        $this->assertFalse($routine1->hasPublishedForm());

        // Routine with published form
        $routine2 = Routine::factory()->withPublishedForm()->create();
        $this->assertTrue($routine2->hasPublishedForm());
    }

    /**
     * Test routine deleting cascade
     */
    public function test_routine_deleting_cascade()
    {
        // Temporarily enable model events if they were disabled
        $routine = Routine::factory()->create();
        $formId = $routine->form_id;
        
        // Verify form exists
        $this->assertDatabaseHas('forms', ['id' => $formId]);
        
        // Ensure the routine has the deleting event registered
        $this->assertNotNull($routine->form);
        
        // Delete routine - this should trigger the deleting event
        $routine->delete();
        
        // Verify routine was deleted
        $this->assertDatabaseMissing('routines', ['id' => $routine->id]);
        
        // The form should be soft deleted
        $form = Form::withTrashed()->find($formId);
        if ($form && $form->trashed()) {
            // If using soft deletes
            $this->assertNotNull($form->deleted_at);
        } else {
            // If not using soft deletes
            $this->assertDatabaseMissing('forms', ['id' => $formId]);
        }
    }

    /**
     * Test routine casts attributes
     */
    public function test_routine_casts_attributes()
    {
        $asset = Asset::factory()->create();
        $form = Form::factory()->create();
        
        $routine = Routine::create([
            'asset_id' => $asset->id,
            'name' => 'Test Routine',
            'trigger_hours' => '168',
            'status' => 'Active',
            'description' => 'Test description',
            'form_id' => $form->id,
        ]);

        $this->assertIsInt($routine->trigger_hours);
        $this->assertIsInt($routine->asset_id);
        $this->assertEquals(168, $routine->trigger_hours);
        $this->assertEquals($asset->id, $routine->asset_id);
    }
    
    /**
     * Test that audit logs track user correctly during routine operations
     */
    public function test_audit_logs_track_user_during_routine_operations()
    {
        // Create a second user to test different users creating routines
        $user2 = User::factory()->create();
        
        // First user creates a routine
        $this->actingAs($this->user);
        $routine1 = Routine::factory()->create(['name' => 'User 1 Routine']);
        
        // Second user creates a routine
        $this->actingAs($user2);
        $routine2 = Routine::factory()->create(['name' => 'User 2 Routine']);
        
        // Verify audit logs show correct users
        $logs = PermissionAuditLog::whereIn('user_id', [$this->user->id, $user2->id])
            ->where('event_type', 'permissions.generated')
            ->get();
        
        $this->assertGreaterThanOrEqual(2, $logs->count());
        
        // Verify each user's actions are properly logged
        $user1Logs = $logs->where('user_id', $this->user->id);
        $user2Logs = $logs->where('user_id', $user2->id);
        
        $this->assertNotEmpty($user1Logs);
        $this->assertNotEmpty($user2Logs);
    }
} 