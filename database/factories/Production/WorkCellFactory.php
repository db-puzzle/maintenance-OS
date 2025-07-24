<?php

namespace Database\Factories\Production;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\Production\WorkCell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\WorkCell>
 */
class WorkCellFactory extends Factory
{
    protected $model = WorkCell::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $cellTypes = ['internal', 'external'];
        $departments = ['Machining', 'Assembly', 'Welding', 'Painting', 'Quality', 'Packaging'];
        
        // Generate work cell code
        $dept = fake()->randomElement(['MCH', 'ASM', 'WLD', 'PNT', 'QC', 'PKG']);
        $number = fake()->numberBetween(1, 99);
        $code = sprintf('%s-%02d', $dept, $number);
        
        $cellType = fake()->randomElement($cellTypes);

        return [
            'code' => $code,
            'name' => fake()->randomElement($departments) . ' Cell ' . $number,
            'description' => fake()->optional(0.7)->sentence(),
            'cell_type' => $cellType,
            'available_hours_per_day' => fake()->randomFloat(2, 4, 24),
            'efficiency_percentage' => fake()->randomFloat(2, 60, 95),
            'plant_id' => null, // Will be set if Plant exists
            'area_id' => null, // Will be set if Area exists
            'vendor_name' => $cellType === 'external' ? fake()->company() : null,
            'vendor_contact' => $cellType === 'external' ? json_encode([
                'name' => fake()->name(),
                'email' => fake()->companyEmail(),
                'phone' => fake()->phoneNumber(),
                'address' => fake()->address(),
            ]) : null,
            'lead_time_days' => $cellType === 'external' ? fake()->numberBetween(1, 30) : 0,
            'is_active' => fake()->boolean(90),
        ];
    }

    /**
     * Indicate that the work cell is external.
     */
    public function external(): static
    {
        return $this->state(fn (array $attributes) => [
            'cell_type' => 'external',
            'code' => 'EXT-' . fake()->numberBetween(1, 99),
            'vendor_name' => fake()->company(),
            'vendor_contact' => json_encode([
                'name' => fake()->name(),
                'email' => fake()->companyEmail(),
                'phone' => fake()->phoneNumber(),
                'address' => fake()->address(),
            ]),
            'lead_time_days' => fake()->numberBetween(1, 30),
        ]);
    }

    /**
     * Indicate that the work cell is internal.
     */
    public function internal(): static
    {
        return $this->state(fn (array $attributes) => [
            'cell_type' => 'internal',
            'vendor_name' => null,
            'vendor_contact' => null,
            'lead_time_days' => 0,
        ]);
    }

    /**
     * Indicate that the work cell is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Assign to a plant.
     */
    public function forPlant(Plant $plant): static
    {
        return $this->state(fn (array $attributes) => [
            'plant_id' => $plant->id,
        ]);
    }

    /**
     * Assign to an area.
     */
    public function forArea(Area $area): static
    {
        return $this->state(fn (array $attributes) => [
            'area_id' => $area->id,
            'plant_id' => $area->plant_id,
        ]);
    }
} 