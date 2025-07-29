<?php

namespace Database\Factories\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
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
        $year = now()->format('y'); // 2-digit year
        $month = now()->format('m'); // 2-digit month
        $sequence = fake()->numberBetween(1, 99999);
        
        return [
            'bom_number' => sprintf('BOM-%05d-%s%s', $sequence, $year, $month),
            'name' => fake()->words(fake()->numberBetween(2, 4), true),
            'description' => fake()->optional(0.7)->sentence(),
            'external_reference' => fake()->optional(0.3)->regexify('[A-Z]{3}-[0-9]{4}'),
            'output_item_id' => Item::factory()->state(['can_be_manufactured' => true]),
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
            $version = $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Initial version',
                'published_at' => now(),
                'published_by' => $bom->created_by,
                'is_current' => true,
            ]);

            // Create root BOM item for the output
            $version->items()->create([
                'item_id' => $bom->output_item_id,
                'parent_item_id' => null,
                'quantity' => 1,
                'unit_of_measure' => $bom->outputItem->unit_of_measure,
                'level' => 0,
                'sequence_number' => 0,
            ]);
        });
    }
} 