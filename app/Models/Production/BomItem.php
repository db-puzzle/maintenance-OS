<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BomItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'bom_version_id',
        'parent_item_id',
        'item_id', // Now references items table
        'quantity',
        'unit_of_measure',
        'level',
        'sequence_number',
        'reference_designators',
        'thumbnail_path',
        'model_file_path',
        'bom_notes',
        'assembly_instructions',
        'qr_code',
        'qr_generated_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'bom_notes' => 'array',
        'assembly_instructions' => 'array',
        'qr_generated_at' => 'datetime',
    ];

    /**
     * Get the item from the item master.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the BOM version that owns the item.
     */
    public function bomVersion(): BelongsTo
    {
        return $this->belongsTo(BomVersion::class, 'bom_version_id');
    }

    /**
     * Get the parent item.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(BomItem::class, 'parent_item_id');
    }

    /**
     * Get the child items.
     */
    public function children(): HasMany
    {
        return $this->hasMany(BomItem::class, 'parent_item_id')
            ->orderBy('sequence_number');
    }

    /**
     * Get the routing for this item.
     */
    public function routing(): HasOne
    {
        return $this->hasOne(ManufacturingRoute::class, 'bom_item_id');
    }

    /**
     * Get shipment items containing this BOM item.
     */
    public function shipmentItems(): HasMany
    {
        return $this->hasMany(ShipmentItem::class, 'bom_item_id');
    }

    /**
     * Get the effective routing (own or inherited).
     */
    public function getEffectiveRouting(): ?ManufacturingRoute
    {
        // Direct routing
        if ($this->routing && $this->routing->is_active) {
            return $this->routing;
        }
        
        // Inherited routing
        if ($this->parent) {
            return $this->parent->getEffectiveRouting();
        }
        
        return null;
    }

    /**
     * Check if this item has routing (own or inherited).
     */
    public function hasRouting(): bool
    {
        return $this->getEffectiveRouting() !== null;
    }

    /**
     * Check if production is complete for this item.
     */
    public function isProductionComplete(): bool
    {
        $routing = $this->getEffectiveRouting();
        
        if (!$routing) {
            return true; // No routing means no production needed
        }

        // Check if all routing steps are complete
        // This would need to check production executions
        return false; // Placeholder - implement based on production tracking
    }

    /**
     * Check if production can start (all children complete).
     */
    public function canStartProduction(): bool
    {
        // Check all children have completed routing
        foreach ($this->children as $child) {
            if ($child->hasRouting() && !$child->isProductionComplete()) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get all descendants (recursive).
     */
    public function descendants()
    {
        $descendants = collect();
        
        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->descendants());
        }
        
        return $descendants;
    }

    /**
     * Get all ancestors (recursive).
     */
    public function ancestors()
    {
        $ancestors = collect();
        $parent = $this->parent;
        
        while ($parent) {
            $ancestors->push($parent);
            $parent = $parent->parent;
        }
        
        return $ancestors;
    }

    /**
     * Calculate total quantity needed based on parent quantities.
     */
    public function calculateTotalQuantity($rootQuantity = 1)
    {
        $totalQuantity = $this->quantity * $rootQuantity;
        
        if ($this->parent) {
            return $this->parent->calculateTotalQuantity($totalQuantity);
        }
        
        return $totalQuantity;
    }

    /**
     * Get the item number from the related item.
     */
    public function getItemNumber(): string
    {
        return $this->item->item_number;
    }

    /**
     * Get the item name from the related item.
     */
    public function getItemName(): string
    {
        return $this->item->name;
    }

    /**
     * Check if the item is sellable.
     */
    public function isSellable(): bool
    {
        return $this->item->can_be_sold;
    }

    /**
     * Get the total cost for this BOM item.
     */
    public function getTotalCost(): float
    {
        $itemCost = $this->item->cost ?? 0;
        $totalCost = $itemCost * $this->quantity;

        // Add costs of all children
        foreach ($this->children as $child) {
            $totalCost += $child->getTotalCost();
        }

        return $totalCost;
    }

    /**
     * Scope for items at a specific level.
     */
    public function scopeAtLevel($query, $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope for items with QR codes.
     */
    public function scopeWithQrCode($query)
    {
        return $query->whereNotNull('qr_code');
    }
}