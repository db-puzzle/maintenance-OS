<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use Tests\Unit\ModelTestCase;

class AssetTypeTest extends ModelTestCase
{

    public function test_asset_type_can_be_created_with_factory()
    {
        $assetType = AssetType::factory()->create();

        $this->assertDatabaseHas('asset_types', [
            'id' => $assetType->id,
            'name' => $assetType->name,
        ]);
        $this->assertNotNull($assetType->name);
    }

    public function test_asset_type_has_many_assets()
    {
        $assetType = AssetType::factory()->create();
        $assets = Asset::factory()->count(3)->create([
            'asset_type_id' => $assetType->id,
        ]);

        $this->assertCount(3, $assetType->asset);
        $this->assertTrue($assetType->asset->contains($assets->first()));
    }

    public function test_asset_type_cannot_be_deleted_with_assets()
    {
        $assetType = AssetType::factory()->create();
        Asset::factory()->create([
            'asset_type_id' => $assetType->id,
        ]);

        // In unit tests, observers are disabled, so we expect a database constraint violation
        $this->expectException(\Illuminate\Database\QueryException::class);

        $assetType->delete();
    }

    public function test_asset_type_pump_factory_state()
    {
        $assetType = AssetType::factory()->pump()->create();

        $this->assertStringContainsString('Pump', $assetType->name);
        $this->assertEquals('Centrifugal pump for fluid transfer', $assetType->description);
    }

    public function test_asset_type_motor_factory_state()
    {
        $assetType = AssetType::factory()->motor()->create();

        $this->assertStringContainsString('Motor', $assetType->name);
        $this->assertEquals('Electric motor for mechanical drive', $assetType->description);
    }

    public function test_asset_type_fillable_attributes()
    {
        $data = [
            'name' => 'Test Asset Type',
            'description' => 'Test Description',
        ];

        $assetType = AssetType::create($data);

        $this->assertDatabaseHas('asset_types', $data);
        $this->assertEquals('Test Asset Type', $assetType->name);
        $this->assertEquals('Test Description', $assetType->description);
    }

    public function test_asset_type_optional_description()
    {
        $assetType = AssetType::factory()->create([
            'description' => null,
        ]);

        $this->assertNull($assetType->description);
        $this->assertNotNull($assetType->name);
    }

    public function test_asset_type_uses_correct_table()
    {
        $assetType = new AssetType();
        $this->assertEquals('asset_types', $assetType->getTable());
    }
} 