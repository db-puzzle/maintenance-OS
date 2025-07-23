<?php

namespace App\Models\Production;

use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_order_id',
        'routing_step_id',
        'work_cell_id',
        'scheduled_start',
        'scheduled_end',
        'buffer_time_minutes',
        'assigned_team_id',
        'assigned_operators',
        'status',
    ];

    protected $casts = [
        'scheduled_start' => 'datetime',
        'scheduled_end' => 'datetime',
        'assigned_operators' => 'array',
    ];

    /**
     * Get the production order.
     */
    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    /**
     * Get the routing step.
     */
    public function routingStep(): BelongsTo
    {
        return $this->belongsTo(RoutingStep::class);
    }

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the assigned team.
     */
    public function assignedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'assigned_team_id');
    }

    /**
     * Get the production executions for this schedule.
     */
    public function productionExecutions(): HasMany
    {
        return $this->hasMany(ProductionExecution::class);
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
     * Scope for schedules by status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for schedules for a specific work cell.
     */
    public function scopeForWorkCell($query, $workCellId)
    {
        return $query->where('work_cell_id', $workCellId);
    }

    /**
     * Get the duration in minutes.
     */
    public function getDurationMinutesAttribute()
    {
        return $this->scheduled_start->diffInMinutes($this->scheduled_end);
    }

    /**
     * Check if the schedule is overdue.
     */
    public function getIsOverdueAttribute()
    {
        return $this->status === 'scheduled' && 
               $this->scheduled_start < now();
    }

    /**
     * Check if the schedule conflicts with another schedule.
     */
    public function conflictsWith(ProductionSchedule $other)
    {
        // Same work cell check
        if ($this->work_cell_id !== $other->work_cell_id) {
            return false;
        }

        // Time overlap check
        return $this->scheduled_start < $other->scheduled_end && 
               $this->scheduled_end > $other->scheduled_start;
    }

    /**
     * Start the scheduled production.
     */
    public function start()
    {
        if (!in_array($this->status, ['scheduled', 'ready'])) {
            throw new \Exception('Only scheduled or ready schedules can be started.');
        }

        $this->update(['status' => 'in_progress']);

        // Create initial production execution record
        return $this->productionExecutions()->create([
            'routing_step_id' => $this->routing_step_id,
            'item_qr_code' => $this->generateQrCode(),
            'started_at' => now(),
            'quantity_started' => $this->productionOrder->quantity,
        ]);
    }

    /**
     * Complete the scheduled production.
     */
    public function complete()
    {
        $this->update(['status' => 'completed']);

        // Update any active executions
        $this->productionExecutions()
            ->whereNull('completed_at')
            ->update(['completed_at' => now()]);
    }

    /**
     * Delay the schedule.
     */
    public function delay($minutes)
    {
        $this->update([
            'scheduled_start' => $this->scheduled_start->addMinutes($minutes),
            'scheduled_end' => $this->scheduled_end->addMinutes($minutes),
            'status' => 'delayed',
        ]);
    }

    /**
     * Generate a QR code for tracking.
     */
    protected function generateQrCode()
    {
        return sprintf(
            'PS-%d-%s',
            $this->id,
            $this->scheduled_start->format('YmdHis')
        );
    }

    /**
     * Get the utilization percentage.
     */
    public function getUtilizationPercentageAttribute()
    {
        if (!$this->routingStep) {
            return 0;
        }

        $totalProductionTime = $this->routingStep->cycle_time_minutes * 
                              $this->productionOrder->quantity;
        
        $scheduledTime = $this->duration_minutes - $this->buffer_time_minutes;

        return $scheduledTime > 0 
            ? round(($totalProductionTime / $scheduledTime) * 100, 2)
            : 0;
    }
}