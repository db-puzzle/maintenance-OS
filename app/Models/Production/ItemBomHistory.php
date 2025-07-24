<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemBomHistory extends Model
{
    protected $table = 'item_bom_history';

    protected $fillable = [
        'item_id',
        'bill_of_material_id',
        'effective_from',
        'effective_to',
        'change_reason',
        'change_order_number',
        'approved_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    // Relationships
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopeEffectiveOn($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>', $date);
            });
    }

    public function scopeCurrent($query)
    {
        return $query->whereNull('effective_to');
    }

    // Helper methods
    public function isEffective(): bool
    {
        $now = now();
        return $this->effective_from <= $now && 
               ($this->effective_to === null || $this->effective_to > $now);
    }
} 