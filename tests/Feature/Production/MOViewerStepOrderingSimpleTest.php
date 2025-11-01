<?php

namespace Tests\Feature\Production;

use App\Models\User;
use Illuminate\Support\Facades\DB;

it('ensures manufacturing steps are displayed in correct operational sequence', function () {
    // Create a user
    $user = User::factory()->create();

    // Directly create minimal data needed for the test
    DB::table('units_of_measure')->insert([
        'code' => 'PC',
        'name' => 'Piece',
        'uom_type' => 'COUNT',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('item_categories')->insert([
        'id' => 1,
        'name' => 'Test Category',
        'is_active' => true,
    ]);

    DB::table('items')->insert([
        'id' => 1,
        'item_number' => 'TEST-001',
        'name' => 'Test Item',
        'item_category_id' => 1,
        'unit_of_measure_code' => 'PC',
        'created_by' => $user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('work_cells')->insert([
        'id' => 1,
        'name' => 'Work Cell 1',
        'default_unit_of_measure_code' => 'PC',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('manufacturing_orders')->insert([
        'id' => 1,
        'order_number' => 'MO-001',
        'item_id' => 1,
        'quantity' => 100,
        'unit_of_measure_code' => 'PC',
        'status' => 'released',
        'created_by' => $user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('manufacturing_routes')->insert([
        'id' => 1,
        'manufacturing_order_id' => 1,
        'name' => 'Test Route',
        'item_id' => 1,
        'created_by' => $user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Create steps in intentionally wrong order to test ordering
    DB::table('manufacturing_steps')->insert([
        [
            'id' => 3,
            'manufacturing_route_id' => 1,
            'name' => 'Step 3 - Final Assembly',
            'work_cell_id' => 1,
            'status' => 'queued', // Different status to show it doesn't affect order
            'quantity' => 100,
            'depends_on_step_id' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => 1,
            'manufacturing_route_id' => 1,
            'name' => 'Step 1 - Preparation',
            'work_cell_id' => 1,
            'status' => 'completed',
            'quantity' => 100,
            'depends_on_step_id' => null, // First step
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => 2,
            'manufacturing_route_id' => 1,
            'name' => 'Step 2 - Processing',
            'work_cell_id' => 1,
            'status' => 'in_progress',
            'quantity' => 100,
            'depends_on_step_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    // Test the hierarchy endpoint
    $response = $this->actingAs($user)
        ->getJson(route('production.tracking.mo-viewer.hierarchy', ['orderId' => 1]));

    $response->assertOk();

    $orderData = $response->json('order');
    $routeSteps = $orderData['route_steps'];

    // Verify we have 3 steps
    expect($routeSteps)->toHaveCount(3);

    // Verify steps are in correct operational sequence regardless of their IDs or status
    expect($routeSteps[0]['name'])->toBe('Step 1 - Preparation');
    expect($routeSteps[0]['display_position'])->toBe(1);
    expect($routeSteps[0]['depends_on_step_id'])->toBeNull();
    expect($routeSteps[0]['status'])->toBe('completed');

    expect($routeSteps[1]['name'])->toBe('Step 2 - Processing');
    expect($routeSteps[1]['display_position'])->toBe(2);
    expect($routeSteps[1]['depends_on_step_id'])->toBe(1);
    expect($routeSteps[1]['status'])->toBe('in_progress');

    expect($routeSteps[2]['name'])->toBe('Step 3 - Final Assembly');
    expect($routeSteps[2]['display_position'])->toBe(3);
    expect($routeSteps[2]['depends_on_step_id'])->toBe(2);
    expect($routeSteps[2]['status'])->toBe('queued');
});
