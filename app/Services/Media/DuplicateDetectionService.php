<?php

namespace App\Services\Media;

use App\Models\Media;
use Illuminate\Support\Collection;

class DuplicateDetectionService
{
    private ImageHashService $hashService;

    public function __construct(ImageHashService $hashService)
    {
        $this->hashService = $hashService;
    }

    /**
     * Check for duplicates by file hash (exact match).
     */
    public function checkByFileHash(string $hash): Collection
    {
        return Media::where('file_hash', $hash)->get();
    }

    /**
     * Check for duplicates by perceptual hash (visual similarity).
     */
    public function checkByVisualSimilarity(string $perceptualHash, float $threshold = 90): Collection
    {
        $candidates = Media::whereNotNull('perceptual_hash')->get();

        return $candidates->filter(function ($media) use ($perceptualHash, $threshold) {
            $similarity = $this->hashService->calculateSimilarity(
                $perceptualHash,
                $media->perceptual_hash
            );

            return $similarity >= $threshold;
        })->map(function ($media) use ($perceptualHash) {
            $media->similarity = $this->hashService->calculateSimilarity(
                $perceptualHash,
                $media->perceptual_hash
            );

            return $media;
        })->sortByDesc('similarity');
    }

    /**
     * Check for duplicates by metadata.
     */
    public function checkByMetadata(array $metadata, int $tolerance = 60): Collection
    {
        $query = Media::query();

        // Check by original date and camera model
        if (isset($metadata['date']) && isset($metadata['camera'])) {
            $date = $metadata['date'];
            $camera = $metadata['camera'];

            $query->whereRaw("JSON_EXTRACT(custom_properties, '$.exif.DateTimeOriginal') BETWEEN ? AND ?", [
                date('Y-m-d H:i:s', strtotime($date) - $tolerance),
                date('Y-m-d H:i:s', strtotime($date) + $tolerance),
            ])->whereRaw("JSON_EXTRACT(custom_properties, '$.exif.Make') = ?", [$camera]);
        }

        // Check by size (within 5% tolerance)
        if (isset($metadata['size'])) {
            $size = $metadata['size'];
            $query->whereBetween('size', [
                $size * 0.95,
                $size * 1.05,
            ]);
        }

        return $query->get();
    }

    /**
     * Comprehensive duplicate check.
     */
    public function checkForDuplicates(string $path, array $metadata = []): array
    {
        $fileHash = $this->hashService->generateFileHash($path);
        $exactMatches = $this->checkByFileHash($fileHash);

        if ($exactMatches->isNotEmpty()) {
            return [
                'is_duplicate' => true,
                'confidence' => 1.0,
                'type' => 'exact',
                'matches' => $exactMatches,
            ];
        }

        // For images, check visual similarity
        if (isset($metadata['mime_type']) && str_starts_with($metadata['mime_type'], 'image/')) {
            $perceptualHash = $this->hashService->generatePerceptualHash($path);

            if ($perceptualHash) {
                $visualMatches = $this->checkByVisualSimilarity($perceptualHash);

                if ($visualMatches->isNotEmpty() && $visualMatches->first()->similarity > 95) {
                    return [
                        'is_duplicate' => true,
                        'confidence' => $visualMatches->first()->similarity / 100,
                        'type' => 'visual',
                        'matches' => $visualMatches,
                    ];
                }

                // Check metadata matches
                $metadataMatches = $this->checkByMetadata($metadata);

                // Cross-reference visual and metadata matches
                $possibleDuplicates = $visualMatches->filter(function ($visual) use ($metadataMatches) {
                    return $metadataMatches->contains('id', $visual->id);
                });

                if ($possibleDuplicates->isNotEmpty()) {
                    return [
                        'is_duplicate' => 'possible',
                        'confidence' => $possibleDuplicates->first()->similarity / 100,
                        'type' => 'similar',
                        'matches' => $possibleDuplicates,
                    ];
                }
            }
        }

        return [
            'is_duplicate' => false,
            'confidence' => 0,
            'type' => 'none',
            'matches' => collect(),
        ];
    }

    /**
     * Mark media as duplicate.
     */
    public function markAsDuplicate(Media $media, Media $originalMedia, string $type = 'exact'): void
    {
        $media->duplicate_of = $originalMedia->id;
        $media->duplicate_type = $type;
        $media->save();
    }
}
