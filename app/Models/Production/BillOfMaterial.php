<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BillOfMaterial extends Model
{
    use HasFactory;

    protected $table = 'bill_of_materials';

    protected $fillable = [
        'bom_number',
        'name',
        'description',
        'external_reference',
        'output_item_id', // NEW
        'is_active',
        'created_by',
    ];

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
     * Get the versions for the BOM.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(BomVersion::class, 'bill_of_material_id');
    }

    /**
     * Get the current version of the BOM.
     */
    public function currentVersion(): HasOne
    {
        return $this->hasOne(BomVersion::class, 'bill_of_material_id')
            ->where('is_current', true);
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
     * Get all items in the current version.
     */
    public function items()
    {
        return $this->hasManyThrough(
            BomItem::class,
            BomVersion::class,
            'bill_of_material_id',
            'bom_version_id',
            'id',
            'id'
        )->where('bom_versions.is_current', true);
    }

    /**
     * Scope for active BOMs.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Create a new version of the BOM.
     */
    public function createVersion($revisionNotes = null, $publishedBy = null)
    {
        $lastVersion = $this->versions()->orderBy('version_number', 'desc')->first();
        $versionNumber = $lastVersion ? $lastVersion->version_number + 1 : 1;

        // First version should be current by default
        $isCurrent = !$lastVersion;

        return $this->versions()->create([
            'version_number' => $versionNumber,
            'revision_notes' => $revisionNotes,
            'published_at' => now(),
            'published_by' => $publishedBy ?? auth()->id(),
            'is_current' => $isCurrent,
        ]);
    }

    /**
     * Set a version as current.
     */
    public function setCurrentVersion(BomVersion $version)
    {
        // Deactivate all other versions
        $this->versions()->update(['is_current' => false]);
        
        // Activate the specified version
        $version->update(['is_current' => true]);
    }

    /**
     * Ensure single root item in versions.
     */
    public function ensureSingleRootItem(BomVersion $version): void
    {
        $rootItems = $version->items()
            ->whereNull('parent_item_id')
            ->count();

        if ($rootItems > 1) {
            throw new \Exception('BOM version cannot have multiple root items');
        }

        if ($rootItems === 1) {
            $rootItem = $version->items()
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