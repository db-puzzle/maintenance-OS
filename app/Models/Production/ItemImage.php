<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Storage;

class ItemImage extends Model
{
    use HasUuids;
    
    protected $fillable = [
        'item_id',
        'filename',
        'storage_path',
        'mime_type',
        'file_size',
        'width',
        'height',
        'is_primary',
        'display_order',
        'alt_text',
        'caption',
        'metadata',
        'uploaded_by',
    ];
    
    protected $casts = [
        'is_primary' => 'boolean',
        'metadata' => 'array',
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'display_order' => 'integer',
    ];
    
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
    
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
    
    public function variants(): HasMany
    {
        return $this->hasMany(ItemImageVariant::class);
    }
    
    public function getUrlAttribute(): string
    {
        return Storage::url($this->storage_path);
    }
    
    public function getVariantUrl(string $variant = 'medium'): string
    {
        $variant = $this->variants()->where('variant_type', $variant)->first();
        return $variant ? Storage::url($variant->storage_path) : $this->url;
    }
    
    protected static function booted()
    {
        static::creating(function ($image) {
            if ($image->is_primary) {
                static::where('item_id', $image->item_id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
            
            // Set display order
            if (!$image->display_order) {
                $maxOrder = static::where('item_id', $image->item_id)->max('display_order') ?? 0;
                $image->display_order = $maxOrder + 1;
            }
        });
        
        static::updating(function ($image) {
            if ($image->isDirty('is_primary') && $image->is_primary) {
                static::where('item_id', $image->item_id)
                    ->where('id', '!=', $image->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
        });
        
        static::deleted(function ($image) {
            // Clean up physical files
            Storage::delete($image->storage_path);
            foreach ($image->variants as $variant) {
                Storage::delete($variant->storage_path);
            }
        });
    }
}