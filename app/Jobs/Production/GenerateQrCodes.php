<?php

namespace App\Jobs\Production;

use App\Models\Production\BomItem;
use App\Services\Production\QrCodeGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateQrCodes implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected array $itemIds;

    /**
     * Create a new job instance.
     */
    public function __construct(array $itemIds)
    {
        $this->itemIds = $itemIds;
    }

    /**
     * Execute the job.
     */
    public function handle(QrCodeGenerationService $qrCodeService): void
    {
        $items = BomItem::whereIn('id', $this->itemIds)
            ->whereNull('qr_code')
            ->get();

        Log::info('Generating QR codes for ' . $items->count() . ' BOM items');

        foreach ($items as $item) {
            try {
                $qrCodeService->generateForBomItem($item);
                Log::info('Generated QR code for BOM item ID: ' . $item->id);
            } catch (\Exception $e) {
                Log::error('Failed to generate QR code for BOM item ID: ' . $item->id, [
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info('QR code generation completed');
    }
} 