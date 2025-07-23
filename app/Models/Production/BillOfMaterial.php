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
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

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
     * Get the products using this BOM.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'current_bom_id');
    }

    /**
     * Get the production orders using this BOM.
     */
    public function productionOrders(): HasMany
    {
        return $this->hasMany(ProductionOrder::class, 'bill_of_material_id');
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

        return $this->versions()->create([
            'version_number' => $versionNumber,
            'revision_notes' => $revisionNotes,
            'published_at' => now(),
            'published_by' => $publishedBy ?? auth()->id(),
            'is_current' => false,
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
}