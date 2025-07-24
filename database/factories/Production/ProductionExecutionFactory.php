<?php

namespace Database\Factories\Production;

use App\Models\Production\ProductionExecution;
use App\Models\Production\ProductionSchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ProductionExecution>
 */
class ProductionExecutionFactory extends Factory
{
    protected $model = ProductionExecution::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = ['setup', 'running', 'paused', 'completed'];
        $status = fake()->randomElement($statuses);
        
        $startTime = fake()->dateTimeBetween('-8 hours', 'now');
        $endTime = in_array($status, ['completed']) 
            ? fake()->dateTimeBetween($startTime, 'now') 
            : null;
        
        $pauseReasons = [
            'Break time',
            'Material shortage',
            'Quality check',
            'Tooling change',
            'Maintenance',
            'Shift change',
        ];

        return [
            'production_schedule_id' => ProductionSchedule::factory(),
            'operator_id' => User::factory(),
            'status' => $status,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'quantity_produced' => fake()->numberBetween(0, 100),
            'quantity_good' => function (array $attributes) {
                $produced = $attributes['quantity_produced'];
                return fake()->numberBetween((int)($produced * 0.85), $produced);
            },
            'quantity_rejected' => function (array $attributes) {
                return $attributes['quantity_produced'] - $attributes['quantity_good'];
            },
            'setup_duration_minutes' => $status !== 'setup' ? fake()->numberBetween(5, 60) : null,
            'run_duration_minutes' => in_array($status, ['running', 'paused', 'completed']) 
                ? fake()->numberBetween(10, 480) 
                : null,
            'pause_duration_minutes' => in_array($status, ['paused', 'completed']) 
                ? fake()->numberBetween(5, 60) 
                : 0,
            'pause_reason' => $status === 'paused' 
                ? fake()->randomElement($pauseReasons) 
                : null,
            'notes' => fake()->optional(0.3)->sentence(),
            'quality_checks' => fake()->optional(0.5)->randomElement([[
                'dimensional_check' => fake()->randomElement(['pass', 'fail', 'pending']),
                'visual_inspection' => fake()->randomElement(['pass', 'fail', 'pending']),
                'functional_test' => fake()->randomElement(['pass', 'fail', 'pending', 'n/a']),
            ]),
            'machine_parameters' => fake()->optional(0.4)->randomElement([[
                'speed' => fake()->numberBetween(100, 2000) . ' rpm',
                'feed_rate' => fake()->randomFloat(2, 0.1, 10) . ' mm/min',
                'temperature' => fake()->numberBetween(20, 200) . '°C',
                'pressure' => fake()->numberBetween(1, 10) . ' bar',
            ]),
        ];
    }

    /**
     * Indicate that the execution is in setup.
     */
    public function setup(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'setup',
            'end_time' => null,
            'quantity_produced' => 0,
            'quantity_good' => 0,
            'quantity_rejected' => 0,
            'setup_duration_minutes' => null,
            'run_duration_minutes' => null,
        ]);
    }

    /**
     * Indicate that the execution is running.
     */
    public function running(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'running',
            'end_time' => null,
            'setup_duration_minutes' => fake()->numberBetween(5, 45),
        ]);
    }

    /**
     * Indicate that the execution is paused.
     */
    public function paused(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paused',
            'end_time' => null,
            'pause_reason' => fake()->randomElement([
                'Break time',
                'Material shortage',
                'Quality check',
                'Tooling change',
                'Maintenance',
            ]),
            'pause_duration_minutes' => fake()->numberBetween(5, 60),
        ]);
    }

    /**
     * Indicate that the execution is completed.
     */
    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            $startTime = $attributes['start_time'] ?? fake()->dateTimeBetween('-8 hours', '-1 hour');
            $endTime = fake()->dateTimeBetween($startTime, 'now');
            
            return [
                'status' => 'completed',
                'start_time' => $startTime,
                'end_time' => $endTime,
                'setup_duration_minutes' => fake()->numberBetween(5, 45),
                'run_duration_minutes' => fake()->numberBetween(30, 480),
            ];
        });
    }

    /**
     * Indicate perfect quality production.
     */
    public function perfectQuality(): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity_good' => $attributes['quantity_produced'],
            'quantity_rejected' => 0,
            'quality_checks' => [
                'dimensional_check' => 'pass',
                'visual_inspection' => 'pass',
                'functional_test' => 'pass',
            ],
        ]);
    }
} 