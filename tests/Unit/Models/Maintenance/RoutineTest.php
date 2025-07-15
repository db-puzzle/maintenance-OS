<?php

namespace Tests\Unit\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Models\User;
use Tests\Unit\ModelTestCase;

class RoutineTest extends ModelTestCase
{
    /**
     * Test routine relationship methods exist
     */
    public function test_routine_relationship_methods_exist()
    {
        $routine = new Routine();
        
        // Test that relationship methods exist
        $this->assertTrue(method_exists($routine, 'asset'));
        $this->assertTrue(method_exists($routine, 'form'));
        $this->assertTrue(method_exists($routine, 'activeFormVersion'));
        $this->assertTrue(method_exists($routine, 'lastExecutionFormVersion'));
        $this->assertTrue(method_exists($routine, 'workOrders'));
        $this->assertTrue(method_exists($routine, 'createdBy'));
    }

    /**
     * Test routine factory states set correct attributes
     */
    public function test_routine_factory_states_attributes()
    {
        // Test daily state
        $dailyRoutine = Routine::factory()->daily()->make();
        $this->assertEquals('runtime_hours', $dailyRoutine->trigger_type);
        $this->assertEquals(24, $dailyRoutine->trigger_runtime_hours);
        $this->assertEquals('Daily Inspection', $dailyRoutine->name);
        
        // Test weekly state
        $weeklyRoutine = Routine::factory()->weekly()->make();
        $this->assertEquals('runtime_hours', $weeklyRoutine->trigger_type);
        $this->assertEquals(168, $weeklyRoutine->trigger_runtime_hours);
        $this->assertEquals('Weekly Maintenance', $weeklyRoutine->name);
        
        // Test monthly state
        $monthlyRoutine = Routine::factory()->monthly()->make();
        $this->assertEquals('calendar_days', $monthlyRoutine->trigger_type);
        $this->assertEquals(30, $monthlyRoutine->trigger_calendar_days);
        $this->assertEquals('Monthly Maintenance', $monthlyRoutine->name);
        
        // Test manual state
        $manualRoutine = Routine::factory()->manual()->make();
        $this->assertEquals('manual', $manualRoutine->execution_mode);
        
        // Test runtime-based state
        $runtimeRoutine = Routine::factory()->runtimeBased()->make();
        $this->assertEquals('runtime_hours', $runtimeRoutine->trigger_type);
        $this->assertNotNull($runtimeRoutine->trigger_runtime_hours);
        $this->assertNull($runtimeRoutine->trigger_calendar_days);
        
        // Test calendar-based state
        $calendarRoutine = Routine::factory()->calendarBased()->make();
        $this->assertEquals('calendar_days', $calendarRoutine->trigger_type);
        $this->assertNotNull($calendarRoutine->trigger_calendar_days);
        $this->assertNull($calendarRoutine->trigger_runtime_hours);
    }

    /**
     * Test routine fillable attributes
     */
    public function test_routine_fillable_attributes()
    {
        $fillable = [
            'asset_id',
            'name',
            'trigger_type',
            'trigger_runtime_hours',
            'trigger_calendar_days',
            'execution_mode',
            'description',
            'form_id',
            'active_form_version_id',
            'advance_generation_days',
            'auto_approve_work_orders',
            'priority_score',
            'last_execution_runtime_hours',
            'last_execution_completed_at',
            'last_execution_form_version_id',
            'is_active',
            'created_by',
        ];
        
        $routine = new Routine();
        
        foreach ($fillable as $field) {
            $this->assertContains($field, $routine->getFillable());
        }
    }

    /**
     * Test routine casts
     */
    public function test_routine_casts()
    {
        $routine = new Routine();
        $casts = $routine->getCasts();
        
        $this->assertEquals('integer', $casts['trigger_runtime_hours']);
        $this->assertEquals('integer', $casts['trigger_calendar_days']);
        $this->assertEquals('integer', $casts['advance_generation_days']);
        $this->assertEquals('boolean', $casts['auto_approve_work_orders']);
        $this->assertEquals('decimal:2', $casts['last_execution_runtime_hours']);
        $this->assertArrayHasKey('last_execution_completed_at', $casts);
        $this->assertEquals('integer', $casts['priority_score']);
        $this->assertEquals('boolean', $casts['is_active']);
    }

    /**
     * Test routine scopes
     */
    public function test_routine_scopes()
    {
        $routine = new Routine();
        
        // Test that scope methods exist
        $this->assertTrue(method_exists($routine, 'scopeAutomatic'));
        $this->assertTrue(method_exists($routine, 'scopeManual'));
        $this->assertTrue(method_exists($routine, 'scopeActive'));
        $this->assertTrue(method_exists($routine, 'scopeRuntimeBased'));
        $this->assertTrue(method_exists($routine, 'scopeCalendarBased'));
    }

    /**
     * Test routine helper methods
     */
    public function test_routine_helper_methods()
    {
        $routine = new Routine();
        
        // Test that helper methods exist
        $this->assertTrue(method_exists($routine, 'isDue'));
        $this->assertTrue(method_exists($routine, 'getHoursUntilDue'));
        $this->assertTrue(method_exists($routine, 'calculateHoursUntilDue'));
        $this->assertTrue(method_exists($routine, 'calculateDueDate'));
        $this->assertTrue(method_exists($routine, 'shouldGenerateWorkOrder'));
        $this->assertTrue(method_exists($routine, 'hasOpenWorkOrder'));
        $this->assertTrue(method_exists($routine, 'getOpenWorkOrder'));
        $this->assertTrue(method_exists($routine, 'generateWorkOrder'));
    }

    /**
     * Test routine computed attributes
     */
    public function test_routine_computed_attributes()
    {
        $routine = Routine::factory()->make([
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => 500,
            'last_execution_runtime_hours' => 1000,
        ]);
        
        // Test progress percentage attribute
        $this->assertIsNumeric($routine->progress_percentage);
        
        // Test estimated hours until due attribute
        $this->assertIsNumeric($routine->estimated_hours_until_due);
        
        // Test next due date attribute (should be null for runtime-based)
        $this->assertNull($routine->next_due_date);
        
        // Test calendar-based routine
        $calendarRoutine = Routine::factory()->make([
            'trigger_type' => 'calendar_days',
            'trigger_calendar_days' => 30,
            'last_execution_completed_at' => now()->subDays(20),
        ]);
        
        // Next due date should be set for calendar-based
        $this->assertNotNull($calendarRoutine->next_due_date);
        
        // Estimated hours should be null for calendar-based
        $this->assertNull($calendarRoutine->estimated_hours_until_due);
    }
} 