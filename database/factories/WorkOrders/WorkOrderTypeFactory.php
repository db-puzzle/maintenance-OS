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
        // Get a random category (default to maintenance categories)
        $category = \App\Models\WorkOrders\WorkOrderCategory::maintenance()
            ->inRandomOrder()
            ->first();
            
        if (!$category) {
            // Fallback - create a basic category if none exist
            $category = \App\Models\WorkOrders\WorkOrderCategory::firstOrCreate(
                ['code' => 'corrective', 'discipline' => 'maintenance'],
                [
                    'name' => 'Corrective',
                    'is_active' => true,
                ]
            );
        }
        
        return [
            'name' => $this->faker->words(3, true),
            'code' => strtoupper($this->faker->unique()->lexify('??_???')),
            'work_order_category_id' => $category->id,
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'icon' => $this->faker->randomElement(['wrench', 'cog', 'tools', 'hammer']),
            'default_priority_score' => $this->faker->numberBetween(30, 80),
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
        $category = \App\Models\WorkOrders\WorkOrderCategory::where('code', 'corrective')
            ->where('discipline', 'maintenance')
            ->first();
            
        return $this->state(fn (array $attributes) => [
            'work_order_category_id' => $category?->id,
            'requires_approval' => true,
            'auto_approve_from_routine' => false,
        ]);
    }

    /**
     * Indicate that the work order type is for preventive maintenance.
     */
    public function preventive(): static
    {
        $category = \App\Models\WorkOrders\WorkOrderCategory::where('code', 'preventive')
            ->where('discipline', 'maintenance')
            ->first();
            
        return $this->state(fn (array $attributes) => [
            'work_order_category_id' => $category?->id,
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