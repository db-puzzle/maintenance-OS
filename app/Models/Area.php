<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    protected $fillable = [
        'name',
        'factory_id'
    ];

    public function factory(): BelongsTo
    {
        return $this->belongsTo(Factory::class);
    }

    public function machines(): HasMany
    {
        return $this->hasMany(Machine::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($area) {
            if ($area->machines()->exists()) {
                throw new \Exception('Não é possível excluir uma área que possui máquinas.');
            }
        });
    }
}
