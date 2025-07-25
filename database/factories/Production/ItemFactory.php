<?php

namespace Database\Factories\Production;

use App\Models\Production\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        $itemType = $this->faker->randomElement(['manufactured', 'purchased', 'phantom', 'service']);
        
        return [
            'item_number' => strtoupper($this->faker->unique()->bothify('??-###-??')),
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(['Electronics', 'Mechanical', 'Assembly', 'Raw Material']),
            'item_type' => $itemType,
            'can_be_sold' => $itemType !== 'phantom',
            'can_be_purchased' => in_array($itemType, ['purchased', 'service']),
            'can_be_manufactured' => in_array($itemType, ['manufactured', 'phantom']),
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => $this->faker->randomElement(['EA', 'KG', 'M', 'L', 'BOX']),
            'weight' => $this->faker->randomFloat(4, 0.1, 100),
            'dimensions' => [
                'length' => $this->faker->numberBetween(1, 100),
                'width' => $this->faker->numberBetween(1, 100),
                'height' => $this->faker->numberBetween(1, 100),
                'unit' => 'cm'
            ],
            'list_price' => $this->faker->randomFloat(2, 10, 1000),
            'cost' => $this->faker->randomFloat(2, 5, 500),
            'lead_time_days' => $this->faker->numberBetween(0, 30),
            'track_inventory' => true,
            'min_stock_level' => $this->faker->randomFloat(2, 0, 50),
            'max_stock_level' => $this->faker->randomFloat(2, 100, 500),
            'reorder_point' => $this->faker->randomFloat(2, 10, 100),
            'tags' => $this->faker->randomElement([
                ['bicycle', 'component'],
                ['raw-material'],
                ['assembly'],
                []
            ]),
            'custom_attributes' => [],
            'created_by' => 1, // Will be overridden in seeder
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
} 