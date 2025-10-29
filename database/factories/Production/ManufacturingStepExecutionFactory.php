<?php

namespace Database\Factories\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ManufacturingStepExecutionFactory extends Factory
{
    protected $model = ManufacturingStepExecution::class;

    public function definition(): array
    {
        return [
            'manufacturing_order_id' => ManufacturingOrder::factory(),
            'manufacturing_step_id' => ManufacturingStep::factory(),
            'user_id' => User::factory(),
            'status' => $this->faker->randomElement(['queued', 'in_progress', 'completed', 'on_hold']),
            'quantity_completed' => 0,
            'quantity_scrapped' => 0,
            'started_at' => null,
            'completed_at' => null,
            'notes' => null,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'started_at' => now()->subHours(2),
            'completed_at' => now(),
            'quantity_completed' => $this->faker->numberBetween(10, 100),
        ]);
    }
}
