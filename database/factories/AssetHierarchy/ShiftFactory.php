<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\ShiftSchedule;
use App\Models\AssetHierarchy\ShiftTime;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\Shift>
 */
class ShiftFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Shift::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $timezones = ['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
        
        return [
            'name' => 'Shift ' . $this->faker->unique()->numberBetween(1, 9999),
            'timezone' => $this->faker->randomElement($timezones),
        ];
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Shift $shift) {
            // Create shift schedules for weekdays only by default
            $weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            
            foreach ($weekdays as $weekday) {
                $schedule = ShiftSchedule::factory()->create([
                    'shift_id' => $shift->id,
                    'weekday' => $weekday,
                ]);
                
                // Create a shift time for each schedule
                ShiftTime::factory()->create([
                    'shift_schedule_id' => $schedule->id,
                ]);
            }
        });
    }

    /**
     * Indicate that the shift is 24/7 with all weekdays.
     */
    public function fullWeek(): static
    {
        return $this->afterCreating(function (Shift $shift) {
            // Add weekend schedules
            $weekends = ['Saturday', 'Sunday'];
            
            foreach ($weekends as $weekend) {
                $schedule = ShiftSchedule::factory()->create([
                    'shift_id' => $shift->id,
                    'weekday' => $weekend,
                ]);
                
                ShiftTime::factory()->create([
                    'shift_schedule_id' => $schedule->id,
                ]);
            }
        });
    }

    /**
     * Indicate that the shift uses Brazil timezone.
     */
    public function brazil(): static
    {
        return $this->state(fn (array $attributes) => [
            'timezone' => 'America/Sao_Paulo',
        ]);
    }
} 