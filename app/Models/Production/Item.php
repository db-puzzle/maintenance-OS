<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_number',
        'name',
        'description',
        'item_category_id',
        // 'item_type', // DEPRECATED - now determined by capabilities
        'can_be_sold',
        'can_be_purchased',
        'can_be_manufactured',
        'is_phantom',
        'is_active',
        'status',
        // 'current_bom_id', // REMOVED
        'unit_of_measure',
        'weight',
        'dimensions',
        'list_price',
        'manufacturing_cost',
        'manufacturing_lead_time_days',
        'purchase_price',
        'purchase_lead_time_days',
        'track_inventory',
        'min_stock_level',
        'max_stock_level',
        'reorder_point',
        'preferred_vendor',
        'vendor_item_number',
        'tags',
        'custom_attributes',
        'created_by',
    ];

    protected $casts = [
        'dimensions' => 'array',
        'tags' => 'array',
        'custom_attributes' => 'array',
        'can_be_sold' => 'boolean',
        'can_be_purchased' => 'boolean',
        'can_be_manufactured' => 'boolean',
        'is_phantom' => 'boolean',
        'is_active' => 'boolean',
        'track_inventory' => 'boolean',
        'weight' => 'decimal:4',
        'list_price' => 'decimal:2',
        'manufacturing_cost' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'min_stock_level' => 'decimal:2',
        'max_stock_level' => 'decimal:2',
        'reorder_point' => 'decimal:2',
    ];

    protected $appends = ['primary_image_url'];

    // Relationships
    
    /**
     * Get BOMs that produce this item.
     */
    public function billOfMaterials(): HasMany
    {
        return $this->hasMany(BillOfMaterial::class, 'output_item_id');
    }

    /**
     * Get all images associated with this item.
     */
    public function images(): HasMany
    {
        return $this->hasMany(ItemImage::class)->orderBy('display_order');
    }

    /**
     * Get the primary image for this item.
     */
    public function primaryImage(): BelongsTo
    {
        return $this->belongsTo(ItemImage::class, 'primary_image_id');
    }

    /**
     * Get the primary BOM for this item.
     */
    public function primaryBom(): HasOne
    {
        return $this->hasOne(BillOfMaterial::class, 'output_item_id')
            ->where('is_active', true)
            ->latest();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'item_category_id');
    }

    public function bomHistory(): HasMany
    {
        return $this->hasMany(ItemBomHistory::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bomItems(): HasMany
    {
        return $this->hasMany(BomItem::class);
    }

    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class);
    }

    // Scopes
    public function scopeSellable($query)
    {
        return $query->where('can_be_sold', true)->where('is_active', true);
    }

    public function scopeManufacturable($query)
    {
        return $query->where('can_be_manufactured', true)->where('is_active', true);
    }

    public function scopePurchasable($query)
    {
        return $query->where('can_be_purchased', true)->where('is_active', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('status', 'active');
    }

    // Helper methods
    public function isSellable(): bool
    {
        return $this->can_be_sold && $this->is_active;
    }

    public function isManufacturable(): bool
    {
        return $this->can_be_manufactured && $this->primaryBom !== null;
    }

    public function isPurchasable(): bool
    {
        return $this->can_be_purchased;
    }

    public function hasActiveBom(): bool
    {
        return $this->billOfMaterials()->where('is_active', true)->exists();
    }

    public function getEffectiveBom(?\Carbon\Carbon $date = null): ?BillOfMaterial
    {
        $date = $date ?? now();
        
        $history = $this->bomHistory()
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>', $date);
            })
            ->with('billOfMaterial')
            ->first();

        return $history?->billOfMaterial;
    }

    // Image-related accessors
    
    /**
     * Get the primary image URL for this item.
     */
    public function getPrimaryImageUrlAttribute(): ?string
    {
        // Check if the primaryImage relationship is loaded
        if ($this->relationLoaded('primaryImage')) {
            if ($this->primaryImage) {
                return $this->primaryImage->getVariantUrl('medium');
            }
        } else if ($this->primary_image_id) {
            // If we have a primary_image_id but the relationship isn't loaded,
            // load it explicitly
            $primaryImage = $this->primaryImage()->first();
            if ($primaryImage) {
                return $primaryImage->getVariantUrl('medium');
            }
        }
        
        // Fall back to finding the first image marked as primary or just the first image
        $firstImage = $this->images()->where('is_primary', true)->first() 
            ?? $this->images()->first();
        
        return $firstImage ? $firstImage->getVariantUrl('medium') : null;
    }

    /**
     * Get all image URLs for this item.
     */
    public function getImageUrlsAttribute(): array
    {
        // Check if the images relationship is loaded
        if ($this->relationLoaded('images')) {
            return $this->images->map(function ($image) {
                return [
                    'id' => $image->id,
                    'url' => $image->url,
                    'thumbnail' => $image->getVariantUrl('thumbnail'),
                    'medium' => $image->getVariantUrl('medium'),
                    'is_primary' => $image->is_primary,
                    'caption' => $image->caption,
                ];
            })->toArray();
        }
        
        // If not loaded, query the images
        return $this->images()->get()->map(function ($image) {
            return [
                'id' => $image->id,
                'url' => $image->url,
                'thumbnail' => $image->getVariantUrl('thumbnail'),
                'medium' => $image->getVariantUrl('medium'),
                'is_primary' => $image->is_primary,
                'caption' => $image->caption,
            ];
        })->toArray();
    }

    // Business logic
    public function canBeDeleted(): bool
    {
        // Check if item is used in any active BOMs
        $usedInBoms = BomItem::where('item_id', $this->id)
            ->whereHas('bomVersion', function ($query) {
                $query->where('is_current', true);
            })
            ->exists();

        // Check if item has open production orders
        $hasOpenOrders = $this->manufacturingOrders()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        return !$usedInBoms && !$hasOpenOrders;
    }

    public function updateBom(BillOfMaterial $bom, array $changeData = []): ItemBomHistory
    {
        // End current BOM history
        $currentHistory = $this->bomHistory()
            ->whereNull('effective_to')
            ->first();

        if ($currentHistory) {
            $currentHistory->update(['effective_to' => now()]);
        }

        // Create new history record
        $history = $this->bomHistory()->create([
            'bill_of_material_id' => $bom->id,
            'effective_from' => now(),
            'change_reason' => $changeData['reason'] ?? null,
            'change_order_number' => $changeData['change_order'] ?? null,
            'approved_by' => auth()->id(),
        ]);

        return $history;
    }
} 