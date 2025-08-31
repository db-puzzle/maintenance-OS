<?php

namespace App\Models\Production;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkCell extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'cell_type',
        'has_finite_capacity',
        'default_production_rate_per_hour',
        'default_unit_of_measure',
        'default_setup_time_minutes',
        'max_parallel_executions',
        'shift_id',
        'plant_id',
        'area_id',
        'sector_id',
        'manufacturer_id',
        'is_active',
    ];

    protected $casts = [
        'has_finite_capacity' => 'boolean',
        'default_production_rate_per_hour' => 'decimal:3',
        'default_setup_time_minutes' => 'integer',
        'max_parallel_executions' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the shift associated with the work cell.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * Get the plant that owns the work cell.
     */
    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    /**
     * Get the area that owns the work cell.
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Get the sector that owns the work cell.
     */
    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    /**
     * Get the manufacturer for external work cells.
     */
    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    /**
     * Get the routing steps assigned to this work cell.
     */
    public function routingSteps(): HasMany
    {
        return $this->hasMany(ManufacturingStep::class);
    }

    /**
     * Get the manufacturing steps assigned to this work cell.
     * Alias for routingSteps.
     */
    public function manufacturingSteps(): HasMany
    {
        return $this->hasMany(ManufacturingStep::class);
    }

    /**
     * Get the item rates for this work cell.
     */
    public function itemRates(): HasMany
    {
        return $this->hasMany(WorkCellItemRate::class);
    }

    /**
     * Get the constraints for this work cell.
     */
    public function constraints(): HasMany
    {
        return $this->hasMany(WorkCellConstraint::class);
    }

    /**
     * Get the capacity bookings for this work cell.
     */
    public function capacityBookings(): HasMany
    {
        return $this->hasMany(WorkCellCapacityBooking::class);
    }

    /**
     * Get the parallel resources for this work cell.
     */
    public function parallelResources(): HasMany
    {
        return $this->hasMany(WorkCellParallelResource::class);
    }

    /**
     * Get the production schedules for this work cell.
     */
    // TODO: Uncomment when ProductionSchedule model is created
    // public function productionSchedules(): HasMany
    // {
    //     return $this->hasMany(ProductionSchedule::class);
    // }

    /**
     * Scope for active work cells.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for internal work cells.
     */
    public function scopeInternal($query)
    {
        return $query->where('cell_type', 'internal');
    }

    /**
     * Scope for external work cells.
     */
    public function scopeExternal($query)
    {
        return $query->where('cell_type', 'external');
    }

    /**
     * Get the production rate for a specific item.
     */
    public function getProductionRateForItem(Item $item): ?WorkCellItemRate
    {
        return $this->itemRates()->where('item_id', $item->id)->first();
    }

    /**
     * Get the effective production rate for an item (specific rate or default).
     */
    public function getEffectiveProductionRate(Item $item): float
    {
        $itemRate = $this->getProductionRateForItem($item);

        return $itemRate ? $itemRate->production_rate_per_hour : ($this->default_production_rate_per_hour ?? 0);
    }

    /**
     * Get the effective setup time for an item (specific setup time or default).
     */
    public function getEffectiveSetupTime(Item $item): int
    {
        $itemRate = $this->getProductionRateForItem($item);

        return $itemRate ? $itemRate->setup_time_minutes : ($this->default_setup_time_minutes ?? 0);
    }

    /**
     * Get the effective unit of measure for an item (specific UOM or default).
     */
    public function getEffectiveUnitOfMeasure(Item $item): string
    {
        $itemRate = $this->getProductionRateForItem($item);

        return $itemRate ? $itemRate->unit_of_measure : ($this->default_unit_of_measure ?? 'PC');
    }

    /**
     * Calculate available time on a specific date (in minutes).
     */
    public function getAvailableTimeOnDate(\Carbon\Carbon $date): int
    {
        // Infinite capacity work cells have unlimited time
        if (! $this->has_finite_capacity) {
            return PHP_INT_MAX;
        }

        // No shift means no available time
        if (! $this->shift) {
            return 0;
        }

        // Get shift working time for the date
        $weekday = strtolower($date->format('l'));
        $shiftTimes = $this->shift->getShiftTimesForDateInUTC($date->format('Y-m-d'), $weekday);

        $totalMinutes = 0;
        foreach ($shiftTimes as $shiftTime) {
            $workMinutes = $shiftTime['start']->diffInMinutes($shiftTime['end']);

            // Subtract break times
            foreach ($shiftTime['breaks'] as $break) {
                $breakMinutes = $break['start']->diffInMinutes($break['end']);
                $workMinutes -= $breakMinutes;
            }

            $totalMinutes += $workMinutes;
        }

        // Subtract constraints for this date
        $constraints = $this->constraints()
            ->whereDate('start_datetime', '<=', $date)
            ->whereDate('end_datetime', '>=', $date)
            ->get();

        foreach ($constraints as $constraint) {
            // Calculate overlap with the date
            $constraintStart = $constraint->start_datetime->max($date->startOfDay());
            $constraintEnd = $constraint->end_datetime->min($date->endOfDay());
            $constraintMinutes = $constraintStart->diffInMinutes($constraintEnd);
            $totalMinutes -= $constraintMinutes;
        }

        return max(0, $totalMinutes);
    }

    /**
     * Check if work cell has capacity for a given duration on a date.
     */
    public function hasCapacityFor(int $durationMinutes, \Carbon\Carbon $date): bool
    {
        // Infinite capacity always has room
        if (! $this->has_finite_capacity) {
            return true;
        }

        $availableMinutes = $this->getAvailableTimeOnDate($date);

        // Get already booked time
        $bookedMinutes = $this->capacityBookings()
            ->active()
            ->onDate($date)
            ->sum('time_minutes');

        $remainingMinutes = $availableMinutes - $bookedMinutes;

        return $remainingMinutes >= $durationMinutes;
    }

    /**
     * Get the utilization percentage for a given date.
     */
    public function getUtilizationOnDate(\Carbon\Carbon $date): float
    {
        if (! $this->has_finite_capacity) {
            return 0; // Infinite capacity doesn't have utilization
        }

        $availableMinutes = $this->getAvailableTimeOnDate($date);
        if ($availableMinutes <= 0) {
            return 0;
        }

        $bookedMinutes = $this->capacityBookings()
            ->active()
            ->onDate($date)
            ->sum('time_minutes');

        return round(($bookedMinutes / $availableMinutes) * 100, 2);
    }

    /**
     * Get available parallel resources for a specific date and shift.
     */
    public function getAvailableParallelResources(\Carbon\Carbon $date, ?int $shiftId = null): int
    {
        // First check for a specific date/shift resource entry
        $resource = $this->parallelResources()
            ->where('resource_date', $date->format('Y-m-d'))
            ->when($shiftId, function ($query) use ($shiftId) {
                return $query->where('shift_id', $shiftId);
            })
            ->first();

        if ($resource) {
            return $resource->available_count;
        }

        // If no specific resource entry, return the max parallel executions
        return $this->max_parallel_executions;
    }

    /**
     * Get the number of booked parallel slots for a specific time period.
     */
    public function getBookedParallelSlots(\Carbon\Carbon $date, string $startTime, string $endTime): int
    {
        return $this->capacityBookings()
            ->active()
            ->onDate($date)
            ->overlappingTime($startTime, $endTime)
            ->distinct('parallel_slot')
            ->count('parallel_slot');
    }

    /**
     * Check if a parallel slot is available for a given time period.
     */
    public function hasAvailableParallelSlot(\Carbon\Carbon $date, string $startTime, string $endTime, ?int $shiftId = null): bool
    {
        $availableResources = $this->getAvailableParallelResources($date, $shiftId);
        $bookedSlots = $this->getBookedParallelSlots($date, $startTime, $endTime);

        return $bookedSlots < $availableResources;
    }

    /**
     * Get the next available parallel slot for a time period.
     */
    public function getNextAvailableParallelSlot(\Carbon\Carbon $date, string $startTime, string $endTime): ?int
    {
        $bookedSlots = $this->capacityBookings()
            ->active()
            ->onDate($date)
            ->overlappingTime($startTime, $endTime)
            ->pluck('parallel_slot')
            ->unique()
            ->sort()
            ->values();

        // Find the first available slot
        for ($slot = 1; $slot <= $this->max_parallel_executions; $slot++) {
            if (! $bookedSlots->contains($slot)) {
                return $slot;
            }
        }

        return null;
    }

    /**
     * Get display name with type indicator.
     */
    public function getDisplayNameAttribute()
    {
        $typeIndicator = $this->cell_type === 'external' ? ' (Ext)' : '';

        return "{$this->name}{$typeIndicator}";
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($workCell) {
            // Dependency checking is now handled by the controller's checkDependencies method
            // This allows for better error handling and user feedback

            if ($workCell->routingSteps()->exists()) {
                throw new \Exception('Esta célula de trabalho possui etapas de roteiro vinculadas.');
            }

            // TODO: Uncomment when ProductionSchedule model is created
            // if ($workCell->productionSchedules()->exists()) {
            //     throw new \Exception('Esta célula de trabalho possui agendamentos de produção vinculados.');
            // }
        });
    }
}
