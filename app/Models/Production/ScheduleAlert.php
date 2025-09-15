<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleAlert extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_version_id',
        'alert_type',
        'severity',
        'manufacturing_order_id',
        'manufacturing_step_id',
        'work_cell_id',
        'message',
        'resolved',
    ];

    protected $casts = [
        'resolved' => 'boolean',
    ];

    /**
     * Get the schedule version this alert belongs to.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Get the manufacturing order associated with this alert.
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }

    /**
     * Get the manufacturing step associated with this alert.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Get the work cell associated with this alert.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Mark this alert as resolved.
     */
    public function resolve(): void
    {
        $this->resolved = true;
        $this->save();
    }

    /**
     * Check if this is an error severity alert.
     */
    public function isError(): bool
    {
        return $this->severity === 'error';
    }

    /**
     * Check if this is a warning severity alert.
     */
    public function isWarning(): bool
    {
        return $this->severity === 'warning';
    }

    /**
     * Scope a query to only include unresolved alerts.
     */
    public function scopeUnresolved($query)
    {
        return $query->where('resolved', false);
    }

    /**
     * Scope a query to only include alerts of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('alert_type', $type);
    }

    /**
     * Scope a query to only include alerts of a specific severity.
     */
    public function scopeWithSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Get a human-readable alert type label.
     */
    public function getAlertTypeLabel(): string
    {
        return match ($this->alert_type) {
            'capacity_overrun' => 'Capacity Overrun',
            'dependency_violation' => 'Dependency Violation',
            'late_delivery' => 'Late Delivery',
            default => $this->alert_type,
        };
    }
}