<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\ShiftSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\ShiftSchedule>
 */
class ShiftScheduleFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ShiftSchedule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        return [
            'shift_id' => Shift::factory(),
            'weekday' => $this->faker->randomElement($weekdays),
        ];
    }

    /**
     * Indicate that the schedule is for a specific weekday.
     */
    public function weekday(string $weekday): static
    {
        return $this->state(fn (array $attributes) => [
            'weekday' => $weekday,
        ]);
    }
} 