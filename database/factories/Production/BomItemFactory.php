<?php

namespace Database\Factories\Production;

use App\Models\Production\BomItem;
use App\Models\Production\BomVersion;
use App\Models\Production\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\BomItem>
 */
class BomItemFactory extends Factory
{
    protected $model = BomItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bom_version_id' => BomVersion::factory(),
            'parent_item_id' => null,
            'item_id' => Item::factory(), // Reference to items table
            'quantity' => fake()->randomFloat(4, 0.0001, 100),
            'unit_of_measure' => 'EA',
            'level' => 0,
            'sequence_number' => 1,
            'reference_designators' => fake()->optional(0.3)->words(3, true),
            'thumbnail_path' => fake()->optional(0.2)->imageUrl(200, 200, 'technics'),
            'model_file_path' => fake()->optional(0.1)->filePath(),
            'bom_notes' => fake()->boolean(30) ? json_encode([
                'assembly_tip' => fake()->sentence(),
                'warning' => fake()->optional(0.3)->sentence(),
            ]) : null,
            'assembly_instructions' => fake()->boolean(20) ? json_encode([
                'step1' => fake()->sentence(),
                'step2' => fake()->sentence(),
            ]) : null,
            'qr_code' => null, // Will be generated when needed
            'qr_generated_at' => null,
        ];
    }

    /**
     * Indicate that the BOM item references a part (leaf node).
     */
    public function part(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_id' => Item::factory()->purchasable(),
        ]);
    }

    /**
     * Indicate that the BOM item references an assembly.
     */
    public function assembly(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_id' => Item::factory()->manufacturable(),
        ]);
    }

    /**
     * Indicate that the item is a subassembly.
     */
    public function subassembly(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'subassembly',
            'item_number' => 'SA-' . fake()->numberBetween(10000, 99999),
        ]);
    }

    /**
     * Set the parent item (for hierarchical structures).
     */
    public function withParent(BomItem $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_item_id' => $parent->id,
            'level' => $parent->level + 1,
            'bom_version_id' => $parent->bom_version_id,
        ]);
    }

    /**
     * Set a specific level in the hierarchy.
     */
    public function atLevel(int $level): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => $level,
        ]);
    }

    /**
     * Set a specific sequence number.
     */
    public function withSequence(int $sequence): static
    {
        return $this->state(fn (array $attributes) => [
            'sequence_number' => $sequence,
        ]);
    }

    /**
     * Generate a QR code for this item.
     */
    public function withQrCode(): static
    {
        return $this->state(fn (array $attributes) => [
            'qr_code' => 'QR-' . strtoupper(fake()->unique()->bothify('????####')),
            'qr_generated_at' => now(),
        ]);
    }
} 