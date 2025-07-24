<?php

namespace Database\Factories\Production;

use App\Models\Production\BomItem;
use App\Models\Production\ProductionRouting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ProductionRouting>
 */
class ProductionRoutingFactory extends Factory
{
    protected $model = ProductionRouting::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sequence = fake()->numberBetween(1, 999999);
        
        return [
            'bom_item_id' => BomItem::factory(),
            'routing_number' => sprintf('RT-%06d', $sequence),
            'name' => fake()->words(3, true) . ' Routing',
            'description' => fake()->optional(0.7)->sentence(),
            'routing_type' => 'defined',
            'parent_routing_id' => null,
            'is_active' => fake()->boolean(90),
            'created_by' => User::factory(),
        ];
    }

    /**
     * Indicate that the routing is inherited.
     */
    public function inherited(): static
    {
        return $this->state(fn (array $attributes) => [
            'routing_type' => 'inherited',
            'parent_routing_id' => ProductionRouting::factory(),
        ]);
    }

    /**
     * Indicate that the routing is defined (not inherited).
     */
    public function defined(): static
    {
        return $this->state(fn (array $attributes) => [
            'routing_type' => 'defined',
            'parent_routing_id' => null,
        ]);
    }

    /**
     * Indicate that the routing is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ProductionRouting $routing) {
            // Only create steps for defined routings
            if ($routing->routing_type === 'defined') {
                $stepCount = fake()->numberBetween(2, 6);
                
                for ($i = 1; $i <= $stepCount; $i++) {
                    $operationName = fake()->randomElement(['Cut', 'Mill', 'Drill', 'Turn', 'Grind', 'Assemble', 'Weld', 'Paint', 'Inspect', 'Package']);
                    $routing->steps()->create([
                        'step_number' => $i,
                        'operation_code' => strtoupper(substr($operationName, 0, 3)) . '-' . sprintf('%03d', $i),
                        'name' => $operationName . ' ' . fake()->words(2, true),
                        'description' => fake()->optional(0.6)->sentence(),
                        'work_cell_id' => \App\Models\Production\WorkCell::factory()->create()->id,
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
                    ]);
                }
            }
        });
    }
} 