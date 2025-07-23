<?php

namespace App\Services\Production;

use App\Models\Production\BomItem;
use App\Models\Production\QrTracking;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrCodeGenerationService
{
    /**
     * Generate QR code for a BOM item.
     */
    public function generateForBomItem(BomItem $item): string
    {
        if ($item->qr_code) {
            return $item->qr_code;
        }

        $code = $this->generateUniqueCode($item);
        
        // Generate QR code image
        $qrCodeImage = QrCode::format('png')
            ->size(300)
            ->margin(2)
            ->errorCorrection('H')
            ->generate($code);
            
        // Save to storage
        $path = $this->saveQrCodeImage($code, $qrCodeImage);
        
        // Update item
        $item->update([
            'qr_code' => $code,
            'qr_generated_at' => now(),
        ]);
        
        // Record generation event
        QrTracking::recordGeneration($code, [
            'item_type' => 'bom_item',
            'item_id' => $item->id,
            'item_number' => $item->item_number,
        ]);
        
        return $code;
    }

    /**
     * Generate QR codes for multiple items.
     */
    public function generateBulk(array $items): array
    {
        $results = [];
        
        foreach ($items as $item) {
            try {
                $code = $this->generateForBomItem($item);
                $results[] = [
                    'item_id' => $item->id,
                    'item_number' => $item->item_number,
                    'qr_code' => $code,
                    'success' => true,
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'item_id' => $item->id,
                    'item_number' => $item->item_number,
                    'error' => $e->getMessage(),
                    'success' => false,
                ];
            }
        }
        
        return $results;
    }

    /**
     * Generate QR code with custom data.
     */
    public function generateCustom(array $data, string $prefix = 'CUSTOM'): string
    {
        $code = $this->generateCustomCode($prefix);
        
        // Generate QR code with embedded data
        $qrData = json_encode(array_merge(['code' => $code], $data));
        
        $qrCodeImage = QrCode::format('png')
            ->size(300)
            ->margin(2)
            ->errorCorrection('H')
            ->generate($qrData);
            
        // Save to storage
        $this->saveQrCodeImage($code, $qrCodeImage);
        
        // Record generation event
        QrTracking::recordGeneration($code, $data);
        
        return $code;
    }

    /**
     * Generate QR code labels for printing.
     */
    public function generateLabels(array $items, array $options = []): string
    {
        $labelSize = $options['size'] ?? '2x1'; // inches
        $labelsPerPage = $options['per_page'] ?? 30;
        $includeText = $options['include_text'] ?? true;
        
        $html = view('production.qr-labels', [
            'items' => $items,
            'labelSize' => $labelSize,
            'labelsPerPage' => $labelsPerPage,
            'includeText' => $includeText,
        ])->render();
        
        // Generate PDF using existing PDF service
        $pdfPath = 'production/qr-labels/' . Str::random(10) . '.pdf';
        
        // TODO: Use PDFGeneratorService to create PDF
        // For now, return the HTML
        
        return $html;
    }

    /**
     * Regenerate QR code for an item.
     */
    public function regenerate(BomItem $item, string $reason = null): string
    {
        $oldCode = $item->qr_code;
        
        // Generate new code
        $newCode = $this->generateUniqueCode($item, true);
        
        // Generate QR code image
        $qrCodeImage = QrCode::format('png')
            ->size(300)
            ->margin(2)
            ->errorCorrection('H')
            ->generate($newCode);
            
        // Save to storage
        $this->saveQrCodeImage($newCode, $qrCodeImage);
        
        // Update item
        $item->update([
            'qr_code' => $newCode,
            'qr_generated_at' => now(),
        ]);
        
        // Record regeneration event
        QrTracking::recordGeneration($newCode, [
            'item_type' => 'bom_item',
            'item_id' => $item->id,
            'item_number' => $item->item_number,
            'old_code' => $oldCode,
            'reason' => $reason,
        ]);
        
        return $newCode;
    }

    /**
     * Get QR code image URL.
     */
    public function getQrCodeUrl(string $code): ?string
    {
        $path = $this->getQrCodePath($code);
        
        if (Storage::disk('s3')->exists($path)) {
            return Storage::disk('s3')->url($path);
        }
        
        return null;
    }

    /**
     * Generate a unique QR code.
     */
    protected function generateUniqueCode(BomItem $item, bool $force = false): string
    {
        $attempts = 0;
        
        do {
            $code = sprintf(
                'PRD-%s-%s-%s',
                strtoupper(substr($item->item_type, 0, 3)),
                Str::upper(Str::limit(Str::slug($item->item_number), 10, '')),
                strtoupper(Str::random(6))
            );
            
            $attempts++;
            
            if ($attempts > 10) {
                // Fallback to timestamp-based code
                $code = sprintf(
                    'PRD-%s-%s',
                    now()->format('YmdHis'),
                    strtoupper(Str::random(4))
                );
            }
        } while (!$force && BomItem::where('qr_code', $code)->exists());
        
        return $code;
    }

    /**
     * Generate a custom QR code.
     */
    protected function generateCustomCode(string $prefix): string
    {
        $attempts = 0;
        
        do {
            $code = sprintf(
                '%s-%s-%s',
                strtoupper($prefix),
                now()->format('Ymd'),
                strtoupper(Str::random(8))
            );
            
            $attempts++;
        } while ($attempts < 10 && QrTracking::where('qr_code', $code)->exists());
        
        return $code;
    }

    /**
     * Save QR code image to storage.
     */
    protected function saveQrCodeImage(string $code, string $imageData): string
    {
        $path = $this->getQrCodePath($code);
        
        Storage::disk('s3')->put($path, $imageData, 'public');
        
        return $path;
    }

    /**
     * Get QR code storage path.
     */
    protected function getQrCodePath(string $code): string
    {
        $date = now()->format('Y/m/d');
        return "production/qr-codes/{$date}/{$code}.png";
    }

    /**
     * Validate QR code format.
     */
    public function validateQrCode(string $code): bool
    {
        // Check basic format
        if (!preg_match('/^[A-Z0-9\-]+$/', $code)) {
            return false;
        }
        
        // Check if code exists in system
        return BomItem::where('qr_code', $code)->exists() ||
               QrTracking::where('qr_code', $code)->exists();
    }

    /**
     * Decode QR code data.
     */
    public function decodeQrCode(string $data): array
    {
        // Try to decode as JSON first
        $decoded = json_decode($data, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        
        // Otherwise, treat as simple code
        return ['code' => $data];
    }
}