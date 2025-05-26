<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asset extends Model
{
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
        'photo_path'
    ];

    protected $casts = [
        'manufacturing_year' => 'integer',
        'asset_type_id' => 'integer',
        'plant_id' => 'integer',
        'area_id' => 'integer',
        'sector_id' => 'integer'
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
} 