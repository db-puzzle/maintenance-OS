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
     * Get the schedule version.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Get the user who created the snapshot.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the schedules from the snapshot data.
     */
    public function getSchedules(): array
    {
        return $this->snapshot_data['schedules'] ?? [];
    }

    /**
     * Get the alerts from the snapshot data.
     */
    public function getAlerts(): array
    {
        return $this->snapshot_data['alerts'] ?? [];
    }

    /**
     * Get the version info from the snapshot data.
     */
    public function getVersionInfo(): array
    {
        return $this->snapshot_data['version_info'] ?? [];
    }

    /**
     * Restore the schedule from this snapshot.
     */
    public function restore(User $user): ScheduleVersion
    {
        // Create a new draft version
        $newVersion = ScheduleVersion::create([
            'version_number' => ScheduleVersion::getNextVersionNumber(),
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        // Restore schedules
        foreach ($this->getSchedules() as $scheduleData) {
            ProductionSchedule::create([
                'manufacturing_step_id' => $scheduleData['manufacturing_step_id'],
                'scheduled_start' => $scheduleData['scheduled_start'],
                'scheduled_end' => $scheduleData['scheduled_end'],
                'work_cell_id' => $scheduleData['work_cell_id'],
                'is_locked' => $scheduleData['is_locked'] ?? false,
                'locked_by' => $scheduleData['locked_by'] ?? null,
                'locked_at' => $scheduleData['locked_at'] ?? null,
                'schedule_version_id' => $newVersion->id,
            ]);
        }

        return $newVersion;
    }
}
