<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use Tests\Unit\ModelTestCase;

class PlantTest extends ModelTestCase
{

    public function test_plant_can_be_created_with_factory()
    {
        $plant = Plant::factory()->create();

        $this->assertDatabaseHas('plants', [
            'id' => $plant->id,
            'name' => $plant->name,
        ]);
        $this->assertNotNull($plant->name);
        $this->assertNotNull($plant->street);
        $this->assertNotNull($plant->number);
        $this->assertNotNull($plant->city);
        $this->assertNotNull($plant->state);
        $this->assertNotNull($plant->zip_code);
        $this->assertNotNull($plant->gps_coordinates);
        $this->assertNotNull($plant->shift_id);
    }

    public function test_plant_belongs_to_shift()
    {
        $shift = Shift::factory()->create();
        $plant = Plant::factory()->withShift($shift)->create();

        $this->assertEquals($shift->id, $plant->shift_id);
        $this->assertTrue($plant->shift->is($shift));
    }

    public function test_plant_has_many_areas()
    {
        $plant = Plant::factory()->create();
        $areas = Area::factory()->count(3)->forPlant($plant)->create();

        $this->assertCount(3, $plant->areas);
        $this->assertTrue($plant->areas->contains($areas->first()));
    }

    public function test_plant_has_many_sectors_through_areas()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        $sectors = Sector::factory()->count(2)->forArea($area)->create();

        $this->assertCount(2, $plant->sectors);
        $this->assertTrue($plant->sectors->contains($sectors->first()));
    }

    public function test_plant_has_many_assets()
    {
        $plant = Plant::factory()->create();
        $assets = Asset::factory()->count(2)->plantLevel($plant)->create();

        $this->assertCount(2, $plant->asset);
        $this->assertTrue($plant->asset->contains($assets->first()));
    }

    public function test_plant_cannot_be_deleted_with_areas()
    {
        $plant = Plant::factory()->create();
        Area::factory()->forPlant($plant)->create();

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $plant->delete();
    }

    public function test_plant_cannot_be_deleted_with_assets()
    {
        $plant = Plant::factory()->create();
        Asset::factory()->plantLevel($plant)->create();

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $plant->delete();
    }

    public function test_plant_can_be_created_in_sao_paulo()
    {
        $plant = Plant::factory()->inSaoPaulo()->create();

        $this->assertEquals('São Paulo', $plant->city);
        $this->assertEquals('SP', $plant->state);
        $this->assertEquals('01000-000', $plant->zip_code);
    }

    public function test_plant_fillable_attributes()
    {
        $shift = Shift::factory()->create();
        $data = [
            'name' => 'Test Plant',
            'street' => 'Test Street',
            'number' => '123',
            'city' => 'Test City',
            'state' => 'SP',
            'zip_code' => '12345-678',
            'gps_coordinates' => '-23.5505, -46.6333',
            'shift_id' => $shift->id,
        ];

        $plant = Plant::create($data);

        $this->assertDatabaseHas('plants', $data);
        $this->assertEquals('Test Plant', $plant->name);
        $this->assertEquals('Test Street', $plant->street);
        $this->assertEquals('123', $plant->number);
    }
} 