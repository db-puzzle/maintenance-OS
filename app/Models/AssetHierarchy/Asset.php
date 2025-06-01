<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Maintenance\Routine;
use App\Traits\AssetRuntimeCalculator;

class Asset extends Model
{
    use AssetRuntimeCalculator;
    
    protected $table = 'assets';

    protected $fillable = [
        'tag',
        'serial_number',
        'asset_type_id',
        'description',
        'manufacturer',
        'manufacturing_year',
        'plant_id',
        'area_id',
        'sector_id',
        'shift_id',
        'photo_path'
    ];

    protected $casts = [
        'manufacturing_year' => 'integer',
        'asset_type_id' => 'integer',
        'plant_id' => 'integer',
        'area_id' => 'integer',
        'sector_id' => 'integer',
        'shift_id' => 'integer'
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($asset) {
            // Valida se a área pertence à planta
            if ($asset->area_id && $asset->area->plant_id !== $asset->plant_id) {
                throw new \Exception("A área selecionada não pertence à planta {$asset->plant->name}");
            }

            // Valida se o setor pertence à área e à planta
            if ($asset->sector_id) {
                if ($asset->sector->area_id !== $asset->area_id) {
                    throw new \Exception("O setor selecionado não pertence à área {$asset->area->name}");
                }
                if ($asset->sector->area->plant_id !== $asset->plant_id) {
                    throw new \Exception("O setor selecionado não pertence à planta {$asset->plant->name}");
                }
            }
        });
    }

    public function assetType(): BelongsTo
    {
        return $this->belongsTo(AssetType::class);
    }

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }
    
    public function routines(): BelongsToMany
    {
        return $this->belongsToMany(Routine::class, 'asset_routine')
            ->withTimestamps();
    }

    /**
     * Get the runtime measurements for the asset.
     */
    public function runtimeMeasurements(): HasMany
    {
        return $this->hasMany(AssetRuntimeMeasurement::class)->orderBy('measurement_datetime', 'desc');
    }

    /**
     * Get the latest runtime measurement.
     */
    public function latestRuntimeMeasurement()
    {
        return $this->hasOne(AssetRuntimeMeasurement::class)->latestOfMany('measurement_datetime');
    }

    /**
     * Get the current runtime hours from the latest measurement plus accumulated shift hours.
     */
    public function getCurrentRuntimeHoursAttribute(): float
    {
        return $this->calculateCurrentRuntime();
    }

    /**
     * Get the previous runtime measurement (second to last).
     */
    public function previousRuntimeMeasurement()
    {
        return $this->runtimeMeasurements()
            ->skip(1)
            ->first();
    }
} 