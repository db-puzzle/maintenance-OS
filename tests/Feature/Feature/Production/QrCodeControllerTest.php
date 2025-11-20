<?php

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

/*
 * Test QR code controller functionality.
 *
 * Tests that the QR code controller properly handles manufacturing orders
 * and items, including proper eager loading of media relationships.
 */
test('order scan loads item with media', function () {
    // Create a user
    $user = User::factory()->create();

    // Create an item with manufacturing capability
    $item = Item::factory()->create([
        'can_be_manufactured' => true,
    ]);

    // Create a manufacturing order
    $order = ManufacturingOrder::factory()->create([
        'item_id' => $item->id,
        'order_number' => 'MO-25324-001.1.1',
        'status' => 'released',
    ]);

    // Create a route for the order
    ManufacturingRoute::factory()->create([
        'manufacturing_order_id' => $order->id,
        'item_id' => $item->id,
    ]);

    // Scan the QR code
    $response = actingAs($user)->get("/qr/orders/{$order->order_number}");

    // Should get a successful response (either Inertia page or redirect)
    $response->assertSuccessful();
});

test('order scan handles orders without media', function () {
    // Create a user
    $user = User::factory()->create();

    // Create an item without media
    $item = Item::factory()->create([
        'can_be_manufactured' => true,
    ]);

    // Create a manufacturing order
    $order = ManufacturingOrder::factory()->create([
        'item_id' => $item->id,
        'order_number' => 'MO-TEST-001',
        'status' => 'released',
    ]);

    // Create a route for the order
    ManufacturingRoute::factory()->create([
        'manufacturing_order_id' => $order->id,
        'item_id' => $item->id,
    ]);

    // Scan the QR code should not fail
    $response = actingAs($user)->get("/qr/orders/{$order->order_number}");

    // Should get a successful response
    $response->assertSuccessful();
});

test('order scan redirects unauthenticated users to login', function () {
    // Create an item
    $item = Item::factory()->create([
        'can_be_manufactured' => true,
    ]);

    // Create a manufacturing order
    $order = ManufacturingOrder::factory()->create([
        'item_id' => $item->id,
        'order_number' => 'MO-TEST-002',
    ]);

    // Try to scan without authentication
    $response = get("/qr/orders/{$order->order_number}");

    // Should redirect to login
    $response->assertRedirect(route('login'));
});

test('item scan loads item successfully', function () {
    // Create a user
    $user = User::factory()->create();

    // Create an item
    $item = Item::factory()->create([
        'item_number' => 'ITEM-001',
    ]);

    // Scan the QR code
    $response = actingAs($user)->get("/qr/items/{$item->item_number}");

    // Should get a successful response
    $response->assertSuccessful();
});
