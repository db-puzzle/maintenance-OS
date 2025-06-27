<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Manufacturer;
use Tests\Unit\ModelTestCase;

class ManufacturerTest extends ModelTestCase
{

    public function test_manufacturer_can_be_created_with_factory()
    {
        $manufacturer = Manufacturer::factory()->create();

        $this->assertDatabaseHas('manufacturers', [
            'id' => $manufacturer->id,
            'name' => $manufacturer->name,
        ]);
        $this->assertNotNull($manufacturer->name);
        $this->assertNotNull($manufacturer->country);
    }

    public function test_manufacturer_has_many_assets()
    {
        $manufacturer = Manufacturer::factory()->create();
        $assets = Asset::factory()->count(3)->create([
            'manufacturer_id' => $manufacturer->id,
        ]);

        $this->assertCount(3, $manufacturer->assets);
        $this->assertTrue($manufacturer->assets->contains($assets->first()));
    }

    public function test_manufacturer_asset_count_attribute()
    {
        $manufacturer = Manufacturer::factory()->create();
        
        $this->assertEquals(0, $manufacturer->asset_count);

        Asset::factory()->count(5)->create([
            'manufacturer_id' => $manufacturer->id,
        ]);

        $manufacturer->refresh();
        $this->assertEquals(5, $manufacturer->asset_count);
    }

    public function test_manufacturer_well_known_factory_state()
    {
        $manufacturer = Manufacturer::factory()->wellKnown()->create();

        $this->assertContains($manufacturer->name, ['Siemens', 'ABB', 'Schneider Electric', 'General Electric', 'Emerson', 'Honeywell']);
        $this->assertNotNull($manufacturer->website);
        $this->assertContains($manufacturer->country, ['Germany', 'Switzerland', 'France', 'USA']);
    }

    public function test_manufacturer_fillable_attributes()
    {
        $data = [
            'name' => 'Test Manufacturer',
            'website' => 'https://test.com',
            'email' => 'contact@test.com',
            'phone' => '+1234567890',
            'country' => 'Brazil',
            'notes' => 'Test notes',
        ];

        $manufacturer = Manufacturer::create($data);

        $this->assertDatabaseHas('manufacturers', $data);
        $this->assertEquals('Test Manufacturer', $manufacturer->name);
        $this->assertEquals('https://test.com', $manufacturer->website);
        $this->assertEquals('contact@test.com', $manufacturer->email);
        $this->assertEquals('+1234567890', $manufacturer->phone);
        $this->assertEquals('Brazil', $manufacturer->country);
        $this->assertEquals('Test notes', $manufacturer->notes);
    }

    public function test_manufacturer_optional_fields()
    {
        $manufacturer = Manufacturer::factory()->create([
            'website' => null,
            'email' => null,
            'phone' => null,
            'notes' => null,
        ]);

        $this->assertNull($manufacturer->website);
        $this->assertNull($manufacturer->email);
        $this->assertNull($manufacturer->phone);
        $this->assertNull($manufacturer->notes);
        $this->assertNotNull($manufacturer->name);
        $this->assertNotNull($manufacturer->country);
    }
} 