<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\ShiftSchedule;
use App\Models\AssetHierarchy\ShiftTime;
use App\Models\AssetHierarchy\ShiftBreak;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\ShiftTime>
 */
class ShiftTimeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ShiftTime::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Default to a standard 8-hour shift
        return [
            'shift_schedule_id' => ShiftSchedule::factory(),
            'start_time' => '08:00:00',
            'end_time' => '16:00:00',
            'active' => true,
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ShiftTime $shiftTime) {
            // Create a lunch break by default
            ShiftBreak::factory()->lunch()->create([
                'shift_time_id' => $shiftTime->id,
            ]);
        });
    }

    /**
     * Indicate that this is a morning shift.
     */
    public function morning(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '06:00:00',
            'end_time' => '14:00:00',
        ]);
    }

    /**
     * Indicate that this is an afternoon shift.
     */
    public function afternoon(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '14:00:00',
            'end_time' => '22:00:00',
        ]);
    }

    /**
     * Indicate that this is a night shift.
     */
    public function night(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
        ]);
    }

    /**
     * Indicate that the shift is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    /**
     * Indicate that the shift has no breaks.
     */
    public function withoutBreaks(): static
    {
        return $this->afterCreating(function (ShiftTime $shiftTime) {
            // Delete any breaks that were created
            $shiftTime->breaks()->delete();
        });
    }
} 