<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use Tests\Unit\ModelTestCase;

class SectorTest extends ModelTestCase
{

    public function test_sector_can_be_created_with_factory()
    {
        $sector = Sector::factory()->create();

        $this->assertDatabaseHas('sectors', [
            'id' => $sector->id,
            'name' => $sector->name,
        ]);
        $this->assertNotNull($sector->name);
        $this->assertNotNull($sector->area_id);
        $this->assertNotNull($sector->shift_id);
    }

    public function test_sector_belongs_to_area()
    {
        $area = Area::factory()->create();
        $sector = Sector::factory()->forArea($area)->create();

        $this->assertEquals($area->id, $sector->area_id);
        $this->assertTrue($sector->area->is($area));
    }

    public function test_sector_belongs_to_shift()
    {
        $shift = Shift::factory()->create();
        $sector = Sector::factory()->withShift($shift)->create();

        $this->assertEquals($shift->id, $sector->shift_id);
        $this->assertTrue($sector->shift->is($shift));
    }

    public function test_sector_inherits_shift_from_area()
    {
        $shift = Shift::factory()->create();
        $plant = Plant::factory()->withShift($shift)->create();
        $area = Area::factory()->forPlant($plant)->create();
        $sector = Sector::factory()->forArea($area)->create();

        $this->assertEquals($shift->id, $sector->shift_id);
        $this->assertEquals($area->shift_id, $sector->shift_id);
    }

    public function test_sector_has_many_assets()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        $sector = Sector::factory()->forArea($area)->create();
        $assets = Asset::factory()->count(2)->forPlantHierarchy($plant, $area, $sector)->create();

        $this->assertCount(2, $sector->asset);
        $this->assertTrue($sector->asset->contains($assets->first()));
    }

    public function test_sector_cannot_be_deleted_with_assets()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        $sector = Sector::factory()->forArea($area)->create();
        Asset::factory()->forPlantHierarchy($plant, $area, $sector)->create();

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $sector->delete();
    }

    public function test_sector_casts_attributes()
    {
        $sector = Sector::factory()->create();

        $this->assertIsInt($sector->area_id);
        $this->assertIsInt($sector->shift_id);
    }

    public function test_sector_fillable_attributes()
    {
        $area = Area::factory()->create();
        $shift = Shift::factory()->create();
        
        $data = [
            'name' => 'Test Sector',
            'area_id' => $area->id,
            'shift_id' => $shift->id,
        ];

        $sector = Sector::create($data);

        $this->assertDatabaseHas('sectors', $data);
        $this->assertEquals('Test Sector', $sector->name);
        $this->assertEquals($area->id, $sector->area_id);
        $this->assertEquals($shift->id, $sector->shift_id);
    }
} 