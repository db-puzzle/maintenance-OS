<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\Plant>
 */
class PlantFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Plant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $states = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'BA', 'PE', 'CE'];
        
        return [
            'name' => $this->faker->company() . ' Plant',
            'street' => $this->faker->streetName(),
            'number' => $this->faker->buildingNumber(),
            'city' => $this->faker->city(),
            'state' => $this->faker->randomElement($states),
            'zip_code' => $this->faker->numerify('#####-###'),
            'gps_coordinates' => $this->faker->latitude(-33.0, -1.0) . ', ' . $this->faker->longitude(-73.0, -34.0),
            'shift_id' => Shift::factory(),
        ];
    }

    /**
     * Indicate that the plant uses a specific shift.
     */
    public function withShift(Shift $shift): static
    {
        return $this->state(fn (array $attributes) => [
            'shift_id' => $shift->id,
        ]);
    }

    /**
     * Indicate that the plant is in São Paulo.
     */
    public function inSaoPaulo(): static
    {
        return $this->state(fn (array $attributes) => [
            'city' => 'São Paulo',
            'state' => 'SP',
            'zip_code' => '01000-000',
        ]);
    }
} 