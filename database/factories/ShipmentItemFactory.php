<?php

namespace Database\Factories;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ShipmentItem>
 */
class ShipmentItemFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = ShipmentItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shipment_id' => Shipment::factory(),
            'manufacturing_order_id' => ManufacturingOrder::factory(),
            'manufacturing_step_id' => ManufacturingStep::factory(),
            'quantity_shipped' => $this->faker->numberBetween(1, 100),
            'quantity_received' => 0,
            'quantity_rejected' => 0,
            'package_count' => $this->faker->optional()->numberBetween(1, 10),
            'package_type' => $this->faker->optional()->randomElement(['box', 'pallet', 'crate', 'bag']),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * Indicate that the item has been fully received.
     */
    public function received(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'quantity_received' => $attributes['quantity_shipped'],
            ];
        });
    }

    /**
     * Indicate that the item has been partially received.
     */
    public function partiallyReceived(): static
    {
        return $this->state(function (array $attributes) {
            $shipped = $attributes['quantity_shipped'];

            return [
                'quantity_received' => $shipped * 0.5, // 50% received
            ];
        });
    }
}
