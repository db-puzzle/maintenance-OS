<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use Illuminate\Database\Eloquent\Model;

class MaintenancePlan extends Model
{
    protected $fillable = ['asset_id', 'name', 'description', 'status'];

    public function asset()
    {
        return $this->belongsTo(Asset::class)->withDefault();
    }

    public function routines()
    {
        return $this->hasMany(Routine::class);
    }
    
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($maintenancePlan) {
            // Verifica se o plano está sendo definido como ativo sem um ativo associado
            if ($maintenancePlan->status === 'Active' && !$maintenancePlan->asset_id) {
                throw new \Exception('Um plano de manutenção só pode ser ativo se estiver associado a um ativo específico.');
            }
        });
    }
} 