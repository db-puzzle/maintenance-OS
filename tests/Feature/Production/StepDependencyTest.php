<?php

namespace Tests\Feature\Production;

use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StepDependencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected ManufacturingRoute $route;
    protected WorkCell $workCell;

    protected function setUp(): void
    {
        parent::setUp();

        // Create required dependencies first
        $manufacturer = \App\Models\AssetHierarchy\Manufacturer::factory()->create();
        $plant = \App\Models\AssetHierarchy\Plant::factory()->create(['manufacturer_id' => $manufacturer->id]);
        $area = \App\Models\AssetHierarchy\Area::factory()->create(['plant_id' => $plant->id]);

        $this->admin = User::factory()->create();
        $this->workCell = WorkCell::factory()->create([
            'manufacturer_id' => $manufacturer->id,
            'plant_id' => $plant->id,
            'area_id' => $area->id,
        ]);
        $this->route = ManufacturingRoute::factory()->create(['is_template' => true]);
    }

    public function test_display_position_is_calculated_correctly()
    {
        // Create steps with dependencies
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'First Step',
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Second Step',
            'depends_on_step_id' => $step1->id,
        ]);

        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Third Step',
            'depends_on_step_id' => $step2->id,
        ]);

        $this->assertEquals(1, $step1->display_position);
        $this->assertEquals(2, $step2->display_position);
        $this->assertEquals(3, $step3->display_position);
    }

    public function test_get_ordered_steps_for_route_returns_correct_order()
    {
        // Create steps out of order
        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Third Step',
            'depends_on_step_id' => 999, // Will be updated
        ]);

        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'First Step',
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Second Step',
            'depends_on_step_id' => $step1->id,
        ]);

        // Update step3 to depend on step2
        $step3->update(['depends_on_step_id' => $step2->id]);

        $orderedSteps = ManufacturingStep::getOrderedStepsForRoute($this->route->id);

        $this->assertCount(3, $orderedSteps);
        $this->assertEquals('First Step', $orderedSteps[0]->name);
        $this->assertEquals('Second Step', $orderedSteps[1]->name);
        $this->assertEquals('Third Step', $orderedSteps[2]->name);
    }

    public function test_route_validation_passes_with_valid_structure()
    {
        // Create a valid route structure
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => $step1->id,
        ]);

        // Should not throw exception
        $this->route->validateForProduction();
        $this->assertTrue(true); // If we reach here, validation passed
    }

    public function test_route_validation_fails_without_root_step()
    {
        // Create steps with no root (all have dependencies)
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => 999, // Non-existent dependency
        ]);

        $this->expectException(\App\Exceptions\ValidationException::class);
        $this->expectExceptionMessage('Route must have exactly one root step');

        $this->route->validateForProduction();
    }

    public function test_route_validation_fails_with_multiple_root_steps()
    {
        // Create multiple root steps
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => null,
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => null,
        ]);

        $this->expectException(\App\Exceptions\ValidationException::class);
        $this->expectExceptionMessage('Route must have exactly one root step');

        $this->route->validateForProduction();
    }

    public function test_route_validation_detects_circular_dependencies()
    {
        // Create circular dependency
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => $step1->id,
        ]);

        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'depends_on_step_id' => $step2->id,
        ]);

        // Create circular dependency
        $step1->update(['depends_on_step_id' => $step3->id]);

        $this->expectException(\App\Exceptions\ValidationException::class);
        $this->expectExceptionMessage('Route contains circular dependencies');

        $this->route->validateForProduction();
    }

    public function test_step_reordering_updates_dependencies()
    {
        $this->actingAs($this->admin);

        // Create initial steps
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Step 1',
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Step 2',
            'depends_on_step_id' => $step1->id,
        ]);

        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Step 3',
            'depends_on_step_id' => $step2->id,
        ]);

        // Reorder steps: 2, 1, 3
        $response = $this->post(route('production.routing.reorder-steps', $this->route), [
            'step_ids' => [$step2->id, $step1->id, $step3->id],
        ]);

        $response->assertRedirect();

        // Check new dependencies
        $step1->refresh();
        $step2->refresh();
        $step3->refresh();

        $this->assertNull($step2->depends_on_step_id); // Step 2 is now first
        $this->assertEquals($step2->id, $step1->depends_on_step_id); // Step 1 depends on Step 2
        $this->assertEquals($step1->id, $step3->depends_on_step_id); // Step 3 depends on Step 1
    }

    public function test_export_includes_computed_step_numbers()
    {
        $this->actingAs($this->admin);

        // Create steps
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'First Step',
            'depends_on_step_id' => null,
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $this->route->id,
            'work_cell_id' => $this->workCell->id,
            'name' => 'Second Step',
        ]);

        // Use setupStepDependencies to establish proper order
        $this->route->setupStepDependencies();

        $response = $this->get(route('production.routing.export-json', $this->route));
        $response->assertSuccessful();

        $data = $response->json();

        $this->assertArrayHasKey('steps', $data);
        $this->assertCount(2, $data['steps']);
        $this->assertEquals(1, $data['steps'][0]['step_number']);
        $this->assertEquals(2, $data['steps'][1]['step_number']);
    }
}
