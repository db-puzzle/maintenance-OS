<?php

namespace Database\Factories\Production;

use App\Models\Production\ShipmentItem;
use App\Models\Production\Shipment;
use App\Models\Production\BomItem;
use App\Models\Production\ProductionOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShipmentItemFactory extends Factory
{
    protected $model = ShipmentItem::class;

    public function definition(): array
    {
        $bomItem = BomItem::factory()->create();
        
        return [
            'shipment_id' => Shipment::factory(),
            'bom_item_id' => $bomItem->id,
            'production_order_id' => ProductionOrder::factory(),
            'item_number' => $bomItem->item_number ?? $this->faker->bothify('ITEM-#####'),
            'description' => $bomItem->description ?? $this->faker->sentence(),
            'quantity' => $this->faker->randomFloat(2, 1, 100),
            'unit_of_measure' => $this->faker->randomElement(['EA', 'PC', 'SET', 'BOX', 'CASE']),
            'package_number' => $this->faker->optional()->bothify('PKG-#####'),
            'package_type' => $this->faker->optional()->randomElement(['Box', 'Pallet', 'Crate', 'Envelope']),
            'weight' => $this->faker->optional()->randomFloat(2, 0.1, 100),
            'dimensions' => $this->faker->boolean(30) ? json_encode([
                'length' => $this->faker->numberBetween(10, 100),
                'width' => $this->faker->numberBetween(10, 100),
                'height' => $this->faker->numberBetween(10, 50),
                'unit' => 'cm',
            ]) : null,
            'qr_codes' => null, // Will be set based on states
        ];
    }

    /**
     * Indicate that the item has QR codes.
     */
    public function withQrCodes(int $count = null): static
    {
        return $this->state(function (array $attributes) use ($count) {
            $quantity = $attributes['quantity'] ?? 1;
            $qrCount = $count ?? min((int)$quantity, 10);
            
            $qrCodes = [];
            for ($i = 0; $i < $qrCount; $i++) {
                $qrCodes[] = 'QR-' . $this->faker->unique()->bothify('########');
            }
            
            return [
                'qr_codes' => json_encode($qrCodes),
            ];
        });
    }

    /**
     * Indicate that the item is in a box package.
     */
    public function inBox(): static
    {
        return $this->state(fn (array $attributes) => [
            'package_number' => 'BOX-' . $this->faker->bothify('#####'),
            'package_type' => 'Box',
            'weight' => $this->faker->randomFloat(2, 0.5, 20),
            'dimensions' => json_encode([
                'length' => $this->faker->numberBetween(20, 60),
                'width' => $this->faker->numberBetween(20, 40),
                'height' => $this->faker->numberBetween(10, 30),
                'unit' => 'cm',
            ]),
        ]);
    }

    /**
     * Indicate that the item is on a pallet.
     */
    public function onPallet(): static
    {
        return $this->state(fn (array $attributes) => [
            'package_number' => 'PLT-' . $this->faker->bothify('#####'),
            'package_type' => 'Pallet',
            'weight' => $this->faker->randomFloat(2, 50, 500),
            'dimensions' => json_encode([
                'length' => 120,
                'width' => 100,
                'height' => $this->faker->numberBetween(100, 200),
                'unit' => 'cm',
            ]),
        ]);
    }

    /**
     * Indicate that the item is bulk (no individual packaging).
     */
    public function bulk(): static
    {
        return $this->state(fn (array $attributes) => [
            'package_number' => null,
            'package_type' => null,
            'weight' => null,
            'dimensions' => null,
        ]);
    }
} 