<?php

namespace App\Models\Production;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkCell extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'cell_type',
        'available_hours_per_day',
        'efficiency_percentage',
        'plant_id',
        'area_id',
        'vendor_name',
        'vendor_contact',
        'lead_time_days',
        'is_active',
    ];

    protected $casts = [
        'available_hours_per_day' => 'decimal:2',
        'efficiency_percentage' => 'decimal:2',
        'vendor_contact' => 'array',
        'is_active' => 'boolean',
    ];

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
     * Get the routing steps assigned to this work cell.
     */
    public function routingSteps(): HasMany
    {
        return $this->hasMany(RoutingStep::class);
    }

    /**
     * Get the production schedules for this work cell.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

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
     * Get the effective capacity in hours per day.
     */
    public function getEffectiveCapacityAttribute()
    {
        return $this->available_hours_per_day * ($this->efficiency_percentage / 100);
    }

    /**
     * Check if work cell is available for a given time period.
     */
    public function isAvailable($startTime, $endTime)
    {
        return !$this->productionSchedules()
            ->where(function ($query) use ($startTime, $endTime) {
                $query->where(function ($q) use ($startTime, $endTime) {
                    // Check if any existing schedule overlaps with the requested time
                    $q->where('scheduled_start', '<=', $endTime)
                      ->where('scheduled_end', '>=', $startTime);
                });
            })
            ->whereIn('status', ['scheduled', 'ready', 'in_progress'])
            ->exists();
    }

    /**
     * Get the utilization percentage for a given date range.
     */
    public function getUtilization($startDate, $endDate)
    {
        $totalAvailableMinutes = $this->available_hours_per_day * 60 * 
            $startDate->diffInDays($endDate);
        
        $scheduledMinutes = $this->productionSchedules()
            ->whereBetween('scheduled_start', [$startDate, $endDate])
            ->sum(\DB::raw('TIMESTAMPDIFF(MINUTE, scheduled_start, scheduled_end)'));
        
        return $totalAvailableMinutes > 0 
            ? round(($scheduledMinutes / $totalAvailableMinutes) * 100, 2)
            : 0;
    }

    /**
     * Get display name with type indicator.
     */
    public function getDisplayNameAttribute()
    {
        $typeIndicator = $this->cell_type === 'external' ? ' (Ext)' : '';
        return "{$this->code} - {$this->name}{$typeIndicator}";
    }
}