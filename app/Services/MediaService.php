<?php

namespace App\Services;

use App\Models\Media;
use App\Services\Media\BlurHashService;
use App\Services\Media\ImageHashService;
use App\Services\Media\MediaDiskResolver;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Spatie\MediaLibrary\HasMedia;

class MediaService
{
    private BlurHashService $blurHashService;
    private ImageHashService $imageHashService;

    public function __construct()
    {
        $this->blurHashService = new BlurHashService;
        $this->imageHashService = new ImageHashService;
    }

    /**
     * Process and add media to a model.
     */
    public function addMediaToModel(
        HasMedia $model,
        UploadedFile $file,
        string $collection,
        array $customProperties = []
    ): Media {
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();

        // Generate file hash
        $fileHash = hash_file('sha256', $file->getRealPath());

        // Merge default properties with custom ones
        $properties = array_merge([
            'uploaded_by' => auth()->id(),
            'uploaded_at' => now()->toIso8601String(),
            'ip_address' => request()->ip(),
            'original_name' => $originalName,
            'file_hash' => $fileHash,
        ], $customProperties);

        // Add image-specific properties
        if ($this->isImage($file)) {
            $imageProperties = $this->extractImageProperties($file);
            $properties = array_merge($properties, $imageProperties);

            // Generate BlurHash for images
            $blurHash = $this->blurHashService->generateBlurHash($file->getRealPath());
            if ($blurHash) {
                $properties['blurhash'] = $blurHash;
            }

            // Generate perceptual hash for duplicate detection
            $perceptualHash = $this->imageHashService->generatePerceptualHash($file->getRealPath());
            if ($perceptualHash) {
                $properties['perceptual_hash'] = $perceptualHash;
            }
        }

        // Determine the appropriate disk
        $disk = MediaDiskResolver::getDiskForCollection($collection);

        // Add the media
        // Use usingFileName() with the full filename to prevent double extensions
        // The MediaFileNamer will handle sanitization and unique suffix generation
        $originalFilename = $file->getClientOriginalName();

        $media = $model->addMedia($file)
            ->withCustomProperties($properties)
            ->usingFileName($originalFilename)
            ->toMediaCollection($collection, $disk);

        // Update media record with hash values
        $media->update([
            'file_hash' => $fileHash,
            'blurhash' => $properties['blurhash'] ?? null,
            'perceptual_hash' => $properties['perceptual_hash'] ?? null,
        ]);

        return $media;
    }

    /**
     * Check if a file is an image.
     */
    protected function isImage(UploadedFile $file): bool
    {
        return str_starts_with($file->getMimeType(), 'image/');
    }

    /**
     * Extract image properties.
     */
    protected function extractImageProperties(UploadedFile $file): array
    {
        try {
            $manager = new ImageManager(new Driver);
            $image = $manager->read($file->getRealPath());

            // Get image dimensions
            $width = $image->width();
            $height = $image->height();

            // Extract dominant color (simplified version)
            $dominantColor = $this->extractDominantColor($image);

            return [
                'width' => $width,
                'height' => $height,
                'aspect_ratio' => $width / $height,
                'dominant_color' => $dominantColor,
                'orientation' => $width > $height ? 'landscape' : ($width < $height ? 'portrait' : 'square'),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Extract dominant color from image.
     */
    protected function extractDominantColor($image): string
    {
        try {
            // Resize to 1x1 to get average color
            $pixel = clone $image;
            $pixel->scale(1, 1);
            $colors = $pixel->pickColor(0, 0);

            return sprintf('#%02x%02x%02x', $colors->red()->value(), $colors->green()->value(), $colors->blue()->value());
        } catch (\Exception $e) {
            return '#f3f4f6'; // Default gray
        }
    }

    /**
     * Generate a unique file name.
     */
    protected function generateUniqueFileName(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        $basename = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $timestamp = now()->format('YmdHis');
        $random = Str::random(6);

        return "{$basename}_{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Check for duplicate files by hash.
     */
    public function findDuplicateByHash(string $hash): ?Media
    {
        return Media::where('custom_properties->file_hash', $hash)->first();
    }

    /**
     * Copy media to another model.
     */
    public function copyMediaToModel(Media $media, HasMedia $targetModel, ?string $targetCollection = null): Media
    {
        $targetCollection = $targetCollection ?? $media->collection_name;

        // Get the file from storage
        $disk = Storage::disk($media->disk);
        $stream = $disk->readStream($media->getPath());

        // Create temp file
        $tempFile = tempnam(sys_get_temp_dir(), 'media_copy');
        file_put_contents($tempFile, $stream);

        // Copy custom properties
        $customProperties = $media->custom_properties;
        $customProperties['copied_from'] = $media->id;
        $customProperties['copied_at'] = now()->toIso8601String();
        $customProperties['copied_by'] = auth()->id();

        // Add to target model
        $newMedia = $targetModel->addMedia($tempFile)
            ->withCustomProperties($customProperties)
            ->usingFileName($media->file_name)
            ->toMediaCollection($targetCollection, $media->disk);

        // Copy conversions if they exist
        if ($media->hasGeneratedConversion('thumb')) {
            // Conversions will be regenerated automatically
        }

        return $newMedia;
    }

    /**
     * Move media between collections.
     */
    public function moveMediaToCollection(Media $media, string $newCollection): Media
    {
        $model = $media->model;
        $newDisk = MediaDiskResolver::getDiskForCollection($newCollection);

        // If disk is changing, we need to copy and delete
        if ($media->disk !== $newDisk) {
            $newMedia = $this->copyMediaToModel($media, $model, $newCollection);
            $media->delete();

            return $newMedia;
        }

        // Otherwise just update the collection
        $media->collection_name = $newCollection;
        $media->save();

        return $media;
    }

    /**
     * Generate temporary URL for private media.
     */
    public function generateTemporaryUrl(Media $media, int $minutes = 5): string
    {
        if (! $media->disk || ! Storage::disk($media->disk)->exists($media->getPath())) {
            throw new \Exception('Media file not found');
        }

        return Storage::disk($media->disk)->temporaryUrl(
            $media->getPath(),
            now()->addMinutes($minutes)
        );
    }

    /**
     * Optimize existing media.
     */
    public function optimizeMedia(Media $media): void
    {
        if (! $media->is_image) {
            return;
        }

        dispatch(new \App\Jobs\OptimizeMediaImage($media));
    }
}
