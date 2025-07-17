<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\WorkOrders\WorkOrderPart;

class Part extends Model
{
    use HasFactory;

    protected $fillable = [
        'part_number',
        'name',
        'description',
        'unit_cost',
        'available_quantity',
        'minimum_quantity',
        'maximum_quantity',
        'location',
        'supplier',
        'manufacturer',
        'active',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'available_quantity' => 'integer',
        'minimum_quantity' => 'integer',
        'maximum_quantity' => 'integer',
        'active' => 'boolean',
    ];

    /**
     * Get the work order parts for the part.
     */
    public function workOrderParts(): HasMany
    {
        return $this->hasMany(WorkOrderPart::class);
    }

    /**
     * Scope a query to only include active parts.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Check if part is below minimum quantity
     */
    public function isBelowMinimum(): bool
    {
        return $this->available_quantity < $this->minimum_quantity;
    }

    /**
     * Check if part is available for the requested quantity
     */
    public function isAvailable(int $quantity): bool
    {
        return $this->available_quantity >= $quantity;
    }

    /**
     * Reserve quantity for a work order
     */
    public function reserve(int $quantity): bool
    {
        if (!$this->isAvailable($quantity)) {
            return false;
        }

        $this->decrement('available_quantity', $quantity);
        return true;
    }

    /**
     * Return quantity to stock
     */
    public function returnToStock(int $quantity): void
    {
        $this->increment('available_quantity', $quantity);
    }
} 