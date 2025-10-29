<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\WorkCell;
use App\Models\UnitOfMeasure;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StepExecutionPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create required reference data
        UnitOfMeasure::create([
            'code' => 'PC',
            'name' => 'Piece',
            'type' => 'count',
            'decimal_places' => 0,
        ]);

        ItemCategory::create([
            'name' => 'Test Category',
            'code' => 'TEST',
        ]);
    }

    /** @test */
    public function operator_can_upload_step_photos()
    {
        Storage::fake('public');

        $user = User::factory()->withPermission('production.steps.execute')->create();
        $execution = $this->createExecutionWithCompleteSetup($user);

        $response = $this->actingAs($user)
            ->post(route('production.reporting.steps.upload-photo', $execution), [
                'photo' => UploadedFile::fake()->image('step-photo.jpg', 1920, 1080),
            ]);

        $response->assertRedirect()
            ->assertSessionHas('newPhoto');

        expect($execution->fresh()->photo_count)->toBe(1);
        expect($execution->getMedia('step_photos'))->toHaveCount(1);
    }

    /** @test */
    public function step_photos_are_limited_to_three()
    {
        Storage::fake('public');

        $user = User::factory()->withPermission('production.steps.execute')->create();
        $execution = $this->createExecutionWithCompleteSetup($user);

        // Upload 3 photos
        for ($i = 0; $i < 3; $i++) {
            $execution->addMedia(
                UploadedFile::fake()->image("photo-{$i}.jpg")
            )->toMediaCollection('step_photos');
        }

        $this->actingAs($user)
            ->post(route('production.reporting.steps.upload-photo', $execution), [
                'photo' => UploadedFile::fake()->image('extra-photo.jpg'),
            ])
            ->assertRedirect()
            ->assertSessionHasErrors(['photo' => 'Maximum of 3 photos allowed per step.']);
    }

    /** @test */
    public function step_reporting_with_quantities_updates_cumulative_totals()
    {
        $user = User::factory()->withPermission('production.steps.execute')->create();
        $execution = $this->createExecutionWithCompleteSetup($user);

        $this->actingAs($user)
            ->post(route('production.reporting.steps.report', $execution), [
                'quantity_completed' => 10,
                'quantity_scrapped' => 2,
                'scrap_reason' => 'Material defect',
                'notes' => 'First batch complete',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $step = $execution->fresh()->manufacturingStep;
        expect($step->cumulative_quantity_completed)->toBe(10);
        expect($step->cumulative_quantity_scrapped)->toBe(2);
    }

    private function createExecutionWithCompleteSetup(User $user): ManufacturingStepExecution
    {
        // Create a complete MO with route and step
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'in_progress',
            'quantity' => 100,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
        ]);

        $workCell = WorkCell::factory()->create();
        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'status' => 'in_progress',
        ]);

        return ManufacturingStepExecution::factory()->inProgress()->create([
            'manufacturing_order_id' => $order->id,
            'manufacturing_step_id' => $step->id,
            'user_id' => $user->id,
        ]);
    }
}
