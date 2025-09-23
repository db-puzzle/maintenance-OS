<?php

namespace App\Observers;

use App\Jobs\GenerateMediaMetadata;
use App\Models\Media;
use App\Services\MediaCacheService;
use Illuminate\Support\Facades\Log;

class MediaObserver
{
    protected MediaCacheService $cacheService;

    public function __construct(MediaCacheService $cacheService)
    {
        $this->cacheService = $cacheService;
    }

    /**
     * Handle the Media "created" event.
     */
    public function created(Media $media): void
    {
        // Queue metadata generation for images
        if ($media->is_image) {
            dispatch(new GenerateMediaMetadata($media));
        }
        
        // Log media creation for audit
        activity()
            ->performedOn($media)
            ->causedBy(auth()->user())
            ->withProperties([
                'collection' => $media->collection_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'model' => $media->model_type,
                'model_id' => $media->model_id,
            ])
            ->log('media_uploaded');
    }

    /**
     * Handle the Media "updated" event.
     */
    public function updated(Media $media): void
    {
        // Clear cached URLs when media is updated
        $this->cacheService->clearMediaCache($media);

        // Log significant changes
        if ($media->wasChanged(['collection_name', 'disk'])) {
            activity()
                ->performedOn($media)
                ->causedBy(auth()->user())
                ->withProperties([
                    'changes' => $media->getChanges(),
                ])
                ->log('media_updated');
        }
    }

    /**
     * Handle the Media "deleted" event.
     */
    public function deleted(Media $media): void
    {
        // Clear all caches for this media
        $this->cacheService->clearMediaCache($media);

        // Log deletion
        activity()
            ->performedOn($media->model)
            ->causedBy(auth()->user())
            ->withProperties([
                'media_id' => $media->uuid,
                'collection' => $media->collection_name,
                'file_name' => $media->file_name,
            ])
            ->log('media_deleted');
    }

    /**
     * Handle the Media "deleting" event.
     */
    public function deleting(Media $media): bool
    {
        // Check if this is a primary media item
        if ($media->getCustomProperty('is_primary', false)) {
            // Find another media item in the same collection to make primary
            $nextMedia = $media->model->getMedia($media->collection_name)
                ->where('id', '!=', $media->id)
                ->first();

            if ($nextMedia) {
                $nextMedia->setCustomProperty('is_primary', true);
                $nextMedia->save();
            }
        }

        return true;
    }
}
