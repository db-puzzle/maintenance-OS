<?php

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\User;

it('creates steps with correct step numbers from planning page', function () {
    $user = User::factory()->create();
    $order = ManufacturingOrder::factory()->draft()->create();

    $response = $this->actingAs($user)->post(route('production.planning.save-route', $order), [
        'steps' => [
            [
                'sequence' => 1,
                'name' => 'Step 1',
                'description' => 'First step',
                'work_cell_id' => null,
                'setup_time_minutes' => 10,
                'cycle_time_minutes' => 20,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
            [
                'sequence' => 2,
                'name' => 'Step 2',
                'description' => 'Second step',
                'work_cell_id' => null,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 15,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
            [
                'sequence' => 3,
                'name' => 'Step 3',
                'description' => 'Third step',
                'work_cell_id' => null,
                'setup_time_minutes' => 15,
                'cycle_time_minutes' => 30,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
        ],
    ]);

    $response->assertRedirect();

    $order->refresh();
    $route = $order->manufacturingRoute;
    expect($route)->not->toBeNull();

    $steps = $route->steps()->orderBy('step_number')->get();
    expect($steps)->toHaveCount(3);

    expect($steps[0]->step_number)->toBe(1);
    expect($steps[0]->name)->toBe('Step 1');

    expect($steps[1]->step_number)->toBe(2);
    expect($steps[1]->name)->toBe('Step 2');

    expect($steps[2]->step_number)->toBe(3);
    expect($steps[2]->name)->toBe('Step 3');
});

it('maintains step order when reordering steps', function () {
    $user = User::factory()->create();
    $order = ManufacturingOrder::factory()->draft()->create();
    $route = ManufacturingRoute::factory()->create([
        'manufacturing_order_id' => $order->id,
    ]);

    // Create initial steps
    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $route->id,
        'step_number' => 1,
        'name' => 'Original Step 1',
    ]);
    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $route->id,
        'step_number' => 2,
        'name' => 'Original Step 2',
    ]);
    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $route->id,
        'step_number' => 3,
        'name' => 'Original Step 3',
    ]);

    // Reorder steps: move step 3 to position 1
    $response = $this->actingAs($user)->post(route('production.planning.save-route', $order), [
        'steps' => [
            [
                'sequence' => 1,
                'name' => 'Original Step 3',
                'description' => '',
                'work_cell_id' => null,
                'setup_time_minutes' => 0,
                'cycle_time_minutes' => 0,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
            [
                'sequence' => 2,
                'name' => 'Original Step 1',
                'description' => '',
                'work_cell_id' => null,
                'setup_time_minutes' => 0,
                'cycle_time_minutes' => 0,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
            [
                'sequence' => 3,
                'name' => 'Original Step 2',
                'description' => '',
                'work_cell_id' => null,
                'setup_time_minutes' => 0,
                'cycle_time_minutes' => 0,
                'use_workcell_throughput' => false,
                'step_type' => 'standard',
                'child_order_dependency_type' => 'none',
                'child_order_minimum_quantity' => 0,
            ],
        ],
    ]);

    $response->assertRedirect();

    $route->refresh();
    $steps = $route->steps()->orderBy('step_number')->get();

    expect($steps[0]->step_number)->toBe(1);
    expect($steps[0]->name)->toBe('Original Step 3');

    expect($steps[1]->step_number)->toBe(2);
    expect($steps[1]->name)->toBe('Original Step 1');

    expect($steps[2]->step_number)->toBe(3);
    expect($steps[2]->name)->toBe('Original Step 2');
});

it('applies template with correct step numbers', function () {
    $user = User::factory()->create();
    $order = ManufacturingOrder::factory()->draft()->create();

    // Create a template
    $template = ManufacturingRoute::factory()->create([
        'is_template' => true,
        'manufacturing_order_id' => null,
    ]);

    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $template->id,
        'step_number' => 1,
        'name' => 'Template Step 1',
        'is_template' => true,
    ]);
    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $template->id,
        'step_number' => 2,
        'name' => 'Template Step 2',
        'is_template' => true,
    ]);
    ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $template->id,
        'step_number' => 3,
        'name' => 'Template Step 3',
        'is_template' => true,
    ]);

    $response = $this->actingAs($user)->post(route('production.planning.apply-template', $order), [
        'template_id' => $template->id,
    ]);

    $response->assertJson(['success' => true]);

    $order->refresh();
    $route = $order->manufacturingRoute;
    expect($route)->not->toBeNull();

    $steps = $route->steps()->orderBy('step_number')->get();
    expect($steps)->toHaveCount(3);

    expect($steps[0]->step_number)->toBe(1);
    expect($steps[0]->name)->toBe('Template Step 1');

    expect($steps[1]->step_number)->toBe(2);
    expect($steps[1]->name)->toBe('Template Step 2');

    expect($steps[2]->step_number)->toBe(3);
    expect($steps[2]->name)->toBe('Template Step 3');
});

it('creates rework step with correct step number', function () {
    $route = ManufacturingRoute::factory()->create();

    // Create initial steps
    $step1 = ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $route->id,
        'step_number' => 1,
        'name' => 'Step 1',
    ]);
    $step2 = ManufacturingStep::factory()->create([
        'manufacturing_route_id' => $route->id,
        'step_number' => 2,
        'name' => 'Step 2',
    ]);

    // Create rework step
    $reworkStep = $step1->createReworkStep();

    expect($reworkStep->step_number)->toBe(3);
    expect($reworkStep->step_type)->toBe('rework');
    expect($reworkStep->name)->toBe('Rework for Step 1');
});
