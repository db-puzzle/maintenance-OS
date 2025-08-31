<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnitOfMeasure extends Model
{
    use HasFactory;

    protected $table = 'units_of_measure';

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'uom_type',
        'is_base_unit',
        'base_unit_id',
        'conversion_to_base',
        'decimal_places',
        'is_active',
    ];

    protected $casts = [
        'is_base_unit' => 'boolean',
        'is_active' => 'boolean',
        'conversion_to_base' => 'decimal:10',
        'decimal_places' => 'integer',
    ];

    /**
     * Available UOM types.
     */
    public const UOM_TYPES = [
        'COUNT' => 'Count',
        'MASS' => 'Mass',
        'LENGTH' => 'Length',
        'AREA' => 'Area',
        'VOLUME' => 'Volume',
        'TIME' => 'Time',
    ];

    /**
     * Get the base unit for this UOM.
     */
    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'base_unit_id');
    }

    /**
     * Get the derived units for this base unit.
     */
    public function derivedUnits(): HasMany
    {
        return $this->hasMany(UnitOfMeasure::class, 'base_unit_id');
    }

    /**
     * Check if this UOM can be converted to another UOM.
     */
    public function canConvertTo(UnitOfMeasure $targetUom): bool
    {
        return $this->uom_type === $targetUom->uom_type;
    }

    /**
     * Convert a quantity from this UOM to another UOM.
     *
     * @throws \Exception if conversion is not possible
     */
    public function convertTo(float $quantity, UnitOfMeasure $targetUom): float
    {
        if (! $this->canConvertTo($targetUom)) {
            throw new \Exception("Cannot convert between different UOM types: {$this->uom_type} to {$targetUom->uom_type}");
        }

        // If same UOM, return quantity as-is
        if ($this->id === $targetUom->id) {
            return $quantity;
        }

        // Convert to base unit first
        $baseQuantity = $quantity * $this->conversion_to_base;

        // Then convert from base to target unit
        return $baseQuantity / $targetUom->conversion_to_base;
    }

    /**
     * Format a quantity with the appropriate decimal places.
     */
    public function formatQuantity(float $quantity): string
    {
        return number_format($quantity, $this->decimal_places);
    }

    /**
     * Get display name with symbol.
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->symbol ? "{$this->name} ({$this->symbol})" : $this->name;
    }

    /**
     * Scope for active units.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for units by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('uom_type', $type);
    }

    /**
     * Scope for base units only.
     */
    public function scopeBaseUnits($query)
    {
        return $query->where('is_base_unit', true);
    }
}
