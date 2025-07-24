<?php

namespace Database\Factories\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\BomVersion>
 */
class BomVersionFactory extends Factory
{
    protected $model = BomVersion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bill_of_material_id' => BillOfMaterial::factory(),
            'version_number' => 1,
            'revision_notes' => fake()->sentence(),
            'published_at' => fake()->optional(0.8)->dateTimeBetween('-1 year', 'now'),
            'published_by' => function (array $attributes) {
                return $attributes['published_at'] ? User::factory() : null;
            },
            'is_current' => false,
        ];
    }

    /**
     * Indicate that the version is the current version.
     */
    public function current(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_current' => true,
            'published_at' => $attributes['published_at'] ?? now(),
            'published_by' => $attributes['published_by'] ?? User::factory(),
        ]);
    }

    /**
     * Indicate that the version is a draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'published_at' => null,
            'published_by' => null,
            'is_current' => false,
        ]);
    }
} 