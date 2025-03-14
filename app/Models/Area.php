<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    protected $fillable = [
        'name',
        'factory_id',
        'parent_area_id'
    ];

    public function factory(): BelongsTo
    {
        return $this->belongsTo(Factory::class);
    }

    public function parentArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'parent_area_id');
    }

    public function childAreas(): HasMany
    {
        return $this->hasMany(Area::class, 'parent_area_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($area) {
            if ($area->factory_id && $area->parent_area_id) {
                throw new \Exception('Uma área não pode pertencer a uma fábrica e a outra área simultaneamente.');
            }
        });

        static::deleting(function ($area) {
            if ($area->childAreas()->exists()) {
                throw new \Exception('Não é possível excluir uma área que possui subáreas.');
            }
        });
    }
}
