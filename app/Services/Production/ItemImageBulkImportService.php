<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;

class ItemImageBulkImportService
{
    public function __construct()
    {
    }

    /**
     * Import item images from a manifest and uploaded files.
     *
     * @param string $matchingKey 'item_number' (kept for compatibility, but only item_number is supported)
     * @param array $manifest Expecting ['items' => [ { identifier, item_id?, images: [{client_name, order, is_primary?}] } ]]
     * @param UploadedFile[] $uploadedFiles Array of files, matched by client original name
     * @return array Summary: itemsAffected, imagesImported, imagesSkipped, errors[]
     */
    public function importFromManifest(string $matchingKey, array $manifest, array $uploadedFiles): array
    {
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
        foreach ($items as $entry) {
            $identifier = $entry['identifier'] ?? null;
            $itemId = $entry['item_id'] ?? null;
            $images = $entry['images'] ?? [];

            if (!$identifier && !$itemId) {
                $summary['errors'][] = 'Entry missing identifier and item_id.';
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            $item = null;
            if ($itemId) {
                $item = Item::find($itemId);
            } else {
                // Only match by item_number
                $item = Item::whereRaw('LOWER(item_number) = ?', [strtolower($identifier)])->first();
            }

            if (!$item) {
                $summary['errors'][] = "Item not found for identifier '{$identifier}'.";
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            // Permission: user must be able to update this item to attach images
            if (Gate::denies('update', $item)) {
                $summary['errors'][] = "Not authorized to update item '{$item->item_number}'.";
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            $existingCount = $item->getMedia('images')->count();
            $remainingSlots = max(0, 5 - $existingCount);
            if ($remainingSlots === 0) {
                $summary['errors'][] = "Item '{$item->item_number}' already has 5 images. Skipping.";
                $summary['imagesSkipped'] += count($images);
                continue;
            }

            usort($images, fn ($a, $b) => ($a['order'] ?? 0) <=> ($b['order'] ?? 0));

            $importedForItem = 0;
            $hadPrimary = $item->getMedia('images')->where('custom_properties->is_primary', true)->exists();

            DB::transaction(function () use (
                $images,
                $fileMap,
                $item,
                $remainingSlots,
                &$summary,
                &$importedForItem,
                $hadPrimary
            ) {
                $slotLeft = $remainingSlots;
                foreach ($images as $index => $imageEntry) {
                    if ($slotLeft <= 0) {
                        $summary['imagesSkipped']++;
                        continue;
                    }
                    $clientName = $imageEntry['client_name'] ?? null;
                    if (!$clientName || !isset($fileMap[$clientName])) {
                        $summary['errors'][] = "File '{$clientName}' not found in upload for item '{$item->item_number}'.";
                        $summary['imagesSkipped']++;
                        continue;
                    }
                    $file = $fileMap[$clientName];

                    $validator = Validator::make(['f' => $file], [
                        'f' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:10240',
                    ]);
                    if ($validator->fails()) {
                        $summary['errors'][] = "Invalid image '{$clientName}' for item '{$item->item_number}'.";
                        $summary['imagesSkipped']++;
                        continue;
                    }

                    // Add image using Spatie Media Library
                    $media = $item->addMedia($file)
                        ->withCustomProperties([
                            'uploaded_by' => auth()->id(),
                            'is_primary' => !$hadPrimary && $importedForItem === 0 && ($imageEntry['is_primary'] ?? false),
                            'display_order' => $item->media()->count() + 1,
                        ])
                        ->toMediaCollection('images');

                    $importedForItem++;
                    $slotLeft--;
                    $summary['imagesImported']++;
                }

                if (!$item->getMedia('images')->where('custom_properties->is_primary', true)->exists()) {
                    $first = $item->getMedia('images')->sortBy('custom_properties.display_order')->first();
                    if ($first) {
                        $first->setCustomProperty('is_primary', true);
                        $first->save();
                    }
                }
            });

            if ($importedForItem > 0) {
                $summary['itemsAffected']++;
            }
        }

        return $summary;
    }
}


