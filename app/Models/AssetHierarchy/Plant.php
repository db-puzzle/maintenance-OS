<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Plant extends Model
{
    protected $fillable = [
        'name',
        'street',
        'number',
        'city',
        'state',
        'zip_code',
        'gps_coordinates'
    ];

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($plant) {
            if ($plant->areas()->exists()) {
                throw new \Exception('Não é possível excluir uma planta que possui áreas.');
            }
            if ($plant->asset()->exists()) {
                throw new \Exception('Não é possível excluir uma planta que possui ativos.');
            }
        });
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }

    public function sectors(): HasManyThrough
    {
        return $this->hasManyThrough(Sector::class, Area::class);
    }

    public function asset(): HasMany
    {
        return $this->hasMany(Asset::class);
    }
} 