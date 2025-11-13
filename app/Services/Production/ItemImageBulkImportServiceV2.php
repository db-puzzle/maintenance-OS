<?php

namespace App\Services\Production;

use App\Jobs\OptimizeMediaImage;
use App\Models\Production\Item;
use App\Services\MediaService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Bulk import service for item images using the new Media Library infrastructure.
 * This replaces the old ItemImageBulkImportService to use the new media system.
 */
class ItemImageBulkImportServiceV2
{
    public function __construct(
        private MediaService $mediaService
    ) {}

    /**
     * Import item images from a manifest and uploaded files using the new Media Library.
     *
     * @param string $matchingKey 'item_number' (kept for compatibility)
     * @param array $manifest Expecting ['items' => [ { identifier, item_id?, images: [{client_name, order, is_primary?}] } ]]
     * @param UploadedFile[] $uploadedFiles Array of files, matched by client original name
     * @return array Summary: itemsAffected, imagesImported, imagesSkipped, errors[]
     */
    public function importFromManifest(string $matchingKey, array $manifest, array $uploadedFiles): array
    {
        // Build file map by client name
        $fileMap = [];
        foreach ($uploadedFiles as $uploaded) {
            if ($uploaded instanceof UploadedFile) {
                $fileMap[$uploaded->getClientOriginalName()] = $uploaded;
            }
        }

        $summary = [
            'itemsAffected' => 0,
            'imagesImported' => 0,
            'imagesSkipped' => 0,
            'errors' => [],
        ];

        $items = $manifest['items'] ?? [];

        // Process in batches to handle large imports
        $batchSize = 10; // Process 10 items at a time
        $itemChunks = array_chunk($items, $batchSize);

        foreach ($itemChunks as $chunk) {
            $this->processItemBatch($chunk, $fileMap, $summary);
        }

        return $summary;
    }

    /**
     * Process a batch of items.
     */
    private function processItemBatch(array $items, array $fileMap, array &$summary): void
    {
        foreach ($items as $entry) {
            $identifier = $entry['identifier'] ?? null;
            $itemId = $entry['item_id'] ?? null;
            $images = $entry['images'] ?? [];

            if (! $identifier && ! $itemId) {
                $summary['errors'][] = 'Entry missing identifier and item_id.';
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            // Find the item
            $item = null;
            if ($itemId) {
                $item = Item::find($itemId);
            } else {
                // Match by item_number (case-insensitive)
                $item = Item::whereRaw('LOWER(item_number) = ?', [strtolower($identifier)])->first();
            }

            if (! $item) {
                $summary['errors'][] = "Item not found for identifier '{$identifier}'.";
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            // Check permissions
            if (Gate::denies('update', $item)) {
                $summary['errors'][] = "Not authorized to update item '{$item->item_number}'.";
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            // Check if item already has an image
            $existingCount = $item->getMedia('images')->count();

            if ($existingCount > 0) {
                $summary['errors'][] = "Item '{$item->item_number}' already has an image. Image will be replaced.";
                // Clear existing image
                $item->clearMediaCollection('images');
            }

            // Process only the first image
            $imageEntry = $images[0] ?? null;
            if (! $imageEntry) {
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            // Process image in transaction
            DB::transaction(function () use (
                $images,
                $imageEntry,
                $fileMap,
                $item,
                &$summary
            ) {
                $clientName = $imageEntry['client_name'] ?? null;
                if (! $clientName || ! isset($fileMap[$clientName])) {
                    $summary['errors'][] = "File '{$clientName}' not found in upload for item '{$item->item_number}'.";
                    $summary['imagesSkipped']++;

                    return;
                }

                $file = $fileMap[$clientName];

                // Validate file
                $validator = Validator::make(['f' => $file], [
                    'f' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:10240', // 10MB
                ]);

                if ($validator->fails()) {
                    $summary['errors'][] = "Invalid image '{$clientName}' for item '{$item->item_number}'.";
                    $summary['imagesSkipped']++;

                    return;
                }

                try {
                    // Add media using the new MediaService
                    $media = $this->mediaService->addMediaToModel(
                        $item,
                        $file,
                        'images',
                        [
                            'uploaded_by' => auth()->id(),
                            'original_filename' => $clientName,
                            'import_batch' => date('Y-m-d H:i:s'), // Track import batch
                        ]
                    );

                    // Queue optimization job if enabled
                    if (config('media-library.queue_conversions_by_default')) {
                        dispatch(new OptimizeMediaImage($media));
                    }

                    $summary['imagesImported']++;
                    $summary['itemsAffected']++;

                    // Skip any additional images
                    if (count($images) > 1) {
                        $summary['imagesSkipped'] += (count($images) - 1);
                        $summary['errors'][] = "Item '{$item->item_number}' had " . count($images) . ' images in manifest. Only first image was imported.';
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to import image for item', [
                        'item_id' => $item->id,
                        'file' => $clientName,
                        'error' => $e->getMessage(),
                    ]);

                    $summary['errors'][] = "Failed to import '{$clientName}' for item '{$item->item_number}': " . $e->getMessage();
                    $summary['imagesSkipped']++;
                }
            });
        }
    }
}
