<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleAlert extends Model
{
    use HasFactory;

    public const ALERT_TYPES = [
        'capacity_overrun' => 'Capacity Overrun',
        'dependency_violation' => 'Dependency Violation',
        'late_delivery' => 'Late Delivery',
    ];

    public const SEVERITY_LEVELS = [
        'warning' => 'Warning',
        'error' => 'Error',
    ];

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
        'alert_type' => 'string',
        'severity' => 'string',
        'resolved' => 'boolean',
    ];

    /**
     * Get the schedule version.
     */
    public function scheduleVersion(): BelongsTo
    {
        return $this->belongsTo(ScheduleVersion::class);
    }

    /**
     * Get the manufacturing order.
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }

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
     * Scope for unresolved alerts.
     */
    public function scopeUnresolved($query)
    {
        return $query->where('resolved', false);
    }

    /**
     * Scope for resolved alerts.
     */
    public function scopeResolved($query)
    {
        return $query->where('resolved', true);
    }

    /**
     * Scope for alerts by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('alert_type', $type);
    }

    /**
     * Scope for alerts by severity.
     */
    public function scopeOfSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope for error alerts.
     */
    public function scopeErrors($query)
    {
        return $query->where('severity', 'error');
    }

    /**
     * Scope for warning alerts.
     */
    public function scopeWarnings($query)
    {
        return $query->where('severity', 'warning');
    }

    /**
     * Mark the alert as resolved.
     */
    public function resolve(): void
    {
        $this->update(['resolved' => true]);
    }

    /**
     * Create a capacity overrun alert.
     */
    public static function createCapacityOverrun(
        ScheduleVersion $version,
        WorkCell $workCell,
        ManufacturingStep $step,
        string $message
    ): self {
        return static::create([
            'schedule_version_id' => $version->id,
            'alert_type' => 'capacity_overrun',
            'severity' => 'error',
            'work_cell_id' => $workCell->id,
            'manufacturing_step_id' => $step->id,
            'manufacturing_order_id' => $step->manufacturingRoute->manufacturing_order_id,
            'message' => $message,
        ]);
    }

    /**
     * Create a dependency violation alert.
     */
    public static function createDependencyViolation(
        ScheduleVersion $version,
        ManufacturingStep $step,
        string $message,
        string $severity = 'error'
    ): self {
        return static::create([
            'schedule_version_id' => $version->id,
            'alert_type' => 'dependency_violation',
            'severity' => $severity,
            'manufacturing_step_id' => $step->id,
            'manufacturing_order_id' => $step->manufacturingRoute->manufacturing_order_id,
            'message' => $message,
        ]);
    }

    /**
     * Create a late delivery alert.
     */
    public static function createLateDelivery(
        ScheduleVersion $version,
        ManufacturingOrder $order,
        string $message
    ): self {
        return static::create([
            'schedule_version_id' => $version->id,
            'alert_type' => 'late_delivery',
            'severity' => 'warning',
            'manufacturing_order_id' => $order->id,
            'message' => $message,
        ]);
    }
}
