<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'version_number',
        'status',
        'published_by',
        'published_at',
        'created_by',
        'last_algorithm_used',
        'last_scheduled_at',
        'algorithm_metrics',
        'algorithm_execution_time',
        'scheduling_job_id',
        'scheduling_status',
        'scheduling_error',
    ];

    protected $casts = [
        'status' => 'string',
        'published_at' => 'datetime',
        'last_scheduled_at' => 'datetime',
        'algorithm_metrics' => 'array',
        'algorithm_execution_time' => 'float',
        'scheduling_status' => 'string',
    ];

    /**
     * Get the user who published the schedule.
     */
    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /**
     * Get the user who created the schedule.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the production schedules for this version.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

    /**
     * Get the alerts for this schedule version.
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(ScheduleAlert::class);
    }

    /**
     * Get the snapshots for this schedule version.
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(ScheduleSnapshot::class);
    }

    /**
     * Scope for draft schedules.
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope for published schedules.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Get the latest published schedule.
     */
    public static function latestPublished()
    {
        return static::published()
            ->orderBy('published_at', 'desc')
            ->first();
    }

    /**
     * Publish the schedule version.
     */
    public function publish(User $user): void
    {
        $this->update([
            'status' => 'published',
            'published_by' => $user->id,
            'published_at' => now(),
        ]);
    }

    /**
     * Get the next version number.
     */
    public static function getNextVersionNumber(): int
    {
        return (static::max('version_number') ?? 0) + 1;
    }

    /**
     * Create a snapshot of the current schedule.
     */
    public function createSnapshot(User $user, ?string $reason = null): ScheduleSnapshot
    {
        $snapshotData = [
            'version_info' => [
                'version_number' => $this->version_number,
                'status' => $this->status,
                'created_at' => $this->created_at,
                'published_at' => $this->published_at,
            ],
            'schedules' => $this->productionSchedules()
                ->with(['manufacturingStep.manufacturingRoute.manufacturingOrder', 'workCell'])
                ->get()
                ->toArray(),
            'alerts' => $this->alerts()->get()->toArray(),
        ];

        return $this->snapshots()->create([
            'snapshot_data' => $snapshotData,
            'created_by' => $user->id,
            'reason' => $reason,
        ]);
    }

    /**
     * Check if the schedule version is being scheduled.
     */
    public function isScheduling(): bool
    {
        return in_array($this->scheduling_status, ['queued', 'running']);
    }

    /**
     * Check if the schedule version can be scheduled.
     */
    public function canSchedule(): bool
    {
        return $this->status === 'draft' && !$this->isScheduling();
    }

    /**
     * Update scheduling status.
     */
    public function updateSchedulingStatus(string $status, ?string $error = null): void
    {
        $this->update([
            'scheduling_status' => $status,
            'scheduling_error' => $error,
        ]);
    }

    /**
     * Mark scheduling as started.
     */
    public function markSchedulingStarted(string $algorithm, string $jobId): void
    {
        $this->update([
            'scheduling_status' => 'running',
            'last_algorithm_used' => $algorithm,
            'scheduling_job_id' => $jobId,
            'scheduling_error' => null,
        ]);
    }

    /**
     * Mark scheduling as completed.
     */
    public function markSchedulingCompleted(array $metrics, float $executionTime): void
    {
        $this->update([
            'scheduling_status' => 'completed',
            'last_scheduled_at' => now(),
            'algorithm_metrics' => $metrics,
            'algorithm_execution_time' => $executionTime,
            'scheduling_error' => null,
        ]);
    }
}
