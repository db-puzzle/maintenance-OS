<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBomHistory extends Model
{
    use HasFactory;

    protected $table = 'product_bom_history';

    protected $fillable = [
        'product_id',
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

    /**
     * Get the product that owns the history.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the BOM.
     */
    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'bill_of_material_id');
    }

    /**
     * Get the user who approved the change.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope for active BOMs on a specific date.
     */
    public function scopeActiveOn($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }

    /**
     * Scope for current active BOMs.
     */
    public function scopeCurrent($query)
    {
        return $query->whereNull('effective_to');
    }

    /**
     * Check if this history entry is active on a given date.
     */
    public function isActiveOn($date)
    {
        return $this->effective_from <= $date && 
               ($this->effective_to === null || $this->effective_to >= $date);
    }

    /**
     * End this history entry (set effective_to date).
     */
    public function endEffectivity($date = null)
    {
        $this->effective_to = $date ?? now()->subDay();
        $this->save();
    }
}