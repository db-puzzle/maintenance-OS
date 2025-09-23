<?php

namespace App\Console\Commands;

use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MigrateItemImagesToMediaLibrary extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:migrate-item-images 
                            {--batch=100 : Number of images to process per batch}
                            {--dry-run : Run without making changes}
                            {--force : Force migration even if media already exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing item images to Spatie Media Library';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting migration of item images to Media Library...');

        $totalImages = ItemImage::count();
        $this->info("Found {$totalImages} images to migrate");

        if ($totalImages === 0) {
            $this->info('No images to migrate.');

            return 0;
        }

        $progress = $this->output->createProgressBar($totalImages);
        $progress->start();

        $successCount = 0;
        $errorCount = 0;
        $skippedCount = 0;

        ItemImage::with(['item', 'uploader'])
            ->chunk($this->option('batch'), function ($images) use ($progress, &$successCount, &$errorCount, &$skippedCount) {
                foreach ($images as $image) {
                    $result = $this->migrateImage($image);

                    switch ($result) {
                        case 'success':
                            $successCount++;
                            break;
                        case 'error':
                            $errorCount++;
                            break;
                        case 'skipped':
                            $skippedCount++;
                            break;
                    }

                    $progress->advance();
                }
            });

        $progress->finish();
        $this->newLine();

        // Summary
        $this->info('Migration completed!');
        $this->info("Successfully migrated: {$successCount}");

        if ($skippedCount > 0) {
            $this->info("Skipped (already migrated): {$skippedCount}");
        }

        if ($errorCount > 0) {
            $this->error("Failed: {$errorCount}");
            $this->error('Check the logs for details about failed migrations.');
        }

        return $errorCount > 0 ? 1 : 0;
    }

    /**
     * Migrate a single image.
     */
    protected function migrateImage(ItemImage $image): string
    {
        try {
            if ($this->option('dry-run')) {
                $this->info("Would migrate: {$image->filename} for Item #{$image->item_id}");

                return 'success';
            }

            // Check if already migrated
            if ($image->media_id && ! $this->option('force')) {
                return 'skipped';
            }

            // Check if item exists
            if (! $image->item) {
                $this->error("Item not found for image {$image->id}");

                return 'error';
            }

            // Get the file from storage
            $storagePath = $image->storage_path ?? $this->constructStoragePath($image);

            if (! Storage::exists($storagePath)) {
                $this->error("File not found: {$storagePath}");
                Log::error('Image migration: file not found', [
                    'image_id' => $image->id,
                    'storage_path' => $storagePath,
                ]);

                return 'error';
            }

            DB::beginTransaction();

            try {
                // Create temporary file
                $tempPath = tempnam(sys_get_temp_dir(), 'media_migration_');
                file_put_contents($tempPath, Storage::get($storagePath));

                // Prepare custom properties
                $customProperties = [
                    'original_id' => $image->id,
                    'uploaded_by' => $image->uploaded_by ?? $image->item->created_by,
                    'was_optimized' => $image->was_optimized ?? false,
                    'migrated_at' => now()->toIso8601String(),
                    'is_primary' => $image->is_primary,
                    'caption' => $image->caption,
                    'display_order' => $image->display_order,
                ];

                // Add image dimensions if available
                if ($image->width && $image->height) {
                    $customProperties['width'] = $image->width;
                    $customProperties['height'] = $image->height;
                    $customProperties['aspect_ratio'] = $image->width / $image->height;
                }

                // Add to media library
                $media = $image->item
                    ->addMedia($tempPath)
                    ->withCustomProperties($customProperties)
                    ->usingName(pathinfo($image->filename, PATHINFO_FILENAME))
                    ->usingFileName($image->filename)
                    ->preservingOriginal()
                    ->toMediaCollection('images');

                // Update item image record with media ID
                $image->update(['media_id' => $media->id]);

                // If this was the primary image, update the item
                if ($image->is_primary && $image->item->primary_image_id === $image->id) {
                    $media->setCustomProperty('is_primary', true);
                    $media->save();
                }

                // Clean up temp file
                @unlink($tempPath);

                DB::commit();

                return 'success';
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            $this->error("Failed to migrate image {$image->id}: " . $e->getMessage());
            Log::error('Image migration failed', [
                'image_id' => $image->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return 'error';
        }
    }

    /**
     * Construct storage path for images that don't have it stored.
     */
    protected function constructStoragePath(ItemImage $image): string
    {
        // This is based on the old storage pattern
        // Adjust according to your actual storage structure
        $year = $image->created_at->format('Y');
        $month = $image->created_at->format('m');

        return "item-images/{$year}/{$month}/{$image->filename}";
    }
}
