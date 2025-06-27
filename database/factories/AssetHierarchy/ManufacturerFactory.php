<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Manufacturer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AssetHierarchy\Manufacturer>
 */
class ManufacturerFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Manufacturer::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->company() . ' ' . $this->faker->companySuffix(),
            'website' => $this->faker->optional()->url(),
            'email' => $this->faker->optional()->companyEmail(),
            'phone' => $this->faker->optional()->phoneNumber(),
            'country' => $this->faker->country(),
            'notes' => $this->faker->optional()->paragraph(),
        ];
    }

    /**
     * Indicate that the manufacturer is a well-known company.
     */
    public function wellKnown(): static
    {
        $companies = ['Siemens', 'ABB', 'Schneider Electric', 'General Electric', 'Emerson', 'Honeywell'];
        
        return $this->state(fn (array $attributes) => [
            'name' => $this->faker->randomElement($companies),
            'website' => 'https://www.' . strtolower(str_replace(' ', '', $attributes['name'] ?? $this->faker->randomElement($companies))) . '.com',
            'country' => $this->faker->randomElement(['Germany', 'Switzerland', 'France', 'USA']),
        ]);
    }
} 