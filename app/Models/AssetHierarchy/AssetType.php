<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetType extends Model
{
    protected $table = 'asset_types';

    protected $fillable = [
        'name',
        'description',
    ];

    public function asset(): HasMany
    {
        return $this->hasMany(Asset::class, 'asset_type_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($assetType) {
            if ($assetType->asset()->exists()) {
                throw new \Exception('Não é possível excluir um tipo de ativo que possui ativos vinculados.');
            }
        });
    }
}
