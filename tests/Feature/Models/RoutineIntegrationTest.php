<?php

namespace Tests\Feature\Models;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
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
        
        // Create a non-admin user for testing
        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'name' => 'Test User'
        ]);
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
    public function test_routine_creates_form_on_creation()
    {
        $asset = Asset::factory()->create();
        
        $routine = Routine::create([
            'name' => 'Test Routine',
            'asset_id' => $asset->id,
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => 500,
            'execution_mode' => 'automatic',
            'description' => 'Test description',
        ]);
        
        $this->assertNotNull($routine->form);
        $this->assertEquals('Test Routine - Form', $routine->form->name);
        $this->assertEquals('Form for routine: Test Routine', $routine->form->description);
    }

    /**
     * Test routine can generate work order
     */
    public function test_routine_can_generate_work_order()
    {
        $routine = Routine::factory()->create([
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => 500,
            'execution_mode' => 'manual',
        ]);
        
        // Create work order type for preventive maintenance
        \App\Models\WorkOrders\WorkOrderType::create([
            'name' => 'Preventive Maintenance',
            'code' => 'PM',
            'category' => 'preventive',
            'is_active' => true,
        ]);
        
        $workOrder = $routine->generateWorkOrder();
        
        $this->assertInstanceOf(WorkOrder::class, $workOrder);
        $this->assertEquals('routine', $workOrder->source_type);
        $this->assertEquals($routine->id, $workOrder->source_id);
        $this->assertEquals($routine->asset_id, $workOrder->asset_id);
        $this->assertEquals('preventive', $workOrder->work_order_category);
    }

    /**
     * Test routine with runtime hours trigger
     */
    public function test_routine_with_runtime_hours_trigger()
    {
        $routine = Routine::factory()->runtimeBased()->create([
            'trigger_runtime_hours' => 500,
            'last_execution_runtime_hours' => 1000,
        ]);
        
        // Mock asset runtime
        $routine->asset->update(['current_runtime_hours' => 1450]);
        
        $hoursUntilDue = $routine->calculateHoursUntilDue();
        
        // Should be 50 hours until due (1500 - 1450)
        $this->assertNotNull($hoursUntilDue);
        $this->assertLessThan(100, $hoursUntilDue);
    }

    /**
     * Test routine with calendar days trigger
     */
    public function test_routine_with_calendar_days_trigger()
    {
        $routine = Routine::factory()->calendarBased()->create([
            'trigger_calendar_days' => 30,
            'last_execution_completed_at' => now()->subDays(25),
        ]);
        
        $hoursUntilDue = $routine->calculateHoursUntilDue();
        
        // Should be approximately 5 days (120 hours) until due
        $this->assertNotNull($hoursUntilDue);
        $this->assertGreaterThan(100, $hoursUntilDue);
        $this->assertLessThan(150, $hoursUntilDue);
    }

    /**
     * Test routine should generate work order logic
     */
    public function test_routine_should_generate_work_order()
    {
        $routine = Routine::factory()->runtimeBased()->create([
            'trigger_runtime_hours' => 500,
            'advance_generation_days' => 50,
            'last_execution_runtime_hours' => 1000,
        ]);
        
        // Mock asset runtime - exactly at generation window
        $routine->asset->update(['current_runtime_hours' => 1450]);
        
        $this->assertTrue($routine->shouldGenerateWorkOrder());
        
        // Create an open work order
        WorkOrder::create([
            'work_order_number' => 'WO-TEST-001',
            'title' => 'Test WO',
            'work_order_type_id' => 1,
            'work_order_category' => 'preventive',
            'asset_id' => $routine->asset_id,
            'source_type' => 'routine',
            'source_id' => $routine->id,
            'status' => 'in_progress',
            'requested_by' => $this->user->id,
        ]);
        
        // Should not generate when open work order exists
        $this->assertFalse($routine->shouldGenerateWorkOrder());
    }
} 