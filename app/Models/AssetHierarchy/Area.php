<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'plant_id',
        'shift_id',
    ];

    protected $casts = [
        'plant_id' => 'integer',
        'shift_id' => 'integer',
    ];

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    public function sectors(): HasMany
    {
        return $this->hasMany(Sector::class);
    }

    public function asset(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($area) {
            if ($area->sectors()->exists()) {
                throw new \Exception('Não é possível excluir uma área que possui setores.');
            }
            if ($area->asset()->exists()) {
                throw new \Exception('Não é possível excluir uma área que possui ativos.');
            }
        });
    }
}
