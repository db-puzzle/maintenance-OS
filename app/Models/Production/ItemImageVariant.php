<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Storage;

class ItemImageVariant extends Model
{
    use HasUuids;
    
    protected $fillable = [
        'item_image_id',
        'variant_type',
        'storage_path',
        'width',
        'height',
        'file_size',
    ];
    
    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'file_size' => 'integer',
    ];
    
    public function itemImage(): BelongsTo
    {
        return $this->belongsTo(ItemImage::class);
    }
    
    public function getUrlAttribute(): string
    {
        return Storage::url($this->storage_path);
    }
}