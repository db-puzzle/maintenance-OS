<?php

namespace App\Models\Production;

use App\Models\Settings\UnitOfMeasure;
use App\Services\Production\TimeFormatter;
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
        'setup_time_seconds',
        'cycle_time_seconds',
        'unit_of_measure_code',
        'notes',
    ];

    protected $casts = [
        'setup_time_seconds' => 'integer',
        'cycle_time_seconds' => 'decimal:3',
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
     * Get the unit of measure.
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'unit_of_measure_code', 'code');
    }

    /**
     * Calculate the time required to produce a given quantity in seconds.
     */
    public function calculateProductionTime(float $quantity, int $parallelExecutions = 1): float
    {
        $effectiveCycleTime = $this->cycle_time_seconds / $parallelExecutions;
        $productionTimeSeconds = $quantity * $effectiveCycleTime;

        return $this->setup_time_seconds + $productionTimeSeconds;
    }

    /**
     * Get the production time in hours.
     */
    public function calculateProductionTimeInHours(float $quantity, int $parallelExecutions = 1): float
    {
        return $this->calculateProductionTime($quantity, $parallelExecutions) / 3600;
    }

    /**
     * Get the setup time in seconds.
     */
    public function getEffectiveSetupTime(int $parallelExecutions = 1): float
    {
        // Setup time is always applied once for the entire operation
        return $this->setup_time_seconds;
    }

    /**
     * Calculate the time required considering parallel execution.
     */
    public function calculateParallelProductionTime(float $quantity, int $parallelExecutions = 1): float
    {
        $effectiveCycleTime = $this->cycle_time_seconds / $parallelExecutions;
        $productionTimeSeconds = $quantity * $effectiveCycleTime;

        return $this->setup_time_seconds + $productionTimeSeconds;
    }

    /**
     * Format setup time for display.
     */
    public function formatSetupTime(string $scale = 'auto'): array
    {
        return TimeFormatter::formatDuration($this->setup_time_seconds, $scale);
    }

    /**
     * Format production rate for display.
     */
    public function formatProductionRate(string $mode = 'cycle_time', string $scale = 'auto'): array
    {
        if ($mode === 'throughput') {
            return TimeFormatter::formatThroughput($this->cycle_time_seconds, $scale);
        }

        return TimeFormatter::formatCycleTime($this->cycle_time_seconds, $scale);
    }

    /**
     * Backward compatibility accessors for old column names.
     */
    public function getSetupTimeMinutesAttribute()
    {
        return round($this->setup_time_seconds / 60, 1);
    }

    public function getProductionRatePerHourAttribute()
    {
        // Convert cycle time (seconds per unit) to production rate (units per hour)
        if ($this->cycle_time_seconds && $this->cycle_time_seconds > 0) {
            return 3600 / $this->cycle_time_seconds;
        }

        return null;
    }

    public function getUnitOfMeasureAttribute()
    {
        return $this->unit_of_measure_code;
    }

    /**
     * Backward compatibility mutators for old column names.
     */
    public function setSetupTimeMinutesAttribute($value)
    {
        $this->attributes['setup_time_seconds'] = $value * 60;
    }

    public function setProductionRatePerHourAttribute($value)
    {
        // Convert production rate (units per hour) to cycle time (seconds per unit)
        if ($value && $value > 0) {
            $this->attributes['cycle_time_seconds'] = 3600 / $value;
        } else {
            $this->attributes['cycle_time_seconds'] = null;
        }
    }

    public function setUnitOfMeasureAttribute($value)
    {
        $this->attributes['unit_of_measure_code'] = $value;
    }
}
