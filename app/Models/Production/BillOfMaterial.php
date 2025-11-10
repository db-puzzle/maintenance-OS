<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillOfMaterial extends Model
{
    use HasFactory;

    protected $table = 'bill_of_materials';

    protected $fillable = [
        'bom_number',
        'name',
        'description',
        'external_reference',
        'output_item_id',
        'is_active',
        'created_by',
    ];

    /**
     * The attributes that should not be mass assignable on update.
     * This prevents output_item_id from being changed after creation.
     */
    protected static function boot()
    {
        parent::boot();

        static::updating(function ($bom) {
            // Prevent output_item_id from being changed after creation
            if ($bom->isDirty('output_item_id')) {
                $bom->output_item_id = $bom->getOriginal('output_item_id');
            }
        });
    }

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the item this BOM produces.
     */
    public function outputItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'output_item_id');
    }

    /**
     * Get all items in the BOM.
     */
    public function items(): HasMany
    {
        return $this->hasMany(BomItem::class, 'bill_of_material_id');
    }

    /**
     * Get the root items (items without parent).
     */
    public function rootItems(): HasMany
    {
        return $this->hasMany(BomItem::class, 'bill_of_material_id')
            ->whereNull('parent_item_id')
            ->orderBy('sequence_number');
    }

    /**
     * Get the production orders using this BOM.
     */
    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class, 'bill_of_material_id');
    }

    /**
     * Get the user who created the BOM.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active BOMs.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Ensure single root item.
     */
    public function ensureSingleRootItem(): void
    {
        $rootItems = $this->items()
            ->whereNull('parent_item_id')
            ->count();

        if ($rootItems > 1) {
            throw new \Exception('BOM cannot have multiple root items');
        }

        if ($rootItems === 1) {
            $rootItem = $this->items()
                ->whereNull('parent_item_id')
                ->first();

            if ($rootItem->item_id !== $this->output_item_id) {
                throw new \Exception('Root item must match BOM output item');
            }
        }
    }

    /**
     * Generate a unique BOM number in the format BOM-YYMM-XXXXX.
     */
    public static function generateBomNumber(): string
    {
        $year = now()->format('y'); // 2-digit year
        $month = now()->format('m'); // 2-digit month

        // Find the last BOM created in the current year and month
        $lastBom = static::whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastBom) {
            // Extract the sequence number (last 5 digits after 'BOM-YYMM-')
            $sequence = intval(substr($lastBom->bom_number, -5)) + 1;
        } else {
            // No BOMs for current year and month, start at 1
            $sequence = 1;
        }

        return sprintf('BOM-%s%s-%05d', $year, $month, $sequence);
    }
}
