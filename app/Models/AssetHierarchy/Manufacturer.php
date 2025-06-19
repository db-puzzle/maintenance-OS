<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manufacturer extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'website',
        'email',
        'phone',
        'country',
        'notes',
    ];

    /**
     * Get the assets for the manufacturer.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    /**
     * Get the asset count attribute.
     */
    public function getAssetCountAttribute(): int
    {
        return $this->assets()->count();
    }
}
