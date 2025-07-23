<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_number',
        'name',
        'description',
        'category',
        'product_type',
        'status',
        'current_bom_id',
        'unit_of_measure',
        'weight',
        'dimensions',
        'list_price',
        'cost',
        'lead_time_days',
        'tags',
        'custom_attributes',
        'created_by',
    ];

    protected $casts = [
        'dimensions' => 'array',
        'tags' => 'array',
        'custom_attributes' => 'array',
        'weight' => 'decimal:4',
        'list_price' => 'decimal:2',
        'cost' => 'decimal:2',
    ];

    /**
     * Get the current BOM for the product.
     */
    public function currentBom(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'current_bom_id');
    }

    /**
     * Get the BOM history for the product.
     */
    public function bomHistory(): HasMany
    {
        return $this->hasMany(ProductBomHistory::class);
    }

    /**
     * Get the production orders for the product.
     */
    public function productionOrders(): HasMany
    {
        return $this->hasMany(ProductionOrder::class);
    }

    /**
     * Get the user who created the product.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the active BOM for a specific date.
     */
    public function getBomForDate($date)
    {
        return $this->bomHistory()
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            })
            ->first();
    }

    /**
     * Scope for active products.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for manufactured products.
     */
    public function scopeManufactured($query)
    {
        return $query->where('product_type', 'manufactured');
    }

    /**
     * Scope for purchased products.
     */
    public function scopePurchased($query)
    {
        return $query->where('product_type', 'purchased');
    }
}