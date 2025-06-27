<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetRuntimeMeasurement;
use App\Models\User;
use Carbon\Carbon;
use Tests\Unit\ModelTestCase;

class AssetRuntimeMeasurementTest extends ModelTestCase
{

    public function test_runtime_measurement_can_be_created_with_factory()
    {
        $measurement = AssetRuntimeMeasurement::factory()->create();

        $this->assertDatabaseHas('asset_runtime_measurements', [
            'id' => $measurement->id,
            'asset_id' => $measurement->asset_id,
        ]);
        $this->assertNotNull($measurement->asset_id);
        $this->assertNotNull($measurement->user_id);
        $this->assertNotNull($measurement->reported_hours);
        $this->assertNotNull($measurement->source);
        $this->assertNotNull($measurement->measurement_datetime);
    }

    public function test_runtime_measurement_belongs_to_asset()
    {
        $asset = Asset::factory()->create();
        $measurement = AssetRuntimeMeasurement::factory()->forAsset($asset)->create();

        $this->assertEquals($asset->id, $measurement->asset_id);
        $this->assertTrue($measurement->asset->is($asset));
    }

    public function test_runtime_measurement_belongs_to_user()
    {
        $user = User::factory()->create();
        $measurement = AssetRuntimeMeasurement::factory()->byUser($user)->create();

        $this->assertEquals($user->id, $measurement->user_id);
        $this->assertTrue($measurement->user->is($user));
    }

    public function test_runtime_measurement_source_types()
    {
        $sources = ['manual', 'shift_change', 'shift_update', 'iot', 'api'];
        
        foreach ($sources as $source) {
            $measurement = AssetRuntimeMeasurement::factory()->create([
                'source' => $source,
            ]);
            
            $this->assertEquals($source, $measurement->source);
        }
    }

    public function test_runtime_measurement_from_shift_change()
    {
        $measurement = AssetRuntimeMeasurement::factory()->fromShiftChange()->create();

        $this->assertEquals('shift_change', $measurement->source);
        $this->assertEquals('Automatic measurement from shift change', $measurement->notes);
    }

    public function test_runtime_measurement_from_shift_update()
    {
        $measurement = AssetRuntimeMeasurement::factory()->fromShiftUpdate()->create();

        $this->assertEquals('shift_update', $measurement->source);
        $this->assertEquals('Automatic measurement from shift schedule update', $measurement->notes);
    }

    public function test_runtime_measurement_from_iot()
    {
        $measurement = AssetRuntimeMeasurement::factory()->fromIoT()->create();

        $this->assertEquals('iot', $measurement->source);
        $this->assertEquals('Automatic measurement from IoT device', $measurement->notes);
    }

    public function test_runtime_measurement_from_api()
    {
        $measurement = AssetRuntimeMeasurement::factory()->fromAPI()->create();

        $this->assertEquals('api', $measurement->source);
        $this->assertEquals('Measurement received via API integration', $measurement->notes);
    }

    public function test_runtime_measurement_previous_hours_attribute()
    {
        $asset = Asset::factory()->create();
        $user = User::factory()->create();

        // Create measurements with specific times
        $older = AssetRuntimeMeasurement::factory()->create([
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 100,
            'created_at' => now()->subDays(2),
        ]);

        $current = AssetRuntimeMeasurement::factory()->create([
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 150,
            'created_at' => now()->subDay(),
        ]);

        $this->assertEquals(100, $current->previous_hours);
        $this->assertEquals(0, $older->previous_hours); // No previous measurement
    }

    public function test_runtime_measurement_hours_difference_attribute()
    {
        $asset = Asset::factory()->create();
        $user = User::factory()->create();

        $older = AssetRuntimeMeasurement::factory()->create([
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 100,
            'created_at' => now()->subDays(2),
        ]);

        $current = AssetRuntimeMeasurement::factory()->create([
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 150,
            'created_at' => now()->subDay(),
        ]);

        $this->assertEquals(50, $current->hours_difference);
        $this->assertEquals(100, $older->hours_difference); // 100 - 0
    }

    public function test_runtime_measurement_casts_attributes()
    {
        $measurement = AssetRuntimeMeasurement::factory()->create();

        $this->assertIsFloat($measurement->reported_hours);
        $this->assertInstanceOf(Carbon::class, $measurement->measurement_datetime);
        $this->assertInstanceOf(Carbon::class, $measurement->created_at);
        $this->assertInstanceOf(Carbon::class, $measurement->updated_at);
    }

    public function test_runtime_measurement_fillable_attributes()
    {
        $asset = Asset::factory()->create();
        $user = User::factory()->create();
        
        $data = [
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 123.45,
            'source' => 'manual',
            'notes' => 'Test measurement',
            'measurement_datetime' => now(),
        ];

        $measurement = AssetRuntimeMeasurement::create($data);

        $this->assertDatabaseHas('asset_runtime_measurements', [
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'reported_hours' => 123.45,
            'source' => 'manual',
            'notes' => 'Test measurement',
        ]);
        $this->assertEquals(123.45, $measurement->reported_hours);
        $this->assertEquals('Test measurement', $measurement->notes);
    }

    public function test_runtime_measurement_optional_notes()
    {
        $measurement = AssetRuntimeMeasurement::factory()->create([
            'notes' => null,
        ]);

        $this->assertNull($measurement->notes);
    }

    public function test_runtime_measurement_ordering()
    {
        $asset = Asset::factory()->create();
        
        // Create measurements in random order
        $oldest = AssetRuntimeMeasurement::factory()->forAsset($asset)->create([
            'created_at' => now()->subDays(3),
        ]);
        $newest = AssetRuntimeMeasurement::factory()->forAsset($asset)->create([
            'created_at' => now(),
        ]);
        $middle = AssetRuntimeMeasurement::factory()->forAsset($asset)->create([
            'created_at' => now()->subDay(),
        ]);

        // They should be ordered by created_at desc
        $measurements = $asset->runtimeMeasurements;
        $this->assertTrue($measurements[0]->is($newest));
        $this->assertTrue($measurements[1]->is($middle));
        $this->assertTrue($measurements[2]->is($oldest));
    }
} 