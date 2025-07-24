<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'bom_item_id',
        'production_order_id',
        'item_number',
        'description',
        'quantity',
        'unit_of_measure',
        'package_number',
        'package_type',
        'weight',
        'dimensions',
        'qr_codes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'weight' => 'decimal:2',
        'dimensions' => 'array',
        'qr_codes' => 'array',
    ];

    /**
     * Get the shipment that owns the item.
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Get the BOM item.
     */
    public function bomItem(): BelongsTo
    {
        return $this->belongsTo(BomItem::class, 'bom_item_id');
    }

    /**
     * Get the production order.
     */
    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    /**
     * Scope for items in a specific package.
     */
    public function scopeInPackage($query, $packageNumber)
    {
        return $query->where('package_number', $packageNumber);
    }

    /**
     * Get the volume of the item.
     */
    public function getVolumeAttribute()
    {
        if (!$this->dimensions || !isset($this->dimensions['length']) || 
            !isset($this->dimensions['width']) || !isset($this->dimensions['height'])) {
            return null;
        }

        return $this->dimensions['length'] * 
               $this->dimensions['width'] * 
               $this->dimensions['height'];
    }

    /**
     * Get the dimensional weight.
     */
    public function getDimensionalWeightAttribute()
    {
        $volume = $this->volume;
        
        if (!$volume) {
            return null;
        }

        // Standard dimensional weight factor (166 for inches, 5000 for cm)
        $factor = ($this->dimensions['unit'] ?? 'cm') === 'in' ? 166 : 5000;
        
        return $volume / $factor;
    }

    /**
     * Get the billable weight (greater of actual or dimensional).
     */
    public function getBillableWeightAttribute()
    {
        $dimensionalWeight = $this->dimensional_weight;
        
        if (!$dimensionalWeight) {
            return $this->weight;
        }

        return max($this->weight, $dimensionalWeight);
    }

    /**
     * Add a QR code to the item.
     */
    public function addQrCode($qrCode)
    {
        $qrCodes = $this->qr_codes ?? [];
        
        if (!in_array($qrCode, $qrCodes)) {
            $qrCodes[] = $qrCode;
            $this->update(['qr_codes' => $qrCodes]);
        }
    }

    /**
     * Remove a QR code from the item.
     */
    public function removeQrCode($qrCode)
    {
        $qrCodes = $this->qr_codes ?? [];
        $qrCodes = array_values(array_diff($qrCodes, [$qrCode]));
        
        $this->update(['qr_codes' => $qrCodes]);
    }

    /**
     * Check if the item has a specific QR code.
     */
    public function hasQrCode($qrCode)
    {
        return in_array($qrCode, $this->qr_codes ?? []);
    }

    /**
     * Update package information.
     */
    public function updatePackage($packageNumber, $packageType = null)
    {
        $this->update([
            'package_number' => $packageNumber,
            'package_type' => $packageType ?? $this->package_type,
        ]);
    }

    /**
     * Split the item into multiple items.
     */
    public function split($quantities)
    {
        $totalQuantity = array_sum($quantities);
        
        if ($totalQuantity > $this->quantity) {
            throw new \Exception('Total split quantity exceeds item quantity.');
        }

        $newItems = [];
        
        foreach ($quantities as $index => $quantity) {
            if ($index === 0) {
                // Update the original item
                $this->update(['quantity' => $quantity]);
                $newItems[] = $this;
            } else {
                // Create new items
                $newItem = $this->replicate(['qr_codes']);
                $newItem->quantity = $quantity;
                $newItem->save();
                $newItems[] = $newItem;
            }
        }

        return $newItems;
    }
}