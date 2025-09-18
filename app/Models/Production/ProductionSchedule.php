<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'conflicts',
    ];

    protected $casts = [
        'scheduled_start' => 'datetime',
        'scheduled_end' => 'datetime',
        'is_locked' => 'boolean',
        'locked_at' => 'datetime',
        'conflicts' => 'array',
    ];

    /**
     * Get the manufacturing step.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the user who locked the schedule.
     */
    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    /**
     * Get the schedule version.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Lock the schedule position.
     */
    public function lock(User $user): void
    {
        $this->update([
            'is_locked' => true,
            'locked_by' => $user->id,
            'locked_at' => now(),
        ]);
    }

    /**
     * Unlock the schedule position.
     */
    public function unlock(): void
    {
        $this->update([
            'is_locked' => false,
            'locked_by' => null,
            'locked_at' => null,
        ]);
    }

    /**
     * Check if the schedule conflicts with another schedule.
     */
    public function conflictsWith(ProductionSchedule $other): bool
    {
        // Skip if different work cells
        if ($this->work_cell_id !== $other->work_cell_id) {
            return false;
        }

        // Skip if same schedule
        if ($this->id === $other->id) {
            return false;
        }

        // Check for time overlap
        return $this->scheduled_start < $other->scheduled_end 
            && $this->scheduled_end > $other->scheduled_start;
    }

    /**
     * Get duration in minutes.
     */
    public function getDurationInMinutes(): int
    {
        return $this->scheduled_start->diffInMinutes($this->scheduled_end);
    }

    /**
     * Scope for schedules in a date range.
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('scheduled_start', [$startDate, $endDate])
              ->orWhereBetween('scheduled_end', [$startDate, $endDate])
              ->orWhere(function ($q2) use ($startDate, $endDate) {
                  $q2->where('scheduled_start', '<=', $startDate)
                     ->where('scheduled_end', '>=', $endDate);
              });
        });
    }

    /**
     * Scope for locked schedules.
     */
    public function scopeLocked($query)
    {
        return $query->where('is_locked', true);
    }

    /**
     * Scope for unlocked schedules.
     */
    public function scopeUnlocked($query)
    {
        return $query->where('is_locked', false);
    }

    /**
     * Check if this schedule has conflicts.
     */
    public function hasConflicts(): bool
    {
        return !empty($this->conflicts);
    }

    /**
     * Scope for schedules with conflicts.
     */
    public function scopeWithConflicts($query)
    {
        return $query->whereNotNull('conflicts')->where('conflicts', '!=', '[]');
    }

    /**
     * Update the related manufacturing step's scheduled dates.
     */
    protected static function booted()
    {
        static::saved(function ($schedule) {
            $schedule->manufacturingStep->update([
                'scheduled_start' => $schedule->scheduled_start,
                'scheduled_end' => $schedule->scheduled_end,
            ]);
        });

        static::deleted(function ($schedule) {
            $schedule->manufacturingStep->update([
                'scheduled_start' => null,
                'scheduled_end' => null,
            ]);
        });
    }
}
