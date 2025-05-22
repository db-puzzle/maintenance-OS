<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipmentType extends Model
{
    protected $table = 'equipment_types';

    protected $fillable = [
        'name',
        'description',
    ];

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class, 'equipment_type_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($equipmentType) {
            if ($equipmentType->equipment()->exists()) {
                throw new \Exception('Não é possível excluir um tipo de equipamento que possui equipamentos vinculados.');
            }
        });
    }
} 