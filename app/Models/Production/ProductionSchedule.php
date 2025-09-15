<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProductionSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'manufacturing_step_id',
        'scheduled_start',
        'scheduled_end',
        'work_cell_id',
        'is_locked',
        'locked_by',
        'locked_at',
        'schedule_version_id',
    ];

    protected $casts = [
        'scheduled_start' => 'datetime',
        'scheduled_end' => 'datetime',
        'locked_at' => 'datetime',
        'is_locked' => 'boolean',
    ];

    /**
     * Get the manufacturing step for this schedule.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Get the work cell for this schedule.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the user who locked this schedule.
     */
    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    /**
     * Get the schedule version this belongs to.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Get the work cell capacity booking for this schedule.
     */
    public function capacityBooking(): HasOne
    {
        return $this->hasOne(WorkCellCapacityBooking::class);
    }

    /**
     * Lock this schedule position.
     */
    public function lock(User $user): void
    {
        $this->is_locked = true;
        $this->locked_by = $user->id;
        $this->locked_at = now();
        $this->save();
    }

    /**
     * Unlock this schedule position.
     */
    public function unlock(): void
    {
        $this->is_locked = false;
        $this->locked_by = null;
        $this->locked_at = null;
        $this->save();
    }

    /**
     * Get the duration in minutes.
     */
    public function getDurationInMinutes(): int
    {
        return $this->scheduled_start->diffInMinutes($this->scheduled_end);
    }

    /**
     * Check if this schedule overlaps with a given time range.
     */
    public function overlapsWithTimeRange($start, $end): bool
    {
        return $this->scheduled_start < $end && $this->scheduled_end > $start;
    }

    /**
     * Scope a query to only include schedules for a specific version.
     */
    public function scopeForVersion($query, int $versionId)
    {
        return $query->where('schedule_version_id', $versionId);
    }

    /**
     * Scope a query to only include locked schedules.
     */
    public function scopeLocked($query)
    {
        return $query->where('is_locked', true);
    }

    /**
     * Scope a query to only include unlocked schedules.
     */
    public function scopeUnlocked($query)
    {
        return $query->where('is_locked', false);
    }
}