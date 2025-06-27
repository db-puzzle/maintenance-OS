<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\Area>
 */
class AreaFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Area::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(3, true) . ' Area',
            'description' => $this->faker->optional()->sentence(),
            'plant_id' => Plant::factory(),
            'shift_id' => Shift::factory(),
        ];
    }

    /**
     * Indicate that the area belongs to a specific plant.
     */
    public function forPlant(Plant $plant): static
    {
        return $this->state(fn (array $attributes) => [
            'plant_id' => $plant->id,
            'shift_id' => $plant->shift_id,
        ]);
    }

    /**
     * Indicate that the area uses a specific shift.
     */
    public function withShift(Shift $shift): static
    {
        return $this->state(fn (array $attributes) => [
            'shift_id' => $shift->id,
        ]);
    }
} 