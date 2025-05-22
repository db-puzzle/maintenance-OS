<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sector extends Model
{
    protected $fillable = [
        'name',
        'area_id'
    ];

    protected $casts = [
        'area_id' => 'integer'
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($sector) {
            if ($sector->equipment()->exists()) {
                throw new \Exception('Não é possível excluir um setor que possui equipamentos.');
            }
        });
    }
} 