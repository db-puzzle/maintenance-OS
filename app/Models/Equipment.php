<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipment extends Model
{
    protected $table = 'equipment';

    protected $fillable = [
        'tag',
        'serial_number',
        'equipment_type_id',
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
        'equipment_type_id' => 'integer',
        'plant_id' => 'integer',
        'area_id' => 'integer',
        'sector_id' => 'integer'
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($equipment) {
            // Valida se a área pertence à planta
            if ($equipment->area_id && $equipment->area->plant_id !== $equipment->plant_id) {
                throw new \Exception("A área selecionada não pertence à planta {$equipment->plant->name}");
            }

            // Valida se o setor pertence à área e à planta
            if ($equipment->sector_id) {
                if ($equipment->sector->area_id !== $equipment->area_id) {
                    throw new \Exception("O setor selecionado não pertence à área {$equipment->area->name}");
                }
                if ($equipment->sector->area->plant_id !== $equipment->plant_id) {
                    throw new \Exception("O setor selecionado não pertence à planta {$equipment->plant->name}");
                }
            }
        });
    }

    public function equipmentType(): BelongsTo
    {
        return $this->belongsTo(EquipmentType::class);
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