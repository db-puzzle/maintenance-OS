<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionExecution extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_schedule_id',
        'routing_step_id',
        'item_qr_code',
        'scanned_by',
        'started_at',
        'paused_at',
        'resumed_at',
        'completed_at',
        'total_pause_duration',
        'quantity_started',
        'quantity_completed',
        'quantity_scrapped',
        'quality_checks',
        'defects_reported',
        'operator_notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'resumed_at' => 'datetime',
        'completed_at' => 'datetime',
        'quantity_started' => 'decimal:2',
        'quantity_completed' => 'decimal:2',
        'quantity_scrapped' => 'decimal:2',
        'quality_checks' => 'array',
        'defects_reported' => 'array',
    ];

    /**
     * Get the production schedule.
     */
    public function productionSchedule(): BelongsTo
    {
        return $this->belongsTo(ProductionSchedule::class);
    }

    /**
     * Get the routing step.
     */
    public function routingStep(): BelongsTo
    {
        return $this->belongsTo(RoutingStep::class);
    }

    /**
     * Get the user who scanned/started the execution.
     */
    public function scannedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }

    /**
     * Scope for active executions (not completed).
     */
    public function scopeActive($query)
    {
        return $query->whereNull('completed_at');
    }

    /**
     * Scope for completed executions.
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Scope for executions by QR code.
     */
    public function scopeByQrCode($query, $qrCode)
    {
        return $query->where('item_qr_code', $qrCode);
    }

    /**
     * Get the status of the execution.
     */
    public function getStatusAttribute()
    {
        if ($this->completed_at) {
            return 'completed';
        }
        
        if ($this->paused_at && !$this->resumed_at) {
            return 'paused';
        }
        
        if ($this->started_at) {
            return 'in_progress';
        }
        
        return 'not_started';
    }

    /**
     * Get the elapsed time in minutes.
     */
    public function getElapsedMinutesAttribute()
    {
        if (!$this->started_at) {
            return 0;
        }

        $endTime = $this->completed_at ?? now();
        $totalMinutes = $this->started_at->diffInMinutes($endTime);
        
        return $totalMinutes - $this->total_pause_duration;
    }

    /**
     * Get the efficiency percentage.
     */
    public function getEfficiencyPercentageAttribute()
    {
        if (!$this->routingStep || !$this->quantity_completed) {
            return 0;
        }

        $expectedMinutes = $this->routingStep->cycle_time_minutes * $this->quantity_completed;
        $actualMinutes = $this->elapsed_minutes;

        return $actualMinutes > 0 
            ? round(($expectedMinutes / $actualMinutes) * 100, 2)
            : 0;
    }

    /**
     * Get the scrap rate percentage.
     */
    public function getScrapRateAttribute()
    {
        if (!$this->quantity_started || $this->quantity_started == 0) {
            return 0;
        }

        return round(($this->quantity_scrapped / $this->quantity_started) * 100, 2);
    }

    /**
     * Pause the execution.
     */
    public function pause()
    {
        if ($this->status !== 'in_progress') {
            throw new \Exception('Only in-progress executions can be paused.');
        }

        $this->update([
            'paused_at' => now(),
            'resumed_at' => null,
        ]);
    }

    /**
     * Resume the execution.
     */
    public function resume()
    {
        if ($this->status !== 'paused') {
            throw new \Exception('Only paused executions can be resumed.');
        }

        $pauseDuration = $this->paused_at->diffInMinutes(now());
        
        $this->update([
            'resumed_at' => now(),
            'total_pause_duration' => $this->total_pause_duration + $pauseDuration,
        ]);
    }

    /**
     * Complete the execution.
     */
    public function complete($quantityCompleted, $quantityScrapped = 0)
    {
        if ($this->status === 'completed') {
            throw new \Exception('Execution is already completed.');
        }

        $this->update([
            'completed_at' => now(),
            'quantity_completed' => $quantityCompleted,
            'quantity_scrapped' => $quantityScrapped,
        ]);

        // Check if all executions for the schedule are complete
        $schedule = $this->productionSchedule;
        if ($schedule && !$schedule->productionExecutions()->active()->exists()) {
            $schedule->complete();
        }
    }

    /**
     * Add a quality check result.
     */
    public function addQualityCheck($checkpoint, $result, $notes = null)
    {
        $checks = $this->quality_checks ?? [];
        $checks[] = [
            'checkpoint' => $checkpoint,
            'result' => $result,
            'notes' => $notes,
            'timestamp' => now()->toIso8601String(),
            'user_id' => auth()->id(),
        ];

        $this->update(['quality_checks' => $checks]);
    }

    /**
     * Report a defect.
     */
    public function reportDefect($defectType, $quantity, $description = null)
    {
        $defects = $this->defects_reported ?? [];
        $defects[] = [
            'type' => $defectType,
            'quantity' => $quantity,
            'description' => $description,
            'timestamp' => now()->toIso8601String(),
            'user_id' => auth()->id(),
        ];

        $this->update(['defects_reported' => $defects]);
    }
}