<?php

namespace Database\Factories\WorkOrders;

use App\Models\WorkOrders\WorkOrderType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkOrders\WorkOrderType>
 */
class WorkOrderTypeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = WorkOrderType::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = ['corrective', 'preventive', 'inspection', 'project'];
        $category = $this->faker->randomElement($categories);
        
        return [
            'name' => $this->faker->words(3, true),
            'code' => strtoupper($this->faker->unique()->lexify('??_???')),
            'category' => $category,
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'icon' => $this->faker->randomElement(['wrench', 'cog', 'tools', 'hammer']),
            'default_priority' => $this->faker->randomElement(['low', 'normal', 'high']),
            'requires_approval' => $this->faker->boolean(),
            'auto_approve_from_routine' => $this->faker->boolean(),
            'sla_hours' => $this->faker->numberBetween(24, 168),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the work order type is for corrective maintenance.
     */
    public function corrective(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => 'corrective',
            'requires_approval' => true,
            'auto_approve_from_routine' => false,
        ]);
    }

    /**
     * Indicate that the work order type is for preventive maintenance.
     */
    public function preventive(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => 'preventive',
            'requires_approval' => false,
            'auto_approve_from_routine' => true,
        ]);
    }

    /**
     * Indicate that the work order type is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
        ]);
    }

    /**
     * Indicate that the work order type is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
} 