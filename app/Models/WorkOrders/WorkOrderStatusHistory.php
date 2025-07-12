<?php

namespace App\Models\WorkOrders;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderStatusHistory extends Model
{
    protected $table = 'work_order_status_history';
    
    protected $fillable = [
        'work_order_id',
        'from_status',
        'to_status',
        'changed_by',
        'reason',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public $timestamps = false;

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?: now();
        });
    }

    // Relationships
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    // Helper methods
    public function getDurationInPreviousStatusAttribute(): ?string
    {
        if (!$this->from_status) {
            return null;
        }

        // Get the previous status change
        $previousChange = $this->workOrder->statusHistory()
            ->where('to_status', $this->from_status)
            ->where('created_at', '<', $this->created_at)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$previousChange) {
            // Use work order creation time
            $startTime = $this->workOrder->created_at;
        } else {
            $startTime = $previousChange->created_at;
        }

        $duration = $startTime->diff($this->created_at);
        
        if ($duration->days > 0) {
            return $duration->format('%a days %h hours');
        } elseif ($duration->h > 0) {
            return $duration->format('%h hours %i minutes');
        } else {
            return $duration->format('%i minutes');
        }
    }

    public function isTransitionTo(string $status): bool
    {
        return $this->to_status === $status;
    }

    public function isTransitionFrom(string $status): bool
    {
        return $this->from_status === $status;
    }
}