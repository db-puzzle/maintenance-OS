<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Factory extends Model
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

        static::deleting(function ($factory) {
            if ($factory->areas()->exists()) {
                throw new \Exception('Não é possível excluir uma fábrica que possui áreas.');
            }
        });
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
} 