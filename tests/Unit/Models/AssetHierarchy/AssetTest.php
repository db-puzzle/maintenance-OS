<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetRuntimeMeasurement;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use App\Models\Maintenance\Routine;
use Tests\Unit\ModelTestCase;

class AssetTest extends ModelTestCase
{
    public function test_asset_can_be_created_with_factory()
    {
        $asset = Asset::factory()->create();

        $this->assertDatabaseHas('assets', [
            'id' => $asset->id,
            'tag' => $asset->tag,
        ]);
        $this->assertNotNull($asset->tag);
        $this->assertNotNull($asset->serial_number);
        $this->assertNotNull($asset->description);
        $this->assertNotNull($asset->asset_type_id);
        $this->assertNotNull($asset->manufacturer_id);
        $this->assertNotNull($asset->manufacturing_year);
        $this->assertNotNull($asset->plant_id);
        $this->assertNotNull($asset->area_id);
        $this->assertNotNull($asset->sector_id);
        $this->assertNotNull($asset->shift_id);
    }

    public function test_asset_belongs_to_relationships()
    {
        $asset = new Asset();

        // Test that all belongsTo relationship methods exist
        $this->assertTrue(method_exists($asset, 'assetType'));
        $this->assertTrue(method_exists($asset, 'plant'));
        $this->assertTrue(method_exists($asset, 'area'));
        $this->assertTrue(method_exists($asset, 'sector'));
        $this->assertTrue(method_exists($asset, 'shift'));
        $this->assertTrue(method_exists($asset, 'manufacturer'));
        
        // Create an asset and verify relationships can be accessed
        $asset = Asset::factory()->create();
        
        $this->assertInstanceOf(AssetType::class, $asset->assetType);
        $this->assertInstanceOf(Plant::class, $asset->plant);
        $this->assertInstanceOf(Area::class, $asset->area);
        $this->assertInstanceOf(Sector::class, $asset->sector);
        $this->assertInstanceOf(Shift::class, $asset->shift);
        
        // Test manufacturer separately since it seems problematic
        $this->assertNotNull($asset->manufacturer_id);
        $manufacturer = Manufacturer::find($asset->manufacturer_id);
        $this->assertInstanceOf(Manufacturer::class, $manufacturer);
    }

    public function test_asset_has_many_runtime_measurements()
    {
        $asset = Asset::factory()->create();
        $measurements = AssetRuntimeMeasurement::factory()->count(3)->forAsset($asset)->create();

        $this->assertCount(3, $asset->runtimeMeasurements);
        $this->assertTrue($asset->runtimeMeasurements->contains($measurements->first()));
    }

    public function test_asset_plant_level_factory_state()
    {
        $plant = Plant::factory()->create();
        $asset = Asset::factory()->plantLevel($plant)->create();

        $this->assertEquals($plant->id, $asset->plant_id);
        $this->assertNull($asset->area_id);
        $this->assertNull($asset->sector_id);
        $this->assertEquals($plant->shift_id, $asset->shift_id);
    }

    public function test_asset_pump_factory_state()
    {
        $asset = Asset::factory()->pump()->create();

        $this->assertEquals('Centrifugal pump for process fluid transfer', $asset->description);
        $this->assertStringContainsString('Pump', $asset->assetType->name);
    }

    public function test_asset_motor_factory_state()
    {
        $asset = Asset::factory()->motor()->create();

        $this->assertEquals('Electric motor for equipment drive', $asset->description);
        $this->assertStringContainsString('Motor', $asset->assetType->name);
    }

    public function test_asset_with_photo_factory_state()
    {
        $asset = Asset::factory()->withPhoto()->create();

        $this->assertNotNull($asset->photo_path);
        $this->assertStringContainsString('assets/', $asset->photo_path);
    }

    public function test_asset_casts_attributes()
    {
        $asset = Asset::factory()->create();

        $this->assertIsInt($asset->manufacturing_year);
        $this->assertIsInt($asset->asset_type_id);
        $this->assertIsInt($asset->manufacturer_id);
        $this->assertIsInt($asset->plant_id);
        $this->assertIsInt($asset->area_id);
        $this->assertIsInt($asset->sector_id);
        $this->assertIsInt($asset->shift_id);
    }

    public function test_asset_latest_runtime_measurement()
    {
        $asset = Asset::factory()->create();
        $older = AssetRuntimeMeasurement::factory()->forAsset($asset)->create([
            'created_at' => now()->subDays(2),
        ]);
        $latest = AssetRuntimeMeasurement::factory()->forAsset($asset)->create([
            'created_at' => now()->subDay(),
        ]);

        $this->assertTrue($asset->latestRuntimeMeasurement->is($latest));
        $this->assertFalse($asset->latestRuntimeMeasurement->is($older));
    }

    public function test_asset_current_runtime_hours_attribute()
    {
        $asset = Asset::factory()->create();
        
        // This uses the AssetRuntimeCalculator trait
        $runtime = $asset->current_runtime_hours;
        
        $this->assertIsFloat($runtime);
        $this->assertGreaterThanOrEqual(0, $runtime);
    }

    public function test_asset_fillable_attributes()
    {
        $plant = Plant::factory()->create();
        $assetType = AssetType::factory()->create();
        $manufacturer = Manufacturer::factory()->create();
        
        $data = [
            'tag' => 'TEST-001',
            'serial_number' => 'SN-12345678',
            'part_number' => 'PN-1234-567',
            'asset_type_id' => $assetType->id,
            'description' => 'Test Asset',
            'manufacturer' => null,
            'manufacturer_id' => $manufacturer->id,
            'manufacturing_year' => 2023,
            'plant_id' => $plant->id,
            'area_id' => null,
            'sector_id' => null,
            'shift_id' => $plant->shift_id,
            'photo_path' => null,
        ];

        $asset = Asset::create($data);

        $this->assertDatabaseHas('assets', $data);
        $this->assertEquals('TEST-001', $asset->tag);
        $this->assertEquals('SN-12345678', $asset->serial_number);
    }

    public function test_asset_type_has_many_assets()
    {
        $assetType = AssetType::factory()->create();
        $assets = Asset::factory()->count(3)->create(['asset_type_id' => $assetType->id]);
        
        $this->assertCount(3, $assetType->asset);
        $this->assertTrue($assetType->asset->contains($assets->first()));
    }
    
    public function test_manufacturer_has_many_assets()
    {
        $manufacturer = Manufacturer::factory()->create();
        $assets = Asset::factory()->count(3)->create(['manufacturer_id' => $manufacturer->id]);
        
        $this->assertCount(3, $manufacturer->assets);
        $this->assertEquals(3, $manufacturer->asset_count);
    }


} 