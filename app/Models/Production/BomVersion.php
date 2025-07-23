<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BomVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_of_material_id',
        'version_number',
        'revision_notes',
        'published_at',
        'published_by',
        'is_current',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'published_at' => 'datetime',
    ];

    /**
     * Get the BOM that owns the version.
     */
    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'bill_of_material_id');
    }

    /**
     * Get the items for the BOM version.
     */
    public function items(): HasMany
    {
        return $this->hasMany(BomItem::class, 'bom_version_id');
    }

    /**
     * Get the user who published the version.
     */
    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /**
     * Get the root items (items without parent).
     */
    public function rootItems(): HasMany
    {
        return $this->hasMany(BomItem::class, 'bom_version_id')
            ->whereNull('parent_item_id')
            ->orderBy('sequence_number');
    }

    /**
     * Clone this version to create a new version.
     */
    public function cloneToNewVersion($versionNumber, $publishedBy = null)
    {
        $newVersion = $this->replicate(['is_current']);
        $newVersion->version_number = $versionNumber;
        $newVersion->published_at = now();
        $newVersion->published_by = $publishedBy ?? auth()->id();
        $newVersion->is_current = false;
        $newVersion->save();

        // Clone all items
        $itemMapping = [];
        
        // First pass: create all items
        foreach ($this->items as $item) {
            $newItem = $item->replicate(['parent_item_id', 'qr_code', 'qr_generated_at']);
            $newItem->bom_version_id = $newVersion->id;
            $newItem->save();
            $itemMapping[$item->id] = $newItem->id;
        }

        // Second pass: update parent relationships
        foreach ($this->items as $item) {
            if ($item->parent_item_id) {
                BomItem::where('id', $itemMapping[$item->id])
                    ->update(['parent_item_id' => $itemMapping[$item->parent_item_id]]);
            }
        }

        return $newVersion;
    }

    /**
     * Get the total number of items in this version.
     */
    public function getTotalItemsCount()
    {
        return $this->items()->count();
    }

    /**
     * Get items by level.
     */
    public function getItemsByLevel($level)
    {
        return $this->items()->where('level', $level)->orderBy('sequence_number')->get();
    }
}