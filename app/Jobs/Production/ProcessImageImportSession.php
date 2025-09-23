<?php

namespace App\Jobs\Production;

use App\Models\Production\Item;
use App\Services\MediaService;
use App\Services\Production\ItemImageBulkImportServiceV2;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessImageImportSession implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 1800; // 30 minutes

    /**
     * Create a new job instance.
     */
    public function __construct(
        private string $sessionId,
        private array $options = []
    ) {}

    /**
     * Execute the job.
     */
    public function handle(MediaService $mediaService, ItemImageBulkImportServiceV2 $bulkService): void
    {
        Log::info('[ProcessImageImportSession] Starting job', [
            'sessionId' => $this->sessionId,
            'options' => $this->options,
        ]);

        $sessionData = Cache::get("image_import_session_{$this->sessionId}");
        if (! $sessionData) {
            Log::error("[ProcessImageImportSession] Import session not found: {$this->sessionId}");

            return;
        }

        Log::info('[ProcessImageImportSession] Session data retrieved', [
            'sessionId' => $this->sessionId,
            'status' => $sessionData['status'] ?? 'unknown',
            'filesCount' => count($sessionData['files'] ?? []),
            'processed' => $sessionData['processed'] ?? 0,
        ]);

        // Update session status
        $sessionData['status'] = 'processing';
        $sessionData['started_at'] = now();
        Cache::put("image_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));

        $summary = [
            'itemsAffected' => 0,
            'imagesImported' => 0,
            'imagesSkipped' => 0,
            'imagesReplaced' => 0,
            'duplicatesSkipped' => 0,
            'errors' => [],
        ];

        try {
            $validFiles = collect($sessionData['files'])->where('valid', true);

            Log::info('[ProcessImageImportSession] Processing valid files', [
                'sessionId' => $this->sessionId,
                'validFilesCount' => $validFiles->count(),
            ]);

            foreach ($validFiles as $index => $fileInfo) {
                Log::info('[ProcessImageImportSession] Processing file', [
                    'sessionId' => $this->sessionId,
                    'fileIndex' => $index,
                    'filename' => $fileInfo['filename'] ?? 'unknown',
                    'itemCode' => $fileInfo['itemCode'] ?? 'unknown',
                ]);

                $this->processFile($fileInfo, $mediaService, $summary);

                // Update progress
                $sessionData['processed'] = $index + 1;
                $sessionData['summary'] = $summary;
                Cache::put("image_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));

                Log::info('[ProcessImageImportSession] File processed', [
                    'sessionId' => $this->sessionId,
                    'fileIndex' => $index,
                    'summary' => $summary,
                ]);
            }

            // Mark session as complete
            $sessionData['status'] = 'completed';
            $sessionData['completed_at'] = now();
            $sessionData['summary'] = $summary;

            Log::info('[ProcessImageImportSession] Marking session as completed', [
                'sessionId' => $this->sessionId,
                'status' => 'completed',
                'summary' => $summary,
                'completed_at' => $sessionData['completed_at'],
            ]);

            Cache::put("image_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));
        } catch (\Exception $e) {
            Log::error("Import session failed: {$this->sessionId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $sessionData['status'] = 'failed';
            $sessionData['error'] = $e->getMessage();
            $sessionData['summary'] = $summary;
            Cache::put("image_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));
        }
    }

    /**
     * Process a single file.
     */
    private function processFile(array $fileInfo, MediaService $mediaService, array &$summary): void
    {
        $filename = $fileInfo['filename'];
        $itemCode = $fileInfo['itemCode'];

        Log::info('[ProcessImageImportSession] Looking for assembled file', [
            'sessionId' => $this->sessionId,
            'filename' => $filename,
            'itemCode' => $itemCode,
        ]);

        // Find the assembled file
        $filePath = "imports/{$this->sessionId}/{$filename}";
        if (! Storage::disk('local')->exists($filePath)) {
            Log::error('[ProcessImageImportSession] Assembled file not found', [
                'sessionId' => $this->sessionId,
                'filePath' => $filePath,
                'filename' => $filename,
            ]);
            $summary['errors'][] = "File not found: {$filename}";
            $summary['imagesSkipped']++;

            return;
        }

        // Find the item
        $item = Item::where('item_number', $itemCode)->first();
        if (! $item) {
            $summary['errors'][] = "Item not found: {$itemCode}";
            $summary['imagesSkipped']++;

            return;
        }

        DB::transaction(function () use ($item, $filePath, $filename, $mediaService, &$summary) {
            try {
                // Check if we should replace existing
                $hasExisting = $item->hasMedia('images');

                if ($hasExisting) {
                    if ($this->options['replaceExisting'] ?? true) {
                        // Clear existing image
                        $item->clearMediaCollection('images');
                        $summary['imagesReplaced']++;
                    } else {
                        $summary['errors'][] = "Item {$item->item_number} already has an image (skipped)";
                        $summary['imagesSkipped']++;

                        return;
                    }
                }

                // Create temporary uploaded file
                $tempPath = Storage::disk('local')->path($filePath);
                $uploadedFile = new \Illuminate\Http\UploadedFile(
                    $tempPath,
                    $filename,
                    Storage::disk('local')->mimeType($filePath),
                    null,
                    true
                );

                // Check for duplicates if enabled
                if ($this->options['skipDuplicates'] ?? false) {
                    $fileHash = hash_file('sha256', $tempPath);
                    $duplicate = DB::table('media')
                        ->where('file_hash', $fileHash)
                        ->where('model_type', 'App\\Models\\Production\\Item')
                        ->first();

                    if ($duplicate) {
                        $summary['duplicatesSkipped']++;
                        $summary['errors'][] = "Duplicate image detected for item {$item->item_number}";

                        return;
                    }
                }

                // Add media using MediaService
                $media = $mediaService->addMediaToModel(
                    $item,
                    $uploadedFile,
                    'images',
                    [
                        'import_session' => $this->sessionId,
                        'original_filename' => $filename,
                        'quality' => $this->options['quality'] ?? 85,
                    ]
                );

                $summary['imagesImported']++;
                if (! $hasExisting) {
                    $summary['itemsAffected']++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to import image for item {$item->item_number}", [
                    'error' => $e->getMessage(),
                    'file' => $filename,
                ]);

                $summary['errors'][] = "Failed to import {$filename}: " . $e->getMessage();
                $summary['imagesSkipped']++;
            }
        });
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Import session job failed: {$this->sessionId}", [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        $sessionData = Cache::get("image_import_session_{$this->sessionId}");
        if ($sessionData) {
            $sessionData['status'] = 'failed';
            $sessionData['error'] = $exception->getMessage();
            Cache::put("image_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));
        }
    }
}
