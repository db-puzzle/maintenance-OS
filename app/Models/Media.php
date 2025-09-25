<?php

namespace App\Models;

use App\Services\Media\BlurHashService;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\MediaCollections\Models\Media as BaseMedia;

class Media extends BaseMedia
{
    protected $fillable = [
        'model_type',
        'model_id',
        'uuid',
        'collection_name',
        'name',
        'file_name',
        'mime_type',
        'disk',
        'conversions_disk',
        'size',
        'manipulations',
        'custom_properties',
        'generated_conversions',
        'responsive_images',
        'order_column',
        'created_at',
        'updated_at',
        // Advanced fields
        'file_hash',
        'perceptual_hash',
        'blurhash',
        'dominant_color',
        'width',
        'height',
        'aspect_ratio',
        'upload_method',
        'original_size',
        'compression_ratio',
        'access_count',
        'last_accessed_at',
        'duplicate_of',
        'duplicate_type',
    ];

    protected $casts = [
        'manipulations' => 'array',
        'custom_properties' => 'array',
        'generated_conversions' => 'array',
        'responsive_images' => 'array',
        'size' => 'integer',
        'order_column' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'aspect_ratio' => 'float',
        'original_size' => 'integer',
        'compression_ratio' => 'float',
        'access_count' => 'integer',
        'last_accessed_at' => 'datetime',
        'duplicate_of' => 'integer',
    ];

    /**
     * Track who uploaded the file.
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'custom_properties->uploaded_by');
    }

    /**
     * Get the original media if this is a duplicate.
     */
    public function originalMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'duplicate_of');
    }

    /**
     * Get all duplicates of this media.
     */
    public function duplicates(): HasMany
    {
        return $this->hasMany(Media::class, 'duplicate_of');
    }

    /**
     * Get the dominant color from custom properties.
     */
    public function getDominantColorAttribute(): ?string
    {
        return $this->getCustomProperty('dominant_color');
    }

    /**
     * Get the File Hash - first check database column, then custom properties for backward compatibility.
     */
    public function getFileHashAttribute(): ?string
    {
        // First check if we have it in the database column
        if (! empty($this->attributes['file_hash'])) {
            return $this->attributes['file_hash'];
        }

        // Fall back to custom properties for backward compatibility
        return $this->getCustomProperty('file_hash');
    }

    /**
     * Get the BlurHash - first check database column, then custom properties for backward compatibility.
     */
    public function getBlurhashAttribute(): ?string
    {
        // First check if we have it in the database column
        if (! empty($this->attributes['blurhash'])) {
            return $this->attributes['blurhash'];
        }

        // Fall back to custom properties for backward compatibility
        return $this->getCustomProperty('blurhash');
    }

    /**
     * Get the aspect ratio from custom properties.
     */
    public function getAspectRatioAttribute(): ?float
    {
        return $this->getCustomProperty('aspect_ratio');
    }

    /**
     * Check if this is a primary media item.
     */
    public function getIsPrimaryAttribute(): bool
    {
        return $this->getCustomProperty('is_primary', false);
    }

    /**
     * Future-proof: Add tenant scoping here when needed.
     */
    public function scopeForCurrentContext($query)
    {
        // Currently no-op, but will add tenant scoping later
        // Example future implementation:
        // if (app()->bound('current_tenant')) {
        //     $query->where('custom_properties->tenant_id', app('current_tenant')->id);
        // }
        return $query;
    }

    /**
     * Scope to get only public media.
     */
    public function scopePublic($query)
    {
        $publicCollections = ['images', 'public-documents'];

        return $query->whereIn('collection_name', $publicCollections);
    }

    /**
     * Scope to get only private media.
     */
    public function scopePrivate($query)
    {
        $privateCollections = ['attachments', 'exports', 'financial-documents', 'employee-files'];

        return $query->whereIn('collection_name', $privateCollections);
    }

    /**
     * Scope to get media by collection.
     */
    public function scopeInCollection($query, string $collection)
    {
        return $query->where('collection_name', $collection);
    }

    /**
     * Determine if the media is an image.
     */
    public function getIsImageAttribute(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Determine if the media is a document.
     */
    public function getIsDocumentAttribute(): bool
    {
        $documentMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
        ];

        return in_array($this->mime_type, $documentMimeTypes);
    }

    /**
     * Get the media's file extension.
     */
    public function getExtensionAttribute(): string
    {
        return pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /**
     * Get a formatted file size.
     */
    public function getHumanReadableSizeAttribute(): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $size = $this->size;
        $unit = 0;

        while ($size >= 1024 && $unit < count($units) - 1) {
            $size /= 1024;
            $unit++;
        }

        return round($size, 2) . ' ' . $units[$unit];
    }

    /**
     * Scope for non-duplicate media.
     */
    public function scopeOriginals($query)
    {
        return $query->whereNull('duplicate_of');
    }

    /**
     * Get blurhash data URL.
     */
    public function getBlurHashDataUrlAttribute(): ?string
    {
        if (! $this->blurhash) {
            return null;
        }

        $blurHashService = app(BlurHashService::class);

        return $blurHashService->decodeBlurHash($this->blurhash);
    }

    /**
     * Track access to the media.
     */
    public function trackAccess(): void
    {
        $this->increment('access_count');
        $this->last_accessed_at = now();
        $this->save();
    }

    /**
     * Override getUrl to return authenticated API routes instead of direct storage URLs.
     * This ensures all media access goes through proper authentication.
     */
    public function getUrl(string $conversionName = ''): string
    {
        // If it's a conversion, return the conversion API route
        if ($conversionName !== '' && $this->hasGeneratedConversion($conversionName)) {
            return route('api.media.show-conversion', [$this->id, $conversionName]);
        }

        // Return the original media API route
        return route('api.media.show', $this->id);
    }

    /**
     * Get the download URL for this media.
     */
    public function getDownloadUrl(): string
    {
        return route('api.media.download', $this->id);
    }

    /**
     * Override toArray to ensure URLs are properly generated for API responses.
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Add properly formatted URLs
        $array['original_url'] = $this->getUrl();
        $array['download_url'] = $this->getDownloadUrl();

        // Add conversion URLs if they exist
        if ($this->generated_conversions) {
            $array['conversion_urls'] = [];
            foreach (array_keys($this->generated_conversions) as $conversion) {
                $array['conversion_urls'][$conversion] = $this->getUrl($conversion);
            }

            // Add specific conversion URLs for backwards compatibility
            if (isset($this->generated_conversions['preview'])) {
                $array['preview_url'] = $this->getUrl('preview');
            }
            if (isset($this->generated_conversions['thumb'])) {
                $array['thumb_url'] = $this->getUrl('thumb');
            }
        }

        // Add responsive images with proper URLs
        if ($this->responsive_images) {
            $array['responsive_images'] = $this->responsive_images;

            // Update URLs in responsive images
            foreach ($array['responsive_images'] as $conversion => &$data) {
                if (isset($data['urls']) && is_array($data['urls'])) {
                    $data['urls'] = array_map(function ($url) {
                        // Extract the filename from the URL and generate proper API route
                        // This is a simplified approach - you might need to adjust based on your setup
                        return $this->getUrl($conversion);
                    }, $data['urls']);
                }
            }
        }

        return $array;
    }
}
