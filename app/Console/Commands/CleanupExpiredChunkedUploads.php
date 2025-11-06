<?php

namespace App\Console\Commands;

use App\Models\ChunkedUpload;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupExpiredChunkedUploads extends Command
{
    protected $signature = 'media:cleanup-chunked-uploads';

    protected $description = 'Clean up expired chunked uploads and their associated files';

    /**
     * Execute the console command.
     *
     * IMPORTANT: This command MUST be run via `tenants:run` to ensure proper tenant context.
     * ChunkedUpload model is tenant-specific.
     */
    public function handle()
    {
        // Verify we're in a tenant context (safety check)
        if (! tenancy()->initialized) {
            $this->error('ERROR: This command must be run in tenant context via "tenants:run"');
            $this->error('Usage: php artisan tenants:run media:cleanup-chunked-uploads');

            return 1;
        }

        $tenantName = tenant('name') ?? 'Unknown';
        $this->info("Starting cleanup of expired chunked uploads (Tenant: {$tenantName})...");

        $expiredUploads = ChunkedUpload::expired()->get();

        if ($expiredUploads->isEmpty()) {
            $this->info('No expired uploads found.');

            return;
        }

        $this->info("Found {$expiredUploads->count()} expired uploads.");

        $deletedCount = 0;
        $errorCount = 0;

        foreach ($expiredUploads as $upload) {
            try {
                // Delete chunks from storage
                Storage::disk('local')->deleteDirectory("chunks/{$upload->id}");

                // Update status
                $upload->status = 'expired';
                $upload->save();

                $deletedCount++;
                $this->line("Cleaned up upload: {$upload->id}");
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("Failed to clean up upload {$upload->id}: {$e->getMessage()}");
            }
        }

        $this->info("Cleanup completed. Deleted: {$deletedCount}, Errors: {$errorCount}");
    }
}
