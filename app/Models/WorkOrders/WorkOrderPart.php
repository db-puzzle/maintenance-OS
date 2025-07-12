<?php

namespace App\Models\WorkOrders;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderPart extends Model
{
    protected $fillable = [
        'work_order_id',
        'part_id',
        'part_number',
        'part_name',
        'estimated_quantity',
        'reserved_quantity',
        'used_quantity',
        'unit_cost',
        'total_cost',
        'status',
        'reserved_at',
        'reserved_by',
        'issued_at',
        'issued_by',
        'used_at',
        'used_by',
        'notes',
    ];

    protected $casts = [
        'estimated_quantity' => 'float',
        'reserved_quantity' => 'float',
        'used_quantity' => 'float',
        'unit_cost' => 'float',
        'total_cost' => 'float',
        'reserved_at' => 'datetime',
        'issued_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    // Relationships
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function reservedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reserved_by');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    // Helper methods
    public function reserve(float $quantity, User $user): void
    {
        $this->update([
            'reserved_quantity' => $quantity,
            'reserved_at' => now(),
            'reserved_by' => $user->id,
            'status' => 'reserved',
        ]);
    }

    public function issue(float $quantity, User $user): void
    {
        $this->update([
            'issued_at' => now(),
            'issued_by' => $user->id,
            'status' => 'issued',
        ]);
    }

    public function use(float $quantity, User $user): void
    {
        $this->update([
            'used_quantity' => $quantity,
            'used_at' => now(),
            'used_by' => $user->id,
            'status' => 'used',
            'total_cost' => $quantity * $this->unit_cost,
        ]);
    }

    public function return(User $user): void
    {
        $this->update([
            'status' => 'returned',
            'notes' => $this->notes . "\nReturned by {$user->name} on " . now()->format('Y-m-d H:i:s'),
        ]);
    }

    // Scopes
    public function scopePlanned($query)
    {
        return $query->where('status', 'planned');
    }

    public function scopeReserved($query)
    {
        return $query->where('status', 'reserved');
    }

    public function scopeUsed($query)
    {
        return $query->where('status', 'used');
    }
}