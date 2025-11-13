<?php

namespace App\Models\Production;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkCellCapacityBooking extends Model
{
    use HasFactory;

    protected $table = 'work_cell_capacity_bookings';

    protected $fillable = [
        'work_cell_id',
        'manufacturing_step_id',
        'scheduled_date',
        'start_time',
        'end_time',
        'time_minutes',
        'parallel_slot',
        'quantity',
        'unit_of_measure',
        'status',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'start_time' => 'datetime:H:i:s',
        'end_time' => 'datetime:H:i:s',
        'time_minutes' => 'integer',
        'parallel_slot' => 'integer',
        'quantity' => 'decimal:3',
    ];

    /**
     * Available booking statuses.
     */
    public const STATUSES = [
        'reserved' => 'Reserved',
        'confirmed' => 'Confirmed',
        'in_progress' => 'In Progress',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the manufacturing step.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Get the start datetime combining date and time.
     */
    public function getStartDateTimeAttribute(): Carbon
    {
        return Carbon::parse($this->scheduled_date->format('Y-m-d') . ' ' . $this->start_time);
    }

    /**
     * Get the end datetime combining date and time.
     */
    public function getEndDateTimeAttribute(): Carbon
    {
        return Carbon::parse($this->scheduled_date->format('Y-m-d') . ' ' . $this->end_time);
    }

    /**
     * Check if the booking overlaps with a given time range.
     */
    public function overlaps(Carbon $startDateTime, Carbon $endDateTime): bool
    {
        return $this->start_date_time < $endDateTime && $this->end_date_time > $startDateTime;
    }

    /**
     * Scope for bookings on a specific date.
     */
    public function scopeOnDate($query, Carbon $date)
    {
        return $query->whereDate('scheduled_date', $date);
    }

    /**
     * Scope for bookings in a date range.
     */
    public function scopeInDateRange($query, Carbon $startDate, Carbon $endDate)
    {
        return $query->whereBetween('scheduled_date', [$startDate, $endDate]);
    }

    /**
     * Scope for active bookings (not cancelled).
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'cancelled');
    }

    /**
     * Scope for bookings by status.
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for bookings overlapping a specific time range.
     */
    public function scopeOverlappingTime($query, string $startTime, string $endTime)
    {
        return $query->where(function ($q) use ($startTime, $endTime) {
            // Booking starts before end time AND ends after start time
            $q->where('start_time', '<', $endTime)
                ->where('end_time', '>', $startTime);
        });
    }

    /**
     * Scope for bookings in a specific parallel slot.
     */
    public function scopeInParallelSlot($query, int $slot)
    {
        return $query->where('parallel_slot', $slot);
    }

    /**
     * Get the display name for the parallel slot.
     */
    public function getParallelSlotDisplayAttribute(): string
    {
        return "Slot {$this->parallel_slot}";
    }
}
