<?php

namespace Database\Factories\Production;

use App\Models\Production\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        $canBeSold = $this->faker->boolean(70);
        $canBePurchased = $this->faker->boolean(60);
        $canBeManufactured = $this->faker->boolean(50);
        $isPhantom = false; // Phantom items are special cases, not random

        return [
            'item_number' => strtoupper($this->faker->unique()->bothify('ITEM-####-??')),
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'item_category_id' => null, // Will be set in seeder
            // 'item_type' => $this->faker->randomElement(['manufactured', 'purchased', 'phantom', 'service']), // DEPRECATED
            'can_be_sold' => $canBeSold,
            'can_be_purchased' => $canBePurchased,
            'can_be_manufactured' => $canBeManufactured,
            'is_phantom' => $isPhantom,
            'is_active' => $this->faker->boolean(90),
            'status' => $this->faker->randomElement(['active', 'inactive', 'prototype', 'discontinued']),
            'unit_of_measure' => $this->faker->randomElement(['EA', 'KG', 'L', 'M', 'BOX', 'SET']),
            'weight' => $this->faker->optional()->randomFloat(2, 0.01, 100),
            'dimensions' => $this->faker->optional()->passthrough([
                'length' => $this->faker->numberBetween(1, 200),
                'width' => $this->faker->numberBetween(1, 200),
                'height' => $this->faker->numberBetween(1, 200),
                'unit' => 'cm'
            ]),
            'list_price' => $canBeSold ? $this->faker->randomFloat(2, 10, 1000) : null,
            'manufacturing_cost' => $canBeManufactured ? $this->faker->randomFloat(2, 5, 500) : null,
            'manufacturing_lead_time_days' => $canBeManufactured ? $this->faker->numberBetween(0, 30) : 0,
            'purchase_price' => $canBePurchased ? $this->faker->randomFloat(2, 5, 500) : null,
            'purchase_lead_time_days' => $canBePurchased ? $this->faker->numberBetween(0, 30) : 0,
            'track_inventory' => $this->faker->boolean(80),
            'min_stock_level' => $this->faker->optional()->numberBetween(0, 100),
            'max_stock_level' => $this->faker->optional()->numberBetween(100, 1000),
            'reorder_point' => $this->faker->optional()->numberBetween(10, 200),
            'preferred_vendor' => $canBePurchased ? $this->faker->optional()->company() : null,
            'vendor_item_number' => $canBePurchased ? $this->faker->optional()->bothify('VEN-####') : null,
            'tags' => $this->faker->optional()->words(3),
            'created_by' => null, // Will be set in seeder
        ];
    }

    public function sellable(): static
    {
        return $this->state(fn (array $attributes) => [
            'can_be_sold' => true,
            'list_price' => $this->faker->randomFloat(2, 10, 1000),
        ]);
    }

    public function manufacturable(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'manufactured',
            'can_be_manufactured' => true,
            'can_be_purchased' => false,
        ]);
    }

    public function purchasable(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'preferred_vendor' => $this->faker->company(),
            'vendor_item_number' => strtoupper($this->faker->bothify('VND-###-??')),
        ]);
    }

    public function service(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'service',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => false,
            'track_inventory' => false,
            'weight' => null,
            'dimensions' => null,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'status' => 'discontinued',
        ]);
    }

    public function phantom(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_phantom' => true,
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => false,
            'list_price' => null,
            'manufacturing_cost' => null,
            'purchase_price' => null,
            'preferred_vendor' => null,
            'vendor_item_number' => null,
            'track_inventory' => false,
        ]);
    }
} 