<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\Asset>
 */
class AssetFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Asset::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->forPlant($plant)->create();
        $sector = Sector::factory()->forArea($area)->create();
        
        return [
            'tag' => strtoupper($this->faker->unique()->bothify('??-###-??')),
            'serial_number' => $this->faker->unique()->numerify('SN-########'),
            'part_number' => $this->faker->optional()->numerify('PN-####-###'),
            'asset_type_id' => AssetType::factory(),
            'description' => $this->faker->sentence(),
            'manufacturer' => null, // deprecated field
            'manufacturer_id' => Manufacturer::factory(),
            'manufacturing_year' => $this->faker->numberBetween(2000, date('Y')),
            'plant_id' => $plant->id,
            'area_id' => $area->id,
            'sector_id' => $sector->id,
            'shift_id' => $plant->shift_id,
            'photo_path' => null,
        ];
    }

    /**
     * Indicate that the asset belongs to a specific plant hierarchy.
     */
    public function forPlantHierarchy(Plant $plant, ?Area $area = null, ?Sector $sector = null): static
    {
        return $this->state(function (array $attributes) use ($plant, $area, $sector) {
            $state = [
                'plant_id' => $plant->id,
                'shift_id' => $plant->shift_id,
            ];
            
            if ($area) {
                $state['area_id'] = $area->id;
                if ($sector) {
                    $state['sector_id'] = $sector->id;
                }
            }
            
            return $state;
        });
    }

    /**
     * Indicate that the asset is at plant level only.
     */
    public function plantLevel(Plant $plant): static
    {
        return $this->state(fn (array $attributes) => [
            'plant_id' => $plant->id,
            'area_id' => null,
            'sector_id' => null,
            'shift_id' => $plant->shift_id,
        ]);
    }

    /**
     * Indicate that the asset is a pump.
     */
    public function pump(): static
    {
        return $this->state(fn (array $attributes) => [
            'asset_type_id' => AssetType::factory()->pump(),
            'description' => 'Centrifugal pump for process fluid transfer',
        ]);
    }

    /**
     * Indicate that the asset is a motor.
     */
    public function motor(): static
    {
        return $this->state(fn (array $attributes) => [
            'asset_type_id' => AssetType::factory()->motor(),
            'description' => 'Electric motor for equipment drive',
        ]);
    }

    /**
     * Indicate that the asset has a photo.
     */
    public function withPhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_path' => 'assets/' . $this->faker->uuid() . '.jpg',
        ]);
    }
} 