<?php

namespace Tests\Unit\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
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
        $this->assertTrue(method_exists($routine, 'routineExecutions'));
    }

    /**
     * Test routine factory states set correct attributes
     */
    public function test_routine_factory_states_attributes()
    {
        // Test daily state
        $dailyRoutine = Routine::factory()->daily()->make();
        $this->assertEquals(24, $dailyRoutine->trigger_hours);
        $this->assertEquals('Daily Inspection', $dailyRoutine->name);
        
        // Test weekly state
        $weeklyRoutine = Routine::factory()->weekly()->make();
        $this->assertEquals(168, $weeklyRoutine->trigger_hours);
        $this->assertEquals('Weekly Maintenance', $weeklyRoutine->name);
        
        // Test monthly state
        $monthlyRoutine = Routine::factory()->monthly()->make();
        $this->assertEquals(720, $monthlyRoutine->trigger_hours);
        $this->assertEquals('Monthly Maintenance', $monthlyRoutine->name);
        
        // Test inactive state
        $inactiveRoutine = Routine::factory()->inactive()->make();
        $this->assertEquals('Inactive', $inactiveRoutine->status);
    }

    /**
     * Test routine fillable attributes
     */
    public function test_routine_fillable_attributes()
    {
        $asset = Asset::factory()->create();
        $form = Form::factory()->create();
        
        $data = [
            'asset_id' => $asset->id,
            'name' => 'Test Routine',
            'trigger_hours' => 336,
            'status' => 'Active',
            'description' => 'Test description',
            'form_id' => $form->id,
            'active_form_version_id' => null,
        ];

        $routine = Routine::create($data);

        $this->assertDatabaseHas('routines', $data);
        $this->assertEquals('Test Routine', $routine->name);
        $this->assertEquals(336, $routine->trigger_hours);
    }
    
    /**
     * Test routine casts
     */
    public function test_routine_casts_attributes()
    {
        $routine = new Routine([
            'trigger_hours' => '168',
            'asset_id' => '5',
        ]);
        
        // Force cast attributes
        $routine->syncOriginal();
        
        $this->assertIsInt($routine->trigger_hours);
        $this->assertIsInt($routine->asset_id);
    }
} 