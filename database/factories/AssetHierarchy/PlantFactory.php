<?php

namespace Database\Factories\AssetHierarchy;

use App\Models\AssetHierarchy\Plant;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlantFactory extends Factory
{
    protected $model = Plant::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'street' => $this->faker->streetName(),
            'number' => $this->faker->buildingNumber(),
            'city' => $this->faker->city(),
            'state' => $this->faker->stateAbbr(),
            'zip_code' => $this->faker->numerify('#####-###'),
            'gps_coordinates' => $this->faker->latitude() . ',' . $this->faker->longitude(),
        ];
    }
} 