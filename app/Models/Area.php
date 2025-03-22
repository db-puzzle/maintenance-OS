<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    protected $fillable = [
        'name',
        'plant_id'
    ];

    protected $casts = [
        'plant_id' => 'integer'
    ];

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($area) {
            if ($area->equipment()->exists()) {
                throw new \Exception('Não é possível excluir uma área que possui equipamentos.');
            }
        });
    }
}
