<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Equipment;
use Illuminate\Database\Eloquent\Model;

class MaintenancePlan extends Model
{
    protected $fillable = ['equipment_id', 'name', 'description', 'status'];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class)->withDefault();
    }

    public function routines()
    {
        return $this->hasMany(Routine::class);
    }
    
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($maintenancePlan) {
            // Verifica se o plano está sendo definido como ativo sem um equipamento associado
            if ($maintenancePlan->status === 'Active' && !$maintenancePlan->equipment_id) {
                throw new \Exception('Um plano de manutenção só pode ser ativo se estiver associado a um equipamento específico.');
            }
        });
    }
} 