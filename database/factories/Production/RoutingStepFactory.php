<?php

namespace Database\Factories\Production;

use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ManufacturingStep>
 */
class RoutingStepFactory extends Factory
{
    protected $model = ManufacturingStep::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $operations = [
            'Cut', 'Mill', 'Drill', 'Turn', 'Grind', 'Bore', 'Tap', 'Ream',
            'Weld', 'Braze', 'Solder', 'Assemble', 'Press', 'Form', 'Bend',
            'Paint', 'Coat', 'Plate', 'Anodize', 'Heat Treat', 'Inspect',
            'Test', 'Package', 'Clean', 'Deburr',
        ];

        $operationName = fake()->randomElement($operations);
        $operationCode = strtoupper(substr($operationName, 0, 3)) . '-' . sprintf('%03d', fake()->numberBetween(1, 999));

        return [
            'manufacturing_route_id' => ManufacturingRoute::factory(),
            'display_order' => 0,
            'step_number' => null,
            'is_template' => false,
            'step_type' => 'standard',
            'name' => $operationName . ' ' . fake()->words(2, true),
            'description' => fake()->optional(0.7)->sentence(),
            'work_cell_id' => WorkCell::factory(),
            'status' => 'pending',
            'form_id' => null,
            'form_version_id' => null,
            'setup_time_seconds' => fake()->numberBetween(300, 3600), // 5-60 minutes
            'cycle_time_seconds' => fake()->numberBetween(60, 7200), // 1-120 minutes
            'use_workcell_throughput' => fake()->boolean(20),
            'actual_start_time' => null,
            'actual_end_time' => null,
            'quality_result' => null,
            'failure_action' => null,
            'quality_check_mode' => 'every_part',
            'sampling_size' => null,
            'depends_on_step_id' => null,
            'can_start_when_dependency' => 'completed',
            'dependency_start_condition' => 'completed',
            'dependency_minimum_quantity' => null,
            'dependency_minimum_percentage' => null,
            'cumulative_quantity_completed' => 0,
            'cumulative_quantity_scrapped' => 0,
            'child_order_dependency_type' => 'none',
            'child_order_minimum_quantity' => null,
            'scheduled_start' => null,
            'scheduled_end' => null,
        ];
    }

    /**
     * Set a specific step number.
     */
    public function stepNumber(int $number): static
    {
        return $this->state(fn (array $attributes) => [
            'step_number' => $number,
        ]);
    }

    /**
     * Set dependencies on previous steps.
     */
    public function withDependencies(array $dependencies): static
    {
        return $this->state(fn (array $attributes) => [
            'dependencies' => $dependencies,
        ]);
    }

    /**
     * Indicate this is a quick operation.
     */
    public function quick(): static
    {
        return $this->state(fn (array $attributes) => [
            'setup_time_seconds' => fake()->numberBetween(60, 600), // 1-10 minutes
            'cycle_time_seconds' => fake()->numberBetween(60, 300), // 1-5 minutes
        ]);
    }

    /**
     * Indicate this is a complex operation.
     */
    public function complex(): static
    {
        return $this->state(fn (array $attributes) => [
            'setup_time_seconds' => fake()->numberBetween(1800, 7200), // 30-120 minutes
            'cycle_time_seconds' => fake()->numberBetween(3600, 28800), // 60-480 minutes
        ]);
    }
}
