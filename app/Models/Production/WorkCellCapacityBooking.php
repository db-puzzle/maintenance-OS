<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkCellCapacityBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_cell_id',
        'production_schedule_id',
        'start_time',
        'end_time',
        'booking_type',
        'reason',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    /**
     * Get the work cell for this booking.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the production schedule for this booking.
     */
    public function productionSchedule(): BelongsTo
    {
        return $this->belongsTo(ProductionSchedule::class);
    }

    /**
     * Check if this booking is for scheduled production.
     */
    public function isScheduled(): bool
    {
        return $this->booking_type === 'scheduled';
    }

    /**
     * Check if this booking is for maintenance.
     */
    public function isMaintenance(): bool
    {
        return $this->booking_type === 'maintenance';
    }

    /**
     * Check if this booking is for unavailable time.
     */
    public function isUnavailable(): bool
    {
        return $this->booking_type === 'unavailable';
    }

    /**
     * Get the duration in minutes.
     */
    public function getDurationInMinutes(): int
    {
        return $this->start_time->diffInMinutes($this->end_time);
    }

    /**
     * Check if this booking overlaps with a given time range.
     */
    public function overlapsWithTimeRange($start, $end): bool
    {
        return $this->start_time < $end && $this->end_time > $start;
    }

    /**
     * Scope a query to only include bookings for a specific work cell.
     */
    public function scopeForWorkCell($query, int $workCellId)
    {
        return $query->where('work_cell_id', $workCellId);
    }

    /**
     * Scope a query to only include bookings within a date range.
     */
    public function scopeWithinDateRange($query, $start, $end)
    {
        return $query->where(function ($q) use ($start, $end) {
            $q->whereBetween('start_time', [$start, $end])
                ->orWhereBetween('end_time', [$start, $end])
                ->orWhere(function ($q2) use ($start, $end) {
                    $q2->where('start_time', '<=', $start)
                        ->where('end_time', '>=', $end);
                });
        });
    }

    /**
     * Create a booking from a production schedule.
     */
    public static function createFromSchedule(ProductionSchedule $schedule): self
    {
        return static::create([
            'work_cell_id' => $schedule->work_cell_id,
            'production_schedule_id' => $schedule->id,
            'start_time' => $schedule->scheduled_start,
            'end_time' => $schedule->scheduled_end,
            'booking_type' => 'scheduled',
        ]);
    }
}