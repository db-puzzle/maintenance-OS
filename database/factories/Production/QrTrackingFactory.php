<?php

namespace Database\Factories\Production;

use App\Models\Production\QrTracking;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\QrTracking>
 */
class QrTrackingFactory extends Factory
{
    protected $model = QrTracking::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $eventTypes = [
            'scan', 'print', 'query', 'start_production', 'complete_production',
            'quality_check', 'move_location', 'pack', 'ship', 'receive'
        ];
        
        $trackableTypes = [
            'App\Models\Production\BomItem',
            'App\Models\Production\ProductionOrder',
            'App\Models\Production\ProductionSchedule',
            'App\Models\Production\Shipment',
        ];

        $locations = [
            'Warehouse A', 'Warehouse B', 'Production Floor',
            'Quality Lab', 'Shipping Dock', 'Receiving Bay',
            'Assembly Line 1', 'Assembly Line 2', 'Packaging Station'
        ];

        return [
            'qr_code' => fake()->regexify('QR-[A-Z0-9]{8}-[A-Z0-9]{4}'),
            'event_type' => fake()->randomElement($eventTypes),
            'trackable_type' => fake()->randomElement($trackableTypes),
            'trackable_id' => fake()->numberBetween(1, 100),
            'user_id' => User::factory(),
            'location' => fake()->randomElement($locations),
            'gps_coordinates' => fake()->boolean(30) ? json_encode([
                'latitude' => fake()->latitude(),
                'longitude' => fake()->longitude(),
            ]) : null,
            'device_info' => json_encode([
                'device_type' => fake()->randomElement(['scanner', 'mobile', 'tablet']),
                'device_id' => fake()->uuid(),
                'app_version' => fake()->semver(),
                'os' => fake()->randomElement(['iOS 16.0', 'Android 13', 'Windows 11']),
            ]),
            'additional_data' => fake()->boolean(40) ? json_encode([
                'temperature' => fake()->numberBetween(-10, 40) . '°C',
                'humidity' => fake()->numberBetween(20, 80) . '%',
                'notes' => fake()->sentence(),
            ]) : null,
            'created_at' => fake()->dateTimeBetween('-1 month', 'now'),
        ];
    }

    /**
     * Indicate that the event is a scan.
     */
    public function scan(): static
    {
        return $this->state(fn (array $attributes) => [
            'event_type' => 'scan',
        ]);
    }

    /**
     * Indicate that the event is a production start.
     */
    public function startProduction(): static
    {
        return $this->state(fn (array $attributes) => [
            'event_type' => 'start_production',
            'location' => fake()->randomElement(['Production Floor', 'Assembly Line 1', 'Assembly Line 2']),
        ]);
    }

    /**
     * Indicate that the event is a production completion.
     */
    public function completeProduction(): static
    {
        return $this->state(fn (array $attributes) => [
            'event_type' => 'complete_production',
            'location' => fake()->randomElement(['Production Floor', 'Assembly Line 1', 'Assembly Line 2']),
            'additional_data' => json_encode([
                'quantity_produced' => fake()->numberBetween(1, 100),
                'quality_status' => fake()->randomElement(['pass', 'fail', 'rework']),
            ]),
        ]);
    }

    /**
     * Indicate that the event is a shipment scan.
     */
    public function shipment(): static
    {
        return $this->state(fn (array $attributes) => [
            'event_type' => 'ship',
            'trackable_type' => 'App\Models\Production\Shipment',
            'location' => 'Shipping Dock',
            'additional_data' => json_encode([
                'carrier' => fake()->randomElement(['FedEx', 'UPS', 'DHL', 'USPS']),
                'tracking_number' => fake()->regexify('[A-Z0-9]{12}'),
            ]),
        ]);
    }

    /**
     * Set specific GPS coordinates.
     */
    public function atLocation(float $latitude, float $longitude): static
    {
        return $this->state(fn (array $attributes) => [
            'gps_coordinates' => json_encode([
                'latitude' => $latitude,
                'longitude' => $longitude,
            ]),
        ]);
    }
} 