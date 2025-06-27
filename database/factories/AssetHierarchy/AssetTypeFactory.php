<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\AssetType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\AssetType>
 */
class AssetTypeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = AssetType::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $types = ['Pump', 'Motor', 'Valve', 'Compressor', 'Tank', 'Heat Exchanger', 'Conveyor', 'Generator'];
        
        return [
            'name' => $this->faker->unique()->randomElement($types) . ' - ' . $this->faker->numerify('Type ###'),
            'description' => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * Indicate that the asset type is for pumps.
     */
    public function pump(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Pump - ' . $this->faker->unique()->numerify('Model ###'),
            'description' => 'Centrifugal pump for fluid transfer',
        ]);
    }

    /**
     * Indicate that the asset type is for motors.
     */
    public function motor(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Motor - ' . $this->faker->unique()->numerify('Model ###'),
            'description' => 'Electric motor for mechanical drive',
        ]);
    }
} 