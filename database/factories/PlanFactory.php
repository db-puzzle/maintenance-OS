<?php

namespace Database\Factories;

use App\Models\Central\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Central\Plan>
 */
class PlanFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Plan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['Starter', 'Professional', 'Enterprise']),
            'description' => $this->faker->sentence(),
            'price' => $this->faker->randomElement([29.99, 49.99, 99.99, 199.99]),
            'trial_days' => 30,
            'features' => $this->faker->randomElements([
                'work_orders',
                'assets',
                'preventive_maintenance',
                'production_planning',
                'advanced_analytics',
                'api_access',
                'unlimited_users',
            ], $this->faker->numberBetween(2, 5)),
            'is_active' => true,
            'sort_order' => $this->faker->numberBetween(1, 10),
        ];
    }

    /**
     * Indicate that the plan is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the plan is free.
     */
    public function free(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Free',
            'price' => 0.00,
            'features' => ['basic_work_orders', 'basic_assets'],
        ]);
    }
}
