<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        });
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
} 