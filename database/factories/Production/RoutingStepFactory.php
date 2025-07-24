<?php

namespace Database\Factories\Production;

use App\Models\Production\ProductionRouting;
use App\Models\Production\RoutingStep;
use App\Models\Production\WorkCell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\RoutingStep>
 */
class RoutingStepFactory extends Factory
{
    protected $model = RoutingStep::class;

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
            'Test', 'Package', 'Clean', 'Deburr'
        ];

        $operationName = fake()->randomElement($operations);
        $operationCode = strtoupper(substr($operationName, 0, 3)) . '-' . sprintf('%03d', fake()->numberBetween(1, 999));

        return [
            'production_routing_id' => ProductionRouting::factory(),
            'step_number' => 1,
            'operation_code' => $operationCode,
            'name' => $operationName . ' ' . fake()->words(2, true),
            'description' => fake()->optional(0.7)->sentence(),
            'work_cell_id' => WorkCell::factory(),
            'setup_time_minutes' => fake()->numberBetween(5, 60),
            'cycle_time_minutes' => fake()->numberBetween(1, 120),
            'tear_down_time_minutes' => fake()->numberBetween(5, 30),
            'labor_requirement' => fake()->numberBetween(1, 3),
            'skill_requirements' => fake()->boolean(40) ? json_encode(fake()->randomElements([1, 2, 3, 4, 5], fake()->numberBetween(1, 2))) : null,
            'tool_requirements' => fake()->boolean(40) ? json_encode(fake()->words(fake()->numberBetween(1, 3))) : null,
            'work_instructions' => fake()->optional(0.7)->paragraphs(fake()->numberBetween(1, 3), true),
            'safety_notes' => fake()->optional(0.3)->sentence(),
            'quality_checkpoints' => fake()->boolean(50) ? json_encode(fake()->sentences(fake()->numberBetween(1, 3))) : null,
            'attachments' => null,
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
            'setup_time_minutes' => fake()->numberBetween(1, 10),
            'cycle_time_minutes' => fake()->numberBetween(1, 5),
            'tear_down_time_minutes' => fake()->numberBetween(1, 5),
        ]);
    }

    /**
     * Indicate this is a complex operation.
     */
    public function complex(): static
    {
        return $this->state(fn (array $attributes) => [
            'setup_time_minutes' => fake()->numberBetween(30, 120),
            'cycle_time_minutes' => fake()->numberBetween(60, 480),
            'tear_down_time_minutes' => fake()->numberBetween(30, 60),
            'labor_requirement' => fake()->numberBetween(2, 5),
            'tool_requirements' => json_encode(fake()->words(fake()->numberBetween(3, 6))),
            'work_instructions' => fake()->paragraphs(fake()->numberBetween(3, 5), true),
            'safety_notes' => fake()->sentences(fake()->numberBetween(2, 4), true),
            'quality_checkpoints' => json_encode(fake()->sentences(fake()->numberBetween(3, 5))),
        ]);
    }
} 