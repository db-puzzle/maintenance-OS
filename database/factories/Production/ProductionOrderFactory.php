<?php

namespace Database\Factories\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Production\ProductionOrder>
 */
class ProductionOrderFactory extends Factory
{
    protected $model = ProductionOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = ['draft', 'planned', 'released', 'in_progress', 'completed', 'cancelled'];
        $sourceTypes = ['manual', 'sales_order', 'forecast'];
        
        $status = fake()->randomElement($statuses);
        $requestedDate = fake()->dateTimeBetween('now', '+3 months');
        
        // Generate a unique order number
        $year = now()->format('Y');
        $unique = fake()->unique()->numberBetween(1, 99999);
        $orderNumber = sprintf('PO-%s-%05d', $year, $unique);
        
        return [
            'order_number' => $orderNumber,
            'item_id' => Item::factory()->manufacturable(),
            'bill_of_material_id' => function (array $attributes) {
                // Create a BOM and assign it to the item
                $bom = BillOfMaterial::factory()->create();
                Item::find($attributes['item_id'])->update(['current_bom_id' => $bom->id]);
                return $bom->id;
            },
            'quantity' => fake()->numberBetween(1, 1000),
            'unit_of_measure' => fake()->randomElement(['EA', 'PC', 'SET', 'BOX']),
            'status' => $status,
            'priority' => fake()->numberBetween(0, 100),
            'requested_date' => $requestedDate,
            'planned_start_date' => $status !== 'draft' ? fake()->dateTimeBetween('now', $requestedDate) : null,
            'planned_end_date' => function (array $attributes) {
                return $attributes['planned_start_date'] 
                    ? fake()->dateTimeBetween($attributes['planned_start_date'], $attributes['requested_date'])
                    : null;
            },
            'actual_start_date' => in_array($status, ['in_progress', 'completed']) 
                ? fake()->dateTimeBetween('-1 week', 'now') 
                : null,
            'actual_end_date' => $status === 'completed' 
                ? fake()->dateTimeBetween('-1 day', 'now') 
                : null,
            'source_type' => fake()->randomElement($sourceTypes),
            'source_reference' => fake()->optional(0.7)->regexify('[A-Z]{2}-[0-9]{6}'),
            'created_by' => User::factory(),
        ];
    }

    /**
     * Indicate that the order is in draft status.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'planned_start_date' => null,
            'planned_end_date' => null,
            'actual_start_date' => null,
            'actual_end_date' => null,
        ]);
    }

    /**
     * Indicate that the order is planned.
     */
    public function planned(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'planned',
            'planned_start_date' => fake()->dateTimeBetween('now', '+1 week'),
            'planned_end_date' => fake()->dateTimeBetween('+1 week', '+1 month'),
            'actual_start_date' => null,
            'actual_end_date' => null,
        ]);
    }

    /**
     * Indicate that the order is scheduled (using planned status).
     */
    public function scheduled(): static
    {
        return $this->planned();
    }

    /**
     * Indicate that the order is released.
     */
    public function released(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'released',
            'planned_start_date' => fake()->dateTimeBetween('now', '+3 days'),
            'planned_end_date' => fake()->dateTimeBetween('+3 days', '+2 weeks'),
            'actual_start_date' => null,
            'actual_end_date' => null,
        ]);
    }

    /**
     * Indicate that the order is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'planned_start_date' => fake()->dateTimeBetween('-3 days', 'now'),
            'planned_end_date' => fake()->dateTimeBetween('now', '+1 week'),
            'actual_start_date' => fake()->dateTimeBetween('-3 days', 'now'),
            'actual_end_date' => null,
        ]);
    }

    /**
     * Indicate that the order is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'planned_start_date' => fake()->dateTimeBetween('-2 weeks', '-1 week'),
            'planned_end_date' => fake()->dateTimeBetween('-1 week', '-1 day'),
            'actual_start_date' => fake()->dateTimeBetween('-2 weeks', '-1 week'),
            'actual_end_date' => fake()->dateTimeBetween('-3 days', 'now'),
        ]);
    }

    /**
     * Indicate that the order is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    /**
     * Set high priority.
     */
    public function urgent(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => fake()->numberBetween(80, 100),
            'requested_date' => fake()->dateTimeBetween('now', '+1 week'),
        ]);
    }
} 