<?php

namespace App\Models\WorkOrders;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderFailureAnalysis extends Model
{
    protected $table = 'work_order_failure_analysis';
    
    protected $fillable = [
        'work_order_id',
        'failure_mode_id',
        'failure_mode_other',
        'root_cause_id',
        'root_cause_other',
        'immediate_cause_id',
        'immediate_cause_other',
        'failure_effect',
        'downtime_minutes',
        'production_loss_units',
        'safety_incident',
        'environmental_incident',
        'failure_description',
        'corrective_actions',
        'preventive_recommendations',
        'analyzed_by',
        'analyzed_at',
    ];

    protected $casts = [
        'downtime_minutes' => 'integer',
        'production_loss_units' => 'integer',
        'safety_incident' => 'boolean',
        'environmental_incident' => 'boolean',
        'analyzed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            $model->analyzed_at = $model->analyzed_at ?: now();
        });
    }

    // Relationships
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function failureMode(): BelongsTo
    {
        return $this->belongsTo(FailureMode::class);
    }

    public function rootCause(): BelongsTo
    {
        return $this->belongsTo(RootCause::class);
    }

    public function immediateCause(): BelongsTo
    {
        return $this->belongsTo(ImmediateCause::class);
    }

    public function analyzedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'analyzed_by');
    }

    // Helper methods
    public function getFailureModeNameAttribute(): string
    {
        if ($this->failureMode) {
            return $this->failureMode->name;
        }
        
        return $this->failure_mode_other ?: 'Not specified';
    }

    public function getRootCauseNameAttribute(): string
    {
        if ($this->rootCause) {
            return $this->rootCause->name;
        }
        
        return $this->root_cause_other ?: 'Not specified';
    }

    public function getImmediateCauseNameAttribute(): string
    {
        if ($this->immediateCause) {
            return $this->immediateCause->name;
        }
        
        return $this->immediate_cause_other ?: 'Not specified';
    }

    public function getDowntimeHoursAttribute(): float
    {
        return round($this->downtime_minutes / 60, 2);
    }

    public function getSeverityScoreAttribute(): int
    {
        $score = 0;
        
        // Failure effect scoring
        $effectScores = [
            'none' => 0,
            'minor' => 20,
            'moderate' => 40,
            'major' => 60,
            'critical' => 80,
        ];
        $score += $effectScores[$this->failure_effect] ?? 0;
        
        // Additional factors
        if ($this->safety_incident) {
            $score += 15;
        }
        
        if ($this->environmental_incident) {
            $score += 10;
        }
        
        // Downtime factor (max 10 points)
        if ($this->downtime_hours > 0) {
            $score += min(10, $this->downtime_hours);
        }
        
        return min(100, $score);
    }

    // Scopes
    public function scopeWithSafetyIncidents($query)
    {
        return $query->where('safety_incident', true);
    }

    public function scopeWithEnvironmentalIncidents($query)
    {
        return $query->where('environmental_incident', true);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('failure_effect', $severity);
    }
}