<?php

namespace Database\Factories\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Maintenance\Routine>
 */
class RoutineFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Routine::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $routineTypes = ['Preventive Maintenance', 'Inspection', 'Lubrication', 'Calibration', 'Cleaning'];
        $triggerType = $this->faker->randomElement(['runtime_hours', 'calendar_days']);
        
        // Runtime intervals in hours
        $runtimeIntervals = [24, 48, 72, 168, 336, 720, 2160, 4320, 8760];
        
        // Calendar intervals in days
        $calendarIntervals = [1, 3, 7, 14, 30, 60, 90, 180, 365];
        
        return [
            'asset_id' => Asset::factory(),
            'name' => $this->faker->randomElement($routineTypes) . ' - ' . $this->faker->words(2, true),
            'trigger_type' => $triggerType,
            'trigger_runtime_hours' => $triggerType === 'runtime_hours' ? $this->faker->randomElement($runtimeIntervals) : null,
            'trigger_calendar_days' => $triggerType === 'calendar_days' ? $this->faker->randomElement($calendarIntervals) : null,
            'execution_mode' => 'automatic',
            'description' => $this->faker->paragraph(),
            'form_id' => null, // Will be created automatically in the model's creating event
            'active_form_version_id' => null,
            'advance_generation_hours' => $this->faker->randomElement([12, 24, 48, 72, 168]),
            'auto_approve_work_orders' => false,
            'default_priority' => 'normal',
            'priority_score' => 50,
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }

    /**
     * Indicate that the routine is manual execution mode.
     */
    public function manual(): static
    {
        return $this->state(fn (array $attributes) => [
            'execution_mode' => 'manual',
        ]);
    }

    /**
     * Indicate that the routine is runtime-based.
     */
    public function runtimeBased(): static
    {
        return $this->state(fn (array $attributes) => [
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => $this->faker->randomElement([24, 48, 72, 168, 336, 720, 2160, 4320, 8760]),
            'trigger_calendar_days' => null,
        ]);
    }

    /**
     * Indicate that the routine is calendar-based.
     */
    public function calendarBased(): static
    {
        return $this->state(fn (array $attributes) => [
            'trigger_type' => 'calendar_days',
            'trigger_calendar_days' => $this->faker->randomElement([1, 3, 7, 14, 30, 60, 90, 180, 365]),
            'trigger_runtime_hours' => null,
        ]);
    }

    /**
     * Indicate that the routine is for a specific asset.
     */
    public function forAsset(Asset $asset): static
    {
        return $this->state(fn (array $attributes) => [
            'asset_id' => $asset->id,
        ]);
    }

    /**
     * Indicate that the routine is a daily routine.
     */
    public function daily(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Daily Inspection',
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => 24,
            'trigger_calendar_days' => null,
        ]);
    }

    /**
     * Indicate that the routine is a weekly routine.
     */
    public function weekly(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Weekly Maintenance',
            'trigger_type' => 'runtime_hours',
            'trigger_runtime_hours' => 168,
            'trigger_calendar_days' => null,
        ]);
    }

    /**
     * Indicate that the routine is a monthly routine.
     */
    public function monthly(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Monthly Maintenance',
            'trigger_type' => 'calendar_days',
            'trigger_calendar_days' => 30,
            'trigger_runtime_hours' => null,
        ]);
    }

    /**
     * Indicate that the routine has been executed.
     */
    public function withLastExecution(): static
    {
        return $this->state(function (array $attributes) {
            $now = now();
            
            if ($attributes['trigger_type'] === 'runtime_hours') {
                // For runtime-based, set last execution runtime hours
                $currentRuntime = $this->faker->numberBetween(1000, 5000);
                $lastRuntime = $currentRuntime - $this->faker->numberBetween(
                    (int)($attributes['trigger_runtime_hours'] * 0.5),
                    (int)($attributes['trigger_runtime_hours'] * 0.8)
                );
                
                return [
                    'last_execution_runtime_hours' => $lastRuntime,
                    'last_execution_completed_at' => $now->subDays($this->faker->numberBetween(5, 30)),
                ];
            } else {
                // For calendar-based, set last execution date
                $daysAgo = $this->faker->numberBetween(
                    (int)($attributes['trigger_calendar_days'] * 0.5),
                    (int)($attributes['trigger_calendar_days'] * 0.8)
                );
                
                return [
                    'last_execution_completed_at' => $now->subDays($daysAgo),
                ];
            }
        });
    }

    /**
     * Indicate that the routine auto-approves work orders.
     */
    public function withAutoApproval(): static
    {
        return $this->state(fn (array $attributes) => [
            'auto_approve_work_orders' => true,
        ]);
    }

    /**
     * Indicate that the routine is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the routine has a published form.
     */
    public function withPublishedForm(): static
    {
        return $this->afterCreating(function (Routine $routine) {
            $form = \App\Models\Forms\Form::factory()->create();
            $formVersion = \App\Models\Forms\FormVersion::factory()
                ->published()
                ->for($form)
                ->create();
            
            $routine->update([
                'form_id' => $form->id,
                'active_form_version_id' => $formVersion->id,
            ]);
        });
    }
} 