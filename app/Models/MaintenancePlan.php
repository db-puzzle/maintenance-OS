<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenancePlan extends Model
{
    protected $fillable = ['equipment_id', 'equipment_type_id', 'name', 'description', 'status'];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class)->withDefault();
    }

    public function equipmentType()
    {
        return $this->belongsTo(EquipmentType::class);
    }

    public function routines()
    {
        return $this->hasMany(Routine::class);
    }
} 