<?php

namespace App\Http\Resources;

use App\Services\MediaCacheService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $cacheService = app(MediaCacheService::class);

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'human_readable_size' => $this->human_readable_size,
            'collection' => $this->collection_name,
            'conversions' => $this->when($this->is_image, function () use ($cacheService) {
                $conversions = [];

                if ($this->hasGeneratedConversion('thumb')) {
                    $conversions['thumb'] = $cacheService->getMediaUrl($this->resource, 'thumb');
                }
                if ($this->hasGeneratedConversion('preview')) {
                    $conversions['preview'] = $cacheService->getMediaUrl($this->resource, 'preview');
                }
                if ($this->hasGeneratedConversion('large')) {
                    $conversions['large'] = $cacheService->getMediaUrl($this->resource, 'large');
                }

                return $conversions;
            }),
            'url' => $cacheService->getMediaUrl($this->resource),
            'is_image' => $this->is_image,
            'is_document' => $this->is_document,
            'is_primary' => $this->is_primary,
            'custom_properties' => $this->custom_properties,
            'caption' => $this->getCustomProperty('caption'),
            'alt_text' => $this->getCustomProperty('alt_text'),
            'uploaded_by' => $this->getCustomProperty('uploaded_by'),
            'uploaded_at' => $this->created_at->toIso8601String(),
            'width' => $this->when($this->is_image, $this->getCustomProperty('width')),
            'height' => $this->when($this->is_image, $this->getCustomProperty('height')),
            'aspect_ratio' => $this->when($this->is_image, $this->aspect_ratio),
            'dominant_color' => $this->when($this->is_image, $this->dominant_color),
            'blurhash' => $this->when($this->is_image, $this->blurhash),
        ];
    }
}
