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
        'item_number',
        'name',
        'description',
        'item_type',
        'quantity',
        'unit_of_measure',
        'level',
        'sequence_number',
        'thumbnail_path',
        'model_file_path',
        'material',
        'weight',
        'dimensions',
        'custom_attributes',
        'qr_code',
        'qr_generated_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'weight' => 'decimal:4',
        'dimensions' => 'array',
        'custom_attributes' => 'array',
        'qr_generated_at' => 'datetime',
    ];

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
        return $this->hasOne(ProductionRouting::class, 'bom_item_id');
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
    public function getEffectiveRouting(): ?ProductionRouting
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
     * Scope for items of a specific type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('item_type', $type);
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