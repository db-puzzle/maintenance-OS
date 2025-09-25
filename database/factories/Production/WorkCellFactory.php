<?php

namespace Database\Factories\Production;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use App\Models\Production\WorkCell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\WorkCell>
 */
class WorkCellFactory extends Factory
{
    protected $model = WorkCell::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $cellTypes = ['internal', 'external'];
        $departments = ['Machining', 'Assembly', 'Welding', 'Painting', 'Quality', 'Packaging'];

        $number = fake()->numberBetween(1, 99);
        $cellType = fake()->randomElement($cellTypes);

        return [
            'name' => fake()->randomElement($departments) . ' Cell ' . $number,
            'description' => fake()->optional(0.7)->sentence(),
            'cell_type' => $cellType,
            'has_finite_capacity' => fake()->boolean(90),
            'default_production_rate_per_hour' => fake()->randomFloat(2, 10, 100),
            'default_unit_of_measure' => fake()->randomElement(['PC', 'KG', 'L', 'M']),
            'default_setup_time_minutes' => fake()->numberBetween(5, 60),
            'max_parallel_executions' => fake()->numberBetween(1, 5),
            'shift_id' => null, // Will be set if Shift exists
            'plant_id' => null, // Will be set if Plant exists
            'area_id' => null, // Will be set if Area exists
            'sector_id' => null, // Will be set if Sector exists
            'manufacturer_id' => $cellType === 'external' ? null : null, // Don't auto-create manufacturer
            'is_active' => fake()->boolean(90),
        ];
    }

    /**
     * Indicate that the work cell is external.
     */
    public function external(): static
    {
        return $this->state(fn (array $attributes) => [
            'cell_type' => 'external',
            'manufacturer_id' => Manufacturer::factory(),
        ]);
    }

    /**
     * Indicate that the work cell is internal.
     */
    public function internal(): static
    {
        return $this->state(fn (array $attributes) => [
            'cell_type' => 'internal',
            'manufacturer_id' => null,
        ]);
    }

    /**
     * Indicate that the work cell is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Assign to a plant.
     */
    public function forPlant(Plant $plant): static
    {
        return $this->state(fn (array $attributes) => [
            'plant_id' => $plant->id,
        ]);
    }

    /**
     * Assign to an area.
     */
    public function forArea(Area $area): static
    {
        return $this->state(fn (array $attributes) => [
            'area_id' => $area->id,
            'plant_id' => $area->plant_id,
        ]);
    }

    /**
     * Assign to a sector.
     */
    public function forSector(Sector $sector): static
    {
        return $this->state(fn (array $attributes) => [
            'sector_id' => $sector->id,
            'area_id' => $sector->area_id,
        ]);
    }

    /**
     * Assign to a shift.
     */
    public function forShift(Shift $shift): static
    {
        return $this->state(fn (array $attributes) => [
            'shift_id' => $shift->id,
        ]);
    }
}
