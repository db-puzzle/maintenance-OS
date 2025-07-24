<?php

namespace Database\Factories\Production;

use App\Models\Production\Shipment;
use App\Models\Production\ShipmentPhoto;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ShipmentPhoto>
 */
class ShipmentPhotoFactory extends Factory
{
    protected $model = ShipmentPhoto::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $types = ['package', 'label', 'damage', 'contents', 'loading', 'signature'];
        
        return [
            'shipment_id' => Shipment::factory(),
            'file_path' => fake()->filePath() . '.jpg',
            'file_name' => fake()->word() . '_' . fake()->randomNumber(5) . '.jpg',
            'file_size' => fake()->numberBetween(100000, 5000000), // 100KB to 5MB
            'mime_type' => fake()->randomElement(['image/jpeg', 'image/png', 'image/webp']),
            'photo_type' => fake()->randomElement($types),
            'description' => fake()->optional(0.6)->sentence(),
            'gps_coordinates' => fake()->optional(0.4)->randomElement([[
                'latitude' => fake()->latitude(),
                'longitude' => fake()->longitude(),
                'accuracy' => fake()->randomFloat(2, 1, 20),
            ]),
            'metadata' => fake()->optional(0.3)->randomElement([[
                'device' => fake()->randomElement(['iPhone 14', 'Samsung S23', 'Pixel 7']),
                'timestamp' => fake()->dateTimeBetween('-1 week', 'now')->format('Y-m-d H:i:s'),
                'orientation' => fake()->randomElement(['portrait', 'landscape']),
            ]),
            'uploaded_by' => User::factory(),
        ];
    }

    /**
     * Indicate that the photo is a package photo.
     */
    public function packagePhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_type' => 'package',
            'description' => 'Package photo - ' . fake()->words(3, true),
        ]);
    }

    /**
     * Indicate that the photo is a shipping label.
     */
    public function labelPhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_type' => 'label',
            'description' => 'Shipping label',
        ]);
    }

    /**
     * Indicate that the photo documents damage.
     */
    public function damagePhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_type' => 'damage',
            'description' => 'Damage documentation: ' . fake()->sentence(),
        ]);
    }

    /**
     * Indicate that the photo shows package contents.
     */
    public function contentsPhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_type' => 'contents',
            'description' => 'Package contents verification',
        ]);
    }

    /**
     * Indicate that the photo is a proof of delivery signature.
     */
    public function signaturePhoto(): static
    {
        return $this->state(fn (array $attributes) => [
            'photo_type' => 'signature',
            'description' => 'Delivery signature from ' . fake()->name(),
        ]);
    }

    /**
     * Add specific GPS coordinates.
     */
    public function atLocation(float $latitude, float $longitude): static
    {
        return $this->state(fn (array $attributes) => [
            'gps_coordinates' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy' => fake()->randomFloat(2, 1, 10),
            ],
        ]);
    }
} 