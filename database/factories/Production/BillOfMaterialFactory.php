<?php

namespace Database\Factories\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\BillOfMaterial>
 */
class BillOfMaterialFactory extends Factory
{
    protected $model = BillOfMaterial::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $year = now()->format('Y');
        $sequence = fake()->numberBetween(1, 9999);
        
        return [
            'bom_number' => sprintf('BOM-%s-%04d', $year, $sequence),
            'name' => fake()->words(fake()->numberBetween(2, 4), true),
            'description' => fake()->optional(0.7)->sentence(),
            'external_reference' => fake()->optional(0.3)->regexify('[A-Z]{3}-[0-9]{4}'),
            'is_active' => fake()->boolean(90),
            'created_by' => User::factory(),
        ];
    }

    /**
     * Indicate that the BOM is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Configure the model factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (BillOfMaterial $bom) {
            // Create an initial version for the BOM
            $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Initial version',
                'published_at' => now(),
                'published_by' => $bom->created_by,
                'is_current' => true,
            ]);
        });
    }
} 