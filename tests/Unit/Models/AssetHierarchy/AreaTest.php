<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use Tests\Unit\ModelTestCase;

class AreaTest extends ModelTestCase
{

    public function test_area_can_be_created_with_factory()
    {
        $area = Area::factory()->create();

        $this->assertDatabaseHas('areas', [
            'id' => $area->id,
            'name' => $area->name,
        ]);
        $this->assertNotNull($area->name);
        $this->assertNotNull($area->plant_id);
        $this->assertNotNull($area->shift_id);
    }

    public function test_area_belongs_to_plant()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();

        $this->assertEquals($plant->id, $area->plant_id);
        $this->assertTrue($area->plant->is($plant));
    }

    public function test_area_belongs_to_shift()
    {
        $shift = Shift::factory()->create();
        $area = Area::factory()->withShift($shift)->create();

        $this->assertEquals($shift->id, $area->shift_id);
        $this->assertTrue($area->shift->is($shift));
    }

    public function test_area_inherits_shift_from_plant()
    {
        $shift = Shift::factory()->create();
        $plant = Plant::factory()->withShift($shift)->create();
        $area = Area::factory()->forPlant($plant)->create();

        $this->assertEquals($shift->id, $area->shift_id);
        $this->assertEquals($plant->shift_id, $area->shift_id);
    }

    public function test_area_has_many_sectors()
    {
        $area = Area::factory()->create();
        $sectors = Sector::factory()->count(3)->forArea($area)->create();

        $this->assertCount(3, $area->sectors);
        $this->assertTrue($area->sectors->contains($sectors->first()));
    }

    public function test_area_has_many_assets()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        $assets = Asset::factory()->count(2)->forPlantHierarchy($plant, $area)->create();

        $this->assertCount(2, $area->asset);
        $this->assertTrue($area->asset->contains($assets->first()));
    }

    public function test_area_cannot_be_deleted_with_sectors()
    {
        $area = Area::factory()->create();
        Sector::factory()->forArea($area)->create();

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $area->delete();
    }

    public function test_area_cannot_be_deleted_with_assets()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        Asset::factory()->forPlantHierarchy($plant, $area)->create();

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $area->delete();
    }

    public function test_area_casts_attributes()
    {
        $area = Area::factory()->create();

        $this->assertIsInt($area->plant_id);
        $this->assertIsInt($area->shift_id);
    }

    public function test_area_fillable_attributes()
    {
        $plant = Plant::factory()->create();
        $shift = Shift::factory()->create();
        
        $data = [
            'name' => 'Test Area',
            'description' => 'Test Description',
            'plant_id' => $plant->id,
            'shift_id' => $shift->id,
        ];

        $area = Area::create($data);

        $this->assertDatabaseHas('areas', $data);
        $this->assertEquals('Test Area', $area->name);
        $this->assertEquals('Test Description', $area->description);
    }
} 