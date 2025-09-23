<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Cache;

class MediaCacheService
{
    /**
     * Cache duration in seconds.
     */
    protected int $cacheDuration = 3600; // 1 hour

    /**
     * Cache media URLs for better performance.
     */
    public function getMediaUrl(Media $media, string $conversion = ''): string
    {
        $cacheKey = $this->getUrlCacheKey($media->id, $conversion);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($media, $conversion) {
            return $conversion
                ? $media->getUrl($conversion)
                : $media->getUrl();
        });
    }

    /**
     * Cache temporary URLs.
     */
    public function getTemporaryUrl(Media $media, int $minutes = 5): string
    {
        $cacheKey = $this->getTempUrlCacheKey($media->id);
        $cacheDuration = max(60, ($minutes - 1) * 60); // Cache for 1 minute less than URL validity

        return Cache::remember($cacheKey, $cacheDuration, function () use ($media, $minutes) {
            return $media->getTemporaryUrl(now()->addMinutes($minutes));
        });
    }

    /**
     * Clear cache when media is updated.
     */
    public function clearMediaCache(Media $media): void
    {
        // Clear base URL cache
        Cache::forget($this->getUrlCacheKey($media->id));

        // Clear conversion URL caches
        foreach ($media->getGeneratedConversions() as $conversion => $generated) {
            if ($generated) {
                Cache::forget($this->getUrlCacheKey($media->id, $conversion));
            }
        }

        // Clear temporary URL cache
        Cache::forget($this->getTempUrlCacheKey($media->id));

        // Clear collection cache for the model
        $this->clearModelCollectionCache($media->model_type, $media->model_id, $media->collection_name);
    }

    /**
     * Cache media collection for a model.
     */
    public function getModelMediaCollection($model, string $collection)
    {
        $cacheKey = $this->getCollectionCacheKey(
            get_class($model),
            $model->getKey(),
            $collection
        );

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($model, $collection) {
            return $model->getMedia($collection)->map(function (Media $media) {
                return [
                    'id' => $media->uuid,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'mime_type' => $media->mime_type,
                    'size' => $media->size,
                    'human_readable_size' => $media->human_readable_size,
                    'url' => $media->getUrl(),
                    'thumb_url' => $media->hasGeneratedConversion('thumb') ? $media->getUrl('thumb') : null,
                    'preview_url' => $media->hasGeneratedConversion('preview') ? $media->getUrl('preview') : null,
                    'custom_properties' => $media->custom_properties,
                    'is_image' => $media->is_image,
                    'is_primary' => $media->is_primary,
                ];
            });
        });
    }

    /**
     * Clear model collection cache.
     */
    public function clearModelCollectionCache(string $modelType, $modelId, ?string $collection = null): void
    {
        if ($collection) {
            Cache::forget($this->getCollectionCacheKey($modelType, $modelId, $collection));
        } else {
            // Clear all collections for the model
            $pattern = "media_collection:{$modelType}:{$modelId}:*";
            $this->clearCacheByPattern($pattern);
        }
    }

    /**
     * Get cache key for media URL.
     */
    protected function getUrlCacheKey($mediaId, string $conversion = ''): string
    {
        return "media_url:{$mediaId}:{$conversion}";
    }

    /**
     * Get cache key for temporary URL.
     */
    protected function getTempUrlCacheKey($mediaId): string
    {
        return "media_temp_url:{$mediaId}";
    }

    /**
     * Get cache key for model collection.
     */
    protected function getCollectionCacheKey(string $modelType, $modelId, string $collection): string
    {
        return "media_collection:{$modelType}:{$modelId}:{$collection}";
    }

    /**
     * Clear cache by pattern (for Redis/Memcached).
     */
    protected function clearCacheByPattern(string $pattern): void
    {
        // This implementation depends on the cache driver
        // For Redis:
        if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
            $keys = Cache::getStore()->getRedis()->keys($pattern);
            foreach ($keys as $key) {
                Cache::forget($key);
            }
        }
        // For other drivers, you might need to track keys manually
    }

    /**
     * Warm up cache for a model's media.
     */
    public function warmUpModelMedia($model): void
    {
        foreach ($model->getRegisteredMediaCollections() as $collection) {
            $this->getModelMediaCollection($model, $collection->name);

            // Pre-cache URLs for each media item
            foreach ($model->getMedia($collection->name) as $media) {
                $this->getMediaUrl($media);

                // Pre-cache conversion URLs
                foreach (['thumb', 'preview'] as $conversion) {
                    if ($media->hasGeneratedConversion($conversion)) {
                        $this->getMediaUrl($media, $conversion);
                    }
                }
            }
        }
    }
}
