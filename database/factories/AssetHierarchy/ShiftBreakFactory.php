<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\ShiftBreak;
use App\Models\AssetHierarchy\ShiftTime;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\ShiftBreak>
 */
class ShiftBreakFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ShiftBreak::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shift_time_id' => ShiftTime::factory(),
            'start_time' => '12:00:00',
            'end_time' => '13:00:00',
        ];
    }

    /**
     * Indicate that this is a lunch break.
     */
    public function lunch(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '12:00:00',
            'end_time' => '13:00:00',
        ]);
    }

    /**
     * Indicate that this is a coffee break.
     */
    public function coffee(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '10:00:00',
            'end_time' => '10:15:00',
        ]);
    }

    /**
     * Indicate that this is an afternoon break.
     */
    public function afternoon(): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => '15:00:00',
            'end_time' => '15:15:00',
        ]);
    }
} 