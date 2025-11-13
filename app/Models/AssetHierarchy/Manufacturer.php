<?php

namespace App\Models\AssetHierarchy;

use App\Models\Production\WorkCell;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manufacturer extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'website',
        'email',
        'phone',
        'country',
        'notes',
    ];

    /**
     * Get the assets for the manufacturer.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    /**
     * Get the work cells for the manufacturer (external work cells).
     */
    public function workCells(): HasMany
    {
        return $this->hasMany(WorkCell::class);
    }

    /**
     * Get all manufacturing steps assigned to this manufacturer.
     */
    public function manufacturingSteps(): HasMany
    {
        return $this->hasMany(\App\Models\Production\ManufacturingStep::class);
    }

    /**
     * Get active steps at this manufacturer.
     */
    public function activeSteps()
    {
        return $this->manufacturingSteps()
            ->whereIn('external_status', ['shipped', 'in_process'])
            ->with(['manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Get steps awaiting shipment to this manufacturer.
     */
    public function stepsAwaitingShipment()
    {
        return $this->manufacturingSteps()
            ->where('external_status', 'awaiting_shipment')
            ->with(['manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Get the asset count attribute.
     */
    public function getAssetCountAttribute(): int
    {
        return $this->assets()->count();
    }
}
