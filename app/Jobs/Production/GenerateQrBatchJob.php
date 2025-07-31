<?php

namespace App\Jobs\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\User;
use App\Services\Production\QrTagPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;
use App\Notifications\QrBatchGeneratedNotification;

class GenerateQrBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $type,
        public array $ids,
        public User $user
    ) {}

    public function handle(QrTagPdfService $pdfService): void
    {
        $items = match($this->type) {
            'item' => Item::whereIn('id', $this->ids)->get(),
            'order' => ManufacturingOrder::whereIn('id', $this->ids)->get()
        };

        $pdfUrl = $pdfService->generateBatchTags($items->all(), $this->type);

        // Notify user when generation is complete
        if (class_exists(\App\Notifications\QrBatchGeneratedNotification::class)) {
            $this->user->notify(new \App\Notifications\QrBatchGeneratedNotification($pdfUrl, $this->type, count($this->ids)));
        }
    }
}