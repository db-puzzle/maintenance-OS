<?php

namespace Database\Factories\Production;

use App\Models\AssetHierarchy\Area;
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
        $departments = ['Machining', 'Assembly', 'Welding', 'Painting', 'Quality', 'Packaging'];

        $number = fake()->numberBetween(1, 99);

        return [
            'name' => fake()->randomElement($departments) . ' Cell ' . $number,
            'description' => fake()->optional(0.7)->sentence(),
            'has_finite_capacity' => fake()->boolean(90),
            'default_setup_time_seconds' => fake()->numberBetween(300, 3600), // 5-60 minutes
            'default_cycle_time_seconds' => fake()->randomFloat(2, 36, 360), // 0.01-0.1 hours per unit
            'default_unit_of_measure_code' => fake()->randomElement(['PC', 'KG', 'L', 'M']),
            'max_parallel_executions' => fake()->numberBetween(1, 5),
            'time_display_preference' => fake()->randomElement(['cycle_time', 'throughput']),
            'time_scale_preference' => fake()->randomElement(['seconds', 'minutes', 'hours', 'auto']),
            'shift_id' => null, // Will be set if Shift exists
            'plant_id' => null, // Will be set if Plant exists
            'area_id' => null, // Will be set if Area exists
            'sector_id' => null, // Will be set if Sector exists
            'is_active' => fake()->boolean(90),
        ];
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
