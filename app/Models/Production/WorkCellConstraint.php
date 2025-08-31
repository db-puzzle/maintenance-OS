<?php

namespace App\Models\Production;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkCellConstraint extends Model
{
    use HasFactory;

    protected $table = 'work_cell_constraints';

    protected $fillable = [
        'work_cell_id',
        'constraint_type',
        'start_datetime',
        'end_datetime',
        'is_recurring',
        'recurrence_pattern',
        'description',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'is_recurring' => 'boolean',
    ];

    /**
     * Available constraint types.
     */
    public const CONSTRAINT_TYPES = [
        'maintenance' => 'Maintenance',
        'training' => 'Training',
        'audit' => 'Audit',
        'holiday' => 'Holiday',
        'other' => 'Other',
    ];

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Check if the constraint is active on a given date.
     */
    public function isActiveOn(Carbon $date): bool
    {
        if (! $this->is_recurring) {
            return $date->between($this->start_datetime, $this->end_datetime);
        }

        // TODO: Implement recurring pattern logic
        // This would require parsing the recurrence_pattern (e.g., RRULE format)
        // For now, we'll just check the base dates
        return false;
    }

    /**
     * Get the duration in minutes.
     */
    public function getDurationInMinutes(): int
    {
        return $this->start_datetime->diffInMinutes($this->end_datetime);
    }

    /**
     * Get the duration in hours.
     */
    public function getDurationInHours(): float
    {
        return $this->getDurationInMinutes() / 60;
    }

    /**
     * Scope for constraints within a date range.
     */
    public function scopeInDateRange($query, Carbon $startDate, Carbon $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('start_datetime', [$startDate, $endDate])
                ->orWhereBetween('end_datetime', [$startDate, $endDate])
                ->orWhere(function ($q2) use ($startDate, $endDate) {
                    $q2->where('start_datetime', '<=', $startDate)
                        ->where('end_datetime', '>=', $endDate);
                });
        });
    }

    /**
     * Scope for constraints by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('constraint_type', $type);
    }
}
