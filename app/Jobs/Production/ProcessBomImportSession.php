<?php

namespace App\Jobs\Production;

use App\Services\Production\BomImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessBomImportSession implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $sessionId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(BomImportService $importService): void
    {
        $sessionData = Cache::get("bom_import_session_{$this->sessionId}");

        if (! $sessionData) {
            Log::error('[BOM Import] Session not found', ['sessionId' => $this->sessionId]);

            return;
        }

        try {
            // Update status
            $sessionData['status'] = 'processing';
            $sessionData['started_at'] = now();
            Cache::put("bom_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));

            $fileInfo = $sessionData['file_info'] ?? [];
            $bomInfo = $sessionData['bom_info'] ?? [];
            $mapping = $sessionData['mapping'] ?? [];
            $data = $sessionData['data'] ?? [];

            $bom = null;

            // Process based on file type
            if ($fileInfo['type'] === 'json') {
                // Determine JSON format (native or Inventor)
                if (isset($data['bom_number']) || isset($data['items'][0]['children'])) {
                    // Native format
                    $bom = $importService->importFromNativeJson($data, $bomInfo);
                } else {
                    // Inventor format - need to add output_item_id
                    $inventorData = [
                        'name' => $bomInfo['name'],
                        'description' => $bomInfo['description'] ?? null,
                        'drawing_number' => $bomInfo['external_reference'] ?? null,
                        'items' => $data['items'] ?? $data,
                    ];

                    // Find output item from first item in structure
                    if (! empty($inventorData['items'])) {
                        $firstItem = $inventorData['items'][0];
                        $outputItem = \App\Models\Production\Item::where('item_number', $firstItem['item_number'] ?? '')->first();
                        if ($outputItem) {
                            $inventorData['output_item_id'] = $outputItem->id;
                        }
                    }

                    $bom = $importService->importFromInventor($inventorData);
                }
            } else {
                // CSV/TXT import
                // Load file from storage
                $filePath = Storage::disk('local')->path($fileInfo['path']);
                $file = new \Illuminate\Http\UploadedFile(
                    $filePath,
                    $fileInfo['original_name'],
                    null,
                    null,
                    true
                );

                $bom = $importService->importFromCsv($file, $mapping, $bomInfo);
            }

            // Update session with success result
            $sessionData['status'] = 'completed';
            $sessionData['completed_at'] = now();
            $sessionData['result'] = [
                'bom_id' => $bom->id,
                'bom_number' => $bom->bom_number,
                'items_created' => $bom->items()->count(),
                'errors' => [],
            ];

            Cache::put("bom_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));

            // Clean up temporary files
            Storage::disk('local')->deleteDirectory("temp/bom-imports/{$this->sessionId}");
        } catch (\Exception $e) {
            Log::error('[BOM Import] Import failed', [
                'sessionId' => $this->sessionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update session with error
            $sessionData['status'] = 'failed';
            $sessionData['completed_at'] = now();
            $sessionData['result'] = [
                'bom_id' => null,
                'bom_number' => null,
                'items_created' => 0,
                'errors' => [$e->getMessage()],
            ];

            Cache::put("bom_import_session_{$this->sessionId}", $sessionData, now()->addHours(24));

            // Clean up temporary files
            Storage::disk('local')->deleteDirectory("temp/bom-imports/{$this->sessionId}");
        }
    }
}
