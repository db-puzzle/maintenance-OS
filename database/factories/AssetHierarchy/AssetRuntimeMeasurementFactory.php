<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetRuntimeMeasurement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\AssetRuntimeMeasurement>
 */
class AssetRuntimeMeasurementFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = AssetRuntimeMeasurement::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'asset_id' => Asset::factory(),
            'user_id' => User::factory(),
            'reported_hours' => $this->faker->randomFloat(2, 0, 10000),
            'source' => 'manual',
            'notes' => $this->faker->optional()->sentence(),
            'measurement_datetime' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }

    /**
     * Indicate that the measurement is for a specific asset.
     */
    public function forAsset(Asset $asset): static
    {
        return $this->state(fn (array $attributes) => [
            'asset_id' => $asset->id,
        ]);
    }

    /**
     * Indicate that the measurement was reported by a specific user.
     */
    public function byUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }

    /**
     * Indicate that the measurement is from a shift change.
     */
    public function fromShiftChange(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'shift_change',
            'notes' => 'Automatic measurement from shift change',
        ]);
    }

    /**
     * Indicate that the measurement is from a shift update.
     */
    public function fromShiftUpdate(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'shift_update',
            'notes' => 'Automatic measurement from shift schedule update',
        ]);
    }

    /**
     * Indicate that the measurement is from IoT.
     */
    public function fromIoT(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'iot',
            'notes' => 'Automatic measurement from IoT device',
        ]);
    }

    /**
     * Indicate that the measurement is from API.
     */
    public function fromAPI(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'api',
            'notes' => 'Measurement received via API integration',
        ]);
    }

    /**
     * Create a sequence of measurements with increasing hours.
     */
    public function measurementSequence(Asset $asset, User $user, int $count = 5): static
    {
        return $this->count($count)->state(new \Illuminate\Database\Eloquent\Factories\Sequence(
            ...array_map(function ($i) use ($asset, $user) {
                return [
                    'asset_id' => $asset->id,
                    'user_id' => $user->id,
                    'reported_hours' => $i * 100,
                    'measurement_datetime' => now()->subDays($count - $i),
                ];
            }, range(1, $count))
        ));
    }
} 