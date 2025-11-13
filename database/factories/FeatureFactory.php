<?php

namespace Database\Factories;

use App\Models\Central\Feature;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Feature Factory.
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Central\Feature>
 */
class FeatureFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\Illuminate\Database\Eloquent\Model>
     */
    protected $model = Feature::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'key' => 'test_' . fake()->unique()->slug(2),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'category' => fake()->randomElement(['production', 'scheduling', 'reporting', 'admin']),
            'is_global' => fake()->boolean(),
            'is_enabled_globally' => false,
            'requires_backend_validation' => true,
            'metadata' => null,
        ];
    }

    /**
     * Indicate that the feature is global.
     */
    public function global(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_global' => true,
        ]);
    }

    /**
     * Indicate that the feature is enabled globally.
     */
    public function enabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_enabled_globally' => true,
        ]);
    }

    /**
     * Indicate that the feature is disabled globally.
     */
    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_enabled_globally' => false,
        ]);
    }

    /**
     * Indicate that the feature is plan-based.
     */
    public function planBased(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_global' => false,
        ]);
    }
}
