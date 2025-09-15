<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_version_id',
        'snapshot_data',
        'created_by',
        'reason',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
    ];

    /**
     * Get the schedule version this snapshot belongs to.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Get the user who created this snapshot.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Create a snapshot of the current schedule state.
     */
    public static function createFromVersion(ScheduleVersion $version, User $user, ?string $reason = null): self
    {
        $schedules = $version->productionSchedules()
            ->with([
                'manufacturingStep.manufacturingRoute.manufacturingOrder',
                'workCell',
                'lockedBy'
            ])
            ->get();

        $snapshotData = [
            'version_info' => [
                'version_number' => $version->version_number,
                'status' => $version->status,
                'published_at' => $version->published_at?->toIso8601String(),
                'published_by' => $version->published_by,
            ],
            'schedules' => $schedules->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'manufacturing_step_id' => $schedule->manufacturing_step_id,
                    'manufacturing_order_number' => $schedule->manufacturingStep->manufacturingRoute->manufacturingOrder->order_number,
                    'step_name' => $schedule->manufacturingStep->name,
                    'scheduled_start' => $schedule->scheduled_start->toIso8601String(),
                    'scheduled_end' => $schedule->scheduled_end->toIso8601String(),
                    'work_cell_id' => $schedule->work_cell_id,
                    'work_cell_name' => $schedule->workCell->name,
                    'is_locked' => $schedule->is_locked,
                    'locked_by' => $schedule->locked_by,
                    'locked_at' => $schedule->locked_at?->toIso8601String(),
                ];
            })->toArray(),
            'alerts' => $version->alerts->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'alert_type' => $alert->alert_type,
                    'severity' => $alert->severity,
                    'message' => $alert->message,
                    'resolved' => $alert->resolved,
                ];
            })->toArray(),
        ];

        return static::create([
            'schedule_version_id' => $version->id,
            'snapshot_data' => $snapshotData,
            'created_by' => $user->id,
            'reason' => $reason,
        ]);
    }

    /**
     * Restore a schedule from this snapshot.
     */
    public function restore(): void
    {
        // This method would be implemented to restore the schedule state
        // from the snapshot data. For now, it's a placeholder.
        // Implementation would involve recreating ProductionSchedule records
        // based on the snapshot data.
    }
}