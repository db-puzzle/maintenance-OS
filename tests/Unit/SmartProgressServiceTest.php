<?php

namespace Tests\Unit;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;
use App\Services\Production\SmartProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SmartProgressServiceTest extends TestCase
{
    use RefreshDatabase;

    protected SmartProgressService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new SmartProgressService();
        Queue::fake();
    }

    public function test_update_progress_calculates_and_queues_parent_update()
    {
        $parentOrder = ManufacturingOrder::factory()->create();
        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'quantity' => 100,
            'quantity_completed' => 50
        ]);

        $progress = $this->service->updateProgress($childOrder, true);

        $this->assertEquals(50.0, $progress);
        
        // Should queue parent update
        Queue::assertPushed(UpdateSmartProgress::class, function ($job) use ($parentOrder) {
            return $job->order->id === $parentOrder->id;
        });
    }

    public function test_update_progress_without_parent_propagation()
    {
        $parentOrder = ManufacturingOrder::factory()->create();
        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'quantity' => 100,
            'quantity_completed' => 50
        ]);

        $progress = $this->service->updateProgress($childOrder, false);

        $this->assertEquals(50.0, $progress);
        
        // Should NOT queue parent update
        Queue::assertNotPushed(UpdateSmartProgress::class);
    }

    public function test_batch_update_progress()
    {
        $orders = ManufacturingOrder::factory()->count(5)->create([
            'quantity' => 100,
            'quantity_completed' => 25
        ]);

        $updated = $this->service->batchUpdateProgress($orders->pluck('id'));

        $this->assertEquals(5, $updated);

        // Verify all orders were updated
        foreach ($orders as $order) {
            $order->refresh();
            $this->assertEquals(25.0, $order->smart_progress_percentage);
            $this->assertNotNull($order->progress_calculated_at);
        }
    }

    public function test_get_affected_orders()
    {
        // Create hierarchy: grandparent -> parent -> child
        $grandparent = ManufacturingOrder::factory()->create();
        $parent = ManufacturingOrder::factory()->create([
            'parent_id' => $grandparent->id
        ]);
        $child = ManufacturingOrder::factory()->create([
            'parent_id' => $parent->id
        ]);

        $affected = $this->service->getAffectedOrders($child->id);

        // Should include child, parent, and grandparent
        $this->assertCount(3, $affected);
        $this->assertTrue($affected->contains($child->id));
        $this->assertTrue($affected->contains($parent->id));
        $this->assertTrue($affected->contains($grandparent->id));
    }

    public function test_invalidate_progress_cache()
    {
        $order = ManufacturingOrder::factory()->create([
            'smart_progress_percentage' => 50,
            'progress_calculated_at' => now()
        ]);

        $this->service->invalidateProgressCache($order);

        $order->refresh();
        $this->assertNull($order->progress_calculated_at);

        // Should queue recalculation
        Queue::assertPushed(UpdateSmartProgress::class, function ($job) use ($order) {
            return $job->order->id === $order->id;
        });
    }

    public function test_recalculate_hierarchy()
    {
        $root = ManufacturingOrder::factory()->create([
            'quantity' => 10,
            'quantity_completed' => 5
        ]);

        $child1 = ManufacturingOrder::factory()->create([
            'parent_id' => $root->id,
            'quantity' => 20,
            'quantity_completed' => 10
        ]);

        $child2 = ManufacturingOrder::factory()->create([
            'parent_id' => $root->id,
            'quantity' => 30,
            'quantity_completed' => 15
        ]);

        $breakdown = $this->service->recalculateHierarchy($child1);

        // Should start from root
        $this->assertEquals($root->id, $breakdown['order_id']);
        $this->assertCount(2, $breakdown['children']);
        $this->assertEquals(50.0, $breakdown['progress']);
    }

    public function test_get_progress_statistics()
    {
        // Create orders with various progress levels
        ManufacturingOrder::factory()->create(['smart_progress_percentage' => 10]);
        ManufacturingOrder::factory()->create(['smart_progress_percentage' => 35]);
        ManufacturingOrder::factory()->create(['smart_progress_percentage' => 65]);
        ManufacturingOrder::factory()->create(['smart_progress_percentage' => 85]);
        ManufacturingOrder::factory()->create(['smart_progress_percentage' => 100]);

        $stats = $this->service->getProgressStatistics();

        $this->assertEquals(5, $stats['total_orders']);
        $this->assertEquals(59.0, $stats['average_progress']); // (10+35+65+85+100)/5
        $this->assertEquals(1, $stats['orders_by_progress']['0-25']);
        $this->assertEquals(1, $stats['orders_by_progress']['26-50']);
        $this->assertEquals(1, $stats['orders_by_progress']['51-75']);
        $this->assertEquals(1, $stats['orders_by_progress']['76-99']);
        $this->assertEquals(1, $stats['orders_by_progress']['100']);
    }
}
