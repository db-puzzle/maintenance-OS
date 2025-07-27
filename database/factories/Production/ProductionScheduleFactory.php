<?php

namespace Database\Factories\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ProductionSchedule>
 */
class ProductionScheduleFactory extends Factory
{
    protected $model = ProductionSchedule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = ['scheduled', 'ready', 'in_progress', 'completed', 'delayed'];
        $status = fake()->randomElement($statuses);
        
        $scheduledStart = fake()->dateTimeBetween('now', '+2 weeks');
        $scheduledEnd = fake()->dateTimeBetween($scheduledStart, '+3 weeks');

        return [
            'production_order_id' => ManufacturingOrder::factory(),
            'routing_step_id' => ManufacturingStep::factory(),
            'work_cell_id' => WorkCell::factory(),
            'scheduled_start' => $scheduledStart,
            'scheduled_end' => $scheduledEnd,
            'buffer_time_minutes' => fake()->numberBetween(0, 60),
            'assigned_team_id' => null, // Teams need to exist first
            'assigned_operators' => fake()->boolean(60) ? json_encode(
                fake()->randomElements(range(1, 10), fake()->numberBetween(1, 3))
            ) : null,
            'status' => $status,
        ];
    }

    /**
     * Indicate that the schedule is scheduled.
     */
    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'scheduled',
        ]);
    }

    /**
     * Indicate that the schedule is ready.
     */
    public function ready(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ready',
        ]);
    }

    /**
     * Indicate that the schedule is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
        ]);
    }

    /**
     * Indicate that the schedule is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }

    /**
     * Indicate that the schedule is delayed.
     */
    public function delayed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'delayed',
        ]);
    }

    /**
     * Indicate that the schedule has no team assigned.
     */
    public function withoutTeam(): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_team_id' => null,
            'assigned_operators' => null,
        ]);
    }

    /**
     * Assign specific operators.
     */
    public function withOperators(array $userIds): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_operators' => json_encode($userIds),
        ]);
    }

    /**
     * Assign to a specific team.
     */
    public function forTeam(int $teamId): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_team_id' => $teamId,
        ]);
    }
} 