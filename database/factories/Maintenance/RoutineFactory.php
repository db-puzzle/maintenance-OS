<?php

namespace Database\Factories\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
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
        $intervals = [24, 48, 72, 168, 336, 720, 2160, 4320, 8760]; // hours: daily, 2 days, 3 days, weekly, biweekly, monthly, quarterly, semi-annual, annual
        
        return [
            'asset_id' => Asset::factory(),
            'name' => $this->faker->randomElement($routineTypes) . ' - ' . $this->faker->words(2, true),
            'trigger_hours' => $this->faker->randomElement($intervals),
            'status' => 'Active',
            'description' => $this->faker->paragraph(),
            'form_id' => null, // Will be created automatically in the model's creating event
            'active_form_version_id' => null,
        ];
    }

    /**
     * Indicate that the routine is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'Inactive',
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
     * Indicate that the routine has a published form version.
     */
    public function withPublishedForm(): static
    {
        return $this->afterCreating(function (Routine $routine) {
            if ($routine->form) {
                $version = FormVersion::factory()
                    ->published()
                    ->create([
                        'form_id' => $routine->form->id,
                    ]);
                
                $routine->update([
                    'active_form_version_id' => $version->id,
                ]);
            }
        });
    }

    /**
     * Indicate that the routine is for daily maintenance.
     */
    public function daily(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Daily Inspection',
            'trigger_hours' => 24,
            'description' => 'Daily visual inspection and basic checks',
        ]);
    }

    /**
     * Indicate that the routine is for weekly maintenance.
     */
    public function weekly(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Weekly Maintenance',
            'trigger_hours' => 168,
            'description' => 'Weekly preventive maintenance and lubrication',
        ]);
    }

    /**
     * Indicate that the routine is for monthly maintenance.
     */
    public function monthly(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Monthly Maintenance',
            'trigger_hours' => 720,
            'description' => 'Monthly comprehensive maintenance and testing',
        ]);
    }
} 