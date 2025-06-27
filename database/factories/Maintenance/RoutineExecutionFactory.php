<?php

namespace Database\Factories\Maintenance;

use App\Models\Forms\FormExecution;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Maintenance\RoutineExecution>
 */
class RoutineExecutionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = RoutineExecution::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'routine_id' => Routine::factory(),
            'form_execution_id' => FormExecution::factory(),
            'executed_by' => User::factory(),
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'status' => 'completed',
            'notes' => $this->faker->optional()->paragraph(),
            'execution_data' => [],
        ];
    }

    /**
     * Indicate that the execution is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'started_at' => now()->subMinutes(30),
            'completed_at' => null,
            'status' => 'in_progress',
        ]);
    }

    /**
     * Indicate that the execution is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'started_at' => null,
            'completed_at' => null,
            'status' => 'pending',
        ]);
    }

    /**
     * Indicate that the execution was cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'notes' => 'Execution cancelled by user',
        ]);
    }

    /**
     * Indicate that the execution is for a specific routine.
     */
    public function forRoutine(Routine $routine): static
    {
        return $this->state(fn (array $attributes) => [
            'routine_id' => $routine->id,
        ]);
    }

    /**
     * Indicate that the execution was done by a specific user.
     */
    public function byUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'executed_by' => $user->id,
        ]);
    }
} 