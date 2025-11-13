<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingOrderFlow extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_order_id',
        'destination_order_id',
        'quantity_transferred',
        'transferred_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quantity_transferred' => 'decimal:2',
        'transferred_at' => 'datetime',
    ];

    /**
     * Get the source manufacturing order.
     */
    public function sourceOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'source_order_id');
    }

    /**
     * Get the destination manufacturing order.
     */
    public function destinationOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'destination_order_id');
    }

    /**
     * Get the user who created this flow record.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get flows for a specific order (either as source or destination).
     */
    public function scopeForOrder($query, int $orderId)
    {
        return $query->where(function ($q) use ($orderId) {
            $q->where('source_order_id', $orderId)
                ->orWhere('destination_order_id', $orderId);
        });
    }

    /**
     * Scope to get flows within a date range.
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transferred_at', [$startDate, $endDate]);
    }

    /**
     * Get the formatted transfer description.
     */
    public function getTransferDescriptionAttribute(): string
    {
        return sprintf(
            '%s units from %s to %s',
            $this->quantity_transferred,
            $this->sourceOrder->order_number,
            $this->destinationOrder->order_number
        );
    }
}
