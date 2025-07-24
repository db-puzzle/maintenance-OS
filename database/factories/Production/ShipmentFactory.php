<?php

namespace Database\Factories\Production;

use App\Models\Production\Shipment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        $shipDate = $this->faker->dateTimeBetween('-30 days', '+30 days');
        $deliveryDate = (clone $shipDate)->modify('+' . $this->faker->numberBetween(1, 7) . ' days');
        
        // Determine manifest generation date based on ship date
        $manifestDate = null;
        if ($this->faker->boolean(50)) {
            // If ship date is in the past, manifest can be generated between ship date and now
            if ($shipDate <= now()) {
                $manifestDate = $this->faker->dateTimeBetween($shipDate, 'now');
            } else {
                // If ship date is in the future, manifest is not yet generated
                $manifestDate = null;
            }
        }
        
        return [
            'shipment_number' => 'SH-' . date('Ym') . '-' . str_pad($this->faker->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
            'shipment_type' => $this->faker->randomElement(['customer', 'internal_transfer', 'vendor_return']),
            'destination_type' => $this->faker->randomElement(['customer', 'warehouse', 'vendor']),
            'destination_reference' => $this->faker->optional()->bothify('REF-####'),
            'destination_details' => $this->faker->boolean(70) ? json_encode([
                'name' => $this->faker->company,
                'address' => $this->faker->streetAddress,
                'city' => $this->faker->city,
                'state' => $this->faker->stateAbbr,
                'postal_code' => $this->faker->postcode,
                'country' => $this->faker->countryCode,
                'contact' => $this->faker->name,
                'phone' => $this->faker->phoneNumber,
                'email' => $this->faker->email,
            ]) : null,
            'status' => $this->faker->randomElement(['draft', 'ready', 'in_transit', 'delivered']),
            'scheduled_ship_date' => $shipDate->format('Y-m-d'),
            'actual_ship_date' => $this->faker->boolean(60) ? $shipDate : null,
            'estimated_delivery_date' => $deliveryDate->format('Y-m-d'),
            'actual_delivery_date' => $this->faker->boolean(40) ? $deliveryDate : null,
            'manifest_generated_at' => $manifestDate,
            'manifest_path' => $manifestDate ? 'manifests/' . $this->faker->uuid . '.pdf' : null,
            'carrier' => $this->faker->optional()->randomElement(['UPS', 'FedEx', 'USPS', 'DHL']),
            'tracking_number' => $this->faker->optional()->bothify('##########????'),
            'freight_cost' => $this->faker->optional()->randomFloat(2, 10, 500),
            'created_by' => User::factory(),
        ];
    }

    /**
     * Indicate the shipment is ready to ship.
     */
    public function ready(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ready',
            'actual_ship_date' => null,
            'actual_delivery_date' => null,
        ]);
    }

    /**
     * Indicate the shipment is in transit.
     */
    public function inTransit(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_transit',
            'actual_ship_date' => now(),
            'actual_delivery_date' => null,
            'carrier' => $this->faker->randomElement(['UPS', 'FedEx', 'USPS', 'DHL']),
            'tracking_number' => $this->faker->bothify('##########????'),
        ]);
    }

    /**
     * Indicate the shipment has been delivered.
     */
    public function delivered(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'delivered',
            'actual_ship_date' => now()->subDays(3),
            'actual_delivery_date' => now(),
            'carrier' => $this->faker->randomElement(['UPS', 'FedEx', 'USPS', 'DHL']),
            'tracking_number' => $this->faker->bothify('##########????'),
        ]);
    }

    /**
     * Configure the factory to create a customer shipment.
     */
    public function customer(): static
    {
        return $this->state(fn (array $attributes) => [
            'shipment_type' => 'customer',
            'destination_type' => 'customer',
        ]);
    }

    /**
     * Configure the factory to create an internal transfer.
     */
    public function internalTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'shipment_type' => 'internal_transfer',
            'destination_type' => 'warehouse',
        ]);
    }

    /**
     * Add shipment items after creating the shipment.
     */
    public function withItems(int $count = 3): static
    {
        return $this->afterCreating(function (Shipment $shipment) use ($count) {
            for ($i = 0; $i < $count; $i++) {
                \App\Models\Production\ShipmentItem::factory()
                    ->for($shipment)
                    ->create();
            }
        });
    }
    
    /**
     * Add package photos after creating the shipment.
     */
    public function packagePhoto(): static
    {
        return $this->afterCreating(function (Shipment $shipment) {
            \App\Models\Production\ShipmentPhoto::factory()
                ->packagePhoto()
                ->for($shipment)
                ->create();
        });
    }
    
    /**
     * Add loading photos after creating the shipment.
     */
    public function loadingPhoto(): static
    {
        return $this->afterCreating(function (Shipment $shipment) {
            \App\Models\Production\ShipmentPhoto::factory()
                ->loadingPhoto()
                ->for($shipment)
                ->create();
        });
    }
} 