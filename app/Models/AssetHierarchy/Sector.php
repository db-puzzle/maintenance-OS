<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sector extends Model
{
    protected $fillable = [
        'name',
        'area_id',
        'shift_id',
    ];

    protected $casts = [
        'area_id' => 'integer',
        'shift_id' => 'integer',
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
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

        static::deleting(function ($sector) {
            if ($sector->asset()->exists()) {
                throw new \Exception('Não é possível excluir um setor que possui ativos.');
            }
        });
    }
}
