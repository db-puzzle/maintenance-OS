<?php

namespace App\Console\Commands;

use App\Models\Media;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MediaCleanup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:cleanup 
                            {--days=30 : Delete temporary files older than X days}
                            {--dry-run : Show what would be deleted without deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up old temporary media files and orphaned records';

    /**
     * Execute the console command.
     *
     * IMPORTANT: This command MUST be run via `tenants:run` to ensure proper tenant context.
     * Media model is tenant-specific.
     */
    public function handle()
    {
        // Verify we're in a tenant context (safety check)
        if (! tenancy()->initialized) {
            $this->error('ERROR: This command must be run in tenant context via "tenants:run"');
            $this->error('Usage: php artisan tenants:run media:cleanup');

            return 1;
        }

        $tenantName = tenant('name') ?? 'Unknown';
        $this->info("Starting media cleanup (Tenant: {$tenantName})...");

        $days = $this->option('days');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No files will be deleted');
        }

        // Clean up old temporary uploads
        $this->cleanupTemporaryUploads($days, $dryRun);

        // Clean up orphaned chunks
        $this->cleanupOrphanedChunks($dryRun);

        // Clean up failed conversions
        $this->cleanupFailedConversions($dryRun);

        $this->info('Media cleanup completed!');

        return 0;
    }

    /**
     * Clean up old temporary uploads.
     */
    protected function cleanupTemporaryUploads(int $days, bool $dryRun): void
    {
        $this->info("Cleaning up temporary uploads older than {$days} days...");

        $tempDisk = config('media-library.temporary_upload_disk', 'media-temp');

        if (! Storage::disk($tempDisk)->exists('')) {
            $this->info('No temporary upload directory found.');

            return;
        }

        $cutoffDate = Carbon::now()->subDays($days);
        $deletedCount = 0;

        $files = Storage::disk($tempDisk)->allFiles();

        foreach ($files as $file) {
            $lastModified = Carbon::createFromTimestamp(Storage::disk($tempDisk)->lastModified($file));

            if ($lastModified->lt($cutoffDate)) {
                if ($dryRun) {
                    $this->info("Would delete: {$file} (modified: {$lastModified})");
                } else {
                    Storage::disk($tempDisk)->delete($file);
                }
                $deletedCount++;
            }
        }

        $this->info("Cleaned up {$deletedCount} temporary files");
    }

    /**
     * Clean up orphaned chunk uploads.
     */
    protected function cleanupOrphanedChunks(bool $dryRun): void
    {
        $this->info('Cleaning up orphaned upload chunks...');

        $chunkPath = 'chunks';

        if (! Storage::disk('local')->exists($chunkPath)) {
            $this->info('No chunks directory found.');

            return;
        }

        $directories = Storage::disk('local')->directories($chunkPath);
        $deletedCount = 0;

        foreach ($directories as $dir) {
            // Check if upload is older than 24 hours
            $lastModified = Carbon::createFromTimestamp(Storage::disk('local')->lastModified($dir));

            if ($lastModified->lt(now()->subHours(24))) {
                if ($dryRun) {
                    $this->info("Would delete chunk directory: {$dir}");
                } else {
                    Storage::disk('local')->deleteDirectory($dir);
                }
                $deletedCount++;
            }
        }

        $this->info("Cleaned up {$deletedCount} orphaned chunk directories");
    }

    /**
     * Clean up failed conversions.
     */
    protected function cleanupFailedConversions(bool $dryRun): void
    {
        $this->info('Cleaning up failed conversion files...');

        $deletedCount = 0;

        Media::where('mime_type', 'like', 'image/%')
            ->where('created_at', '<', now()->subDays(7))
            ->where('generated_conversions', 'like', '%false%')
            ->chunk(100, function ($mediaItems) use ($dryRun, &$deletedCount) {
                foreach ($mediaItems as $media) {
                    // Check if conversion files exist but are marked as failed
                    $conversions = $media->getGeneratedConversions();

                    foreach ($conversions as $conversion => $generated) {
                        if (! $generated) {
                            $path = $media->getPathForConversions() . $conversion . '.' . $media->extension;

                            if (Storage::disk($media->disk)->exists($path)) {
                                if ($dryRun) {
                                    $this->info("Would delete failed conversion: {$path}");
                                } else {
                                    Storage::disk($media->disk)->delete($path);
                                }
                                $deletedCount++;
                            }
                        }
                    }
                }
            });

        $this->info("Cleaned up {$deletedCount} failed conversion files");
    }
}
