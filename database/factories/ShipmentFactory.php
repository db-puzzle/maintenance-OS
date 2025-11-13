<?php

namespace Database\Factories;

use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\Shipment>
 */
class ShipmentFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Shipment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'destination_type' => 'manufacturer',
            'destination_id' => Manufacturer::factory(),
            'destination_name' => $this->faker->company(),
            'destination_address' => $this->faker->address(),
            'shipping_method' => $this->faker->randomElement(['courier', 'freight', 'pickup', 'internal']),
            'carrier_name' => $this->faker->randomElement(['UPS', 'FedEx', 'DHL', 'USPS']),
            'tracking_number' => $this->faker->optional()->numerify('TRACK################'),
            'planned_ship_date' => $this->faker->dateTimeBetween('now', '+7 days'),
            'expected_delivery_date' => $this->faker->dateTimeBetween('+3 days', '+14 days'),
            'status' => 'planned',
            'packing_list_generated' => false,
            'shipping_notes' => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * Indicate that the shipment has been shipped.
     */
    public function shipped(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'shipped',
            'actual_ship_date' => now(),
        ]);
    }

    /**
     * Indicate that the shipment has been received.
     */
    public function received(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'received',
            'actual_ship_date' => now()->subDays(5),
            'actual_delivery_date' => now(),
        ]);
    }
}
