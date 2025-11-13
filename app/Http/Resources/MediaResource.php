<?php

namespace App\Http\Resources;

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
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'collection_name' => $this->collection_name,
            'name' => $this->name,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'disk' => $this->disk,
            'size' => $this->size,
            'human_readable_size' => $this->human_readable_size,
            'custom_properties' => $this->custom_properties,
            'conversions' => $this->generated_conversions,
            'urls' => $this->when($this->collection_name !== null, function () {
                $urls = [
                    'original' => route('api.media.show', $this->id),
                    'download' => route('api.media.download', $this->id),
                ];

                // Add conversion URLs
                if ($this->generated_conversions) {
                    foreach (array_keys($this->generated_conversions) as $conversion) {
                        $urls[$conversion] = route('api.media.show-conversion', [$this->id, $conversion]);
                    }
                }

                return $urls;
            }),
            'meta' => [
                'width' => $this->width,
                'height' => $this->height,
                'aspect_ratio' => $this->aspect_ratio,
                'blurhash' => $this->blurhash,
                'dominant_color' => $this->dominant_color,
                'is_image' => $this->is_image,
                'is_document' => $this->is_document,
                'extension' => $this->extension,
            ],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
