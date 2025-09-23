<?php

namespace App\Traits;

use App\Services\MediaDiskResolver;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

trait HasMediaTrait
{
    use InteractsWithMedia;

    /**
     * Future-proof: This method will use tenant context when implemented.
     */
    public function getMediaStoragePath(): string
    {
        // Single-tenant for now, but structure supports future tenant isolation
        // Future: return "tenant-{$this->tenant_id}/media";
        return 'media';
    }

    /**
     * Common media conversions for all models.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        // Thumbnail for grids and lists
        $this->addMediaConversion('thumb')
            ->width(150)
            ->height(150)
            ->sharpen(10)
            ->optimize()
            ->nonQueued() // Generate immediately for better UX
            ->performOnCollections('images');

        // Preview for cards and modals
        $this->addMediaConversion('preview')
            ->width(400)
            ->height(400)
            ->quality(90)
            ->optimize()
            ->performOnCollections('images');

        // Large optimized version
        $this->addMediaConversion('large')
            ->width(1200)
            ->height(1200)
            ->quality(85)
            ->optimize()
            ->performOnCollections('images', 'documents');
    }

    /**
     * Get the disk for a specific collection.
     */
    protected function getMediaDisk(string $collection): string
    {
        return MediaDiskResolver::getDiskForCollection($collection);
    }

    /**
     * Add media with automatic disk selection.
     */
    public function addMediaWithDiskSelection($file, string $collection)
    {
        $disk = $this->getMediaDisk($collection);

        return $this->addMedia($file)
            ->withCustomProperties([
                'uploaded_by' => auth()->id(),
                'uploaded_at' => now()->toIso8601String(),
                'ip_address' => request()->ip(),
            ])
            ->toMediaCollection($collection, $disk);
    }

    /**
     * Get the primary media for a collection.
     */
    public function getPrimaryMedia(string $collection): ?Media
    {
        return $this->getMedia($collection)
            ->first(function (Media $media) {
                return $media->getCustomProperty('is_primary', false);
            }) ?? $this->getFirstMedia($collection);
    }

    /**
     * Get the primary media URL for a collection.
     */
    public function getPrimaryMediaUrl(string $collection, string $conversion = ''): string
    {
        $media = $this->getPrimaryMedia($collection);

        if (! $media) {
            return $this->getFallbackMediaUrl($collection);
        }

        return $conversion ? $media->getUrl($conversion) : $media->getUrl();
    }

    /**
     * Set a media item as primary for its collection.
     */
    public function setPrimaryMedia(Media $media): void
    {
        // Remove primary flag from other media in the same collection
        $this->getMedia($media->collection_name)
            ->each(function (Media $item) {
                $item->setCustomProperty('is_primary', false);
                $item->save();
            });

        // Set this media as primary
        $media->setCustomProperty('is_primary', true);
        $media->save();
    }

    /**
     * Get fallback URL when no media exists.
     */
    protected function getFallbackMediaUrl(string $collection): string
    {
        $fallbacks = [
            'images' => '/images/no-image.jpg',
            'avatars' => '/images/default-avatar.png',
            'documents' => '/images/no-document.png',
        ];

        return $fallbacks[$collection] ?? '/images/no-file.png';
    }

    /**
     * Check if the model has media in a collection.
     */
    public function hasMediaInCollection(string $collection): bool
    {
        return $this->hasMedia($collection);
    }

    /**
     * Get media count for a collection.
     */
    public function getMediaCount(?string $collection = null): int
    {
        return $collection
            ? $this->getMedia($collection)->count()
            : $this->media->count();
    }
}
