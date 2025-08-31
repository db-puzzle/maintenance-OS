<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkCellItemRate extends Model
{
    use HasFactory;

    protected $table = 'work_cell_item_rates';

    protected $fillable = [
        'work_cell_id',
        'item_id',
        'setup_time_minutes',
        'production_rate_per_hour',
        'unit_of_measure',
        'notes',
    ];

    protected $casts = [
        'setup_time_minutes' => 'integer',
        'production_rate_per_hour' => 'decimal:3',
    ];

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the item.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Calculate the time required to produce a given quantity.
     */
    public function calculateProductionTime(float $quantity, int $parallelExecutions = 1): float
    {
        $effectiveRate = $this->production_rate_per_hour * $parallelExecutions;
        $productionTimeMinutes = ($quantity / $effectiveRate) * 60;

        return $this->setup_time_minutes + $productionTimeMinutes;
    }

    /**
     * Get the production time in hours.
     */
    public function calculateProductionTimeInHours(float $quantity, int $parallelExecutions = 1): float
    {
        return $this->calculateProductionTime($quantity, $parallelExecutions) / 60;
    }

    /**
     * Get the setup time in minutes.
     */
    public function getEffectiveSetupTime(int $parallelExecutions = 1): float
    {
        // Setup time is always applied once for the entire operation
        return $this->setup_time_minutes;
    }

    /**
     * Calculate the time required considering parallel execution.
     */
    public function calculateParallelProductionTime(float $quantity, int $parallelExecutions = 1): float
    {
        $effectiveRate = $this->production_rate_per_hour * $parallelExecutions;
        $productionTimeMinutes = ($quantity / $effectiveRate) * 60;

        return $this->setup_time_minutes + $productionTimeMinutes;
    }
}
