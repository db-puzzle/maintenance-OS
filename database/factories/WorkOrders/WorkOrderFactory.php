<?php

namespace Database\Factories\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use App\Models\AssetHierarchy\Asset;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkOrders\WorkOrder>
 */
class WorkOrderFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = WorkOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $disciplines = ['maintenance', 'quality'];
        $discipline = $this->faker->randomElement($disciplines);
        
        // Get a random category for the discipline
        $category = \App\Models\WorkOrders\WorkOrderCategory::where('discipline', $discipline)
            ->inRandomOrder()
            ->first();
            
        if (!$category) {
            // Fallback if no categories exist
            $categoryCodes = $discipline === 'maintenance' 
                ? ['corrective', 'preventive', 'inspection', 'project']
                : ['calibration', 'quality_control', 'quality_audit', 'non_conformance'];
            $categoryCode = $this->faker->randomElement($categoryCodes);
            
            $category = \App\Models\WorkOrders\WorkOrderCategory::firstOrCreate(
                ['code' => $categoryCode, 'discipline' => $discipline],
                [
                    'name' => ucfirst(str_replace('_', ' ', $categoryCode)),
                    'is_active' => true,
                ]
            );
        }
            
        $priorities = ['emergency', 'urgent', 'high', 'normal', 'low'];
        $statuses = ['pending', 'approved', 'in_progress', 'completed'];
        
        return [
            'work_order_number' => 'WO-' . $this->faker->unique()->numberBetween(10000, 99999),
            'discipline' => $discipline,
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'work_order_type_id' => WorkOrderType::factory(),
            'work_order_category_id' => $category->id,
            'priority' => $this->faker->randomElement($priorities),
            'priority_score' => $this->faker->numberBetween(0, 100),
            'status' => $this->faker->randomElement($statuses),
            'asset_id' => Asset::factory(),
            'estimated_hours' => $this->faker->randomFloat(2, 1, 40),
            'requested_due_date' => $this->faker->dateTimeBetween('now', '+30 days'),
            'downtime_required' => $this->faker->boolean(30),
            'external_reference' => $this->faker->optional()->lexify('REF-???'),
            'warranty_claim' => $this->faker->boolean(10),
            'tags' => $this->faker->optional()->words(3),
            'requested_by' => User::factory(),
            'requested_at' => now(),
        ];
    }

    /**
     * Indicate that the work order is for maintenance.
     */
    public function maintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'discipline' => 'maintenance',
        ])->afterMaking(function (WorkOrder $workOrder) {
            $category = \App\Models\WorkOrders\WorkOrderCategory::maintenance()
                ->inRandomOrder()
                ->first();
            
            $workOrder->work_order_category_id = $category->id;
        });
    }

    /**
     * Indicate that the work order is for quality.
     */
    public function quality(): static
    {
        return $this->state(fn (array $attributes) => [
            'discipline' => 'quality',
        ])->afterMaking(function (WorkOrder $workOrder) {
            $category = \App\Models\WorkOrders\WorkOrderCategory::quality()
                ->inRandomOrder()
                ->first();
            
            $workOrder->work_order_category_id = $category->id;
        });
    }

    /**
     * Indicate that the work order is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }

    /**
     * Indicate that the work order is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_by' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    /**
     * Indicate that the work order is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'actual_start_date' => now(),
            'assigned_technician_id' => User::factory(),
        ]);
    }
} 