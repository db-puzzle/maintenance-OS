<?php

namespace App\Models\Production;

use App\Models\Settings\UnitOfMeasure;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'manufacturing_order_id',
        'manufacturing_step_id',
        'quantity_shipped',
        'quantity_received',
        'quantity_rejected',
        'item_code',
        'item_name',
        'item_description',
        'package_count',
        'package_type',
        'notes',
        'rejection_reason',
        // Legacy fields for backward compatibility
        'bom_item_id',
        'item_number',
        'description',
        'quantity',
        'unit_of_measure_code',
        'package_number',
        'weight',
        'dimensions',
        'qr_codes',
    ];

    protected $casts = [
        'quantity_shipped' => 'decimal:2',
        'quantity_received' => 'decimal:2',
        'quantity_rejected' => 'decimal:2',
        // Legacy casts
        'quantity' => 'decimal:2',
        'weight' => 'decimal:2',
        'dimensions' => 'array',
        'qr_codes' => 'array',
    ];

    protected $appends = ['is_fully_received', 'quantity_pending'];

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
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'manufacturing_order_id');
    }

    /**
     * Get the unit of measure.
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'unit_of_measure_code', 'code');
    }

    /**
     * Get the manufacturing step (for external processing shipments).
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            // Denormalize item details for history (logistics module)
            if ($item->manufacturingOrder && ! $item->item_name) {
                $productItem = $item->manufacturingOrder->item;
                $item->item_code = $productItem->code ?? null;
                $item->item_name = $productItem->name ?? null;
                $item->item_description = $productItem->description ?? null;
            }
        });
    }

    /**
     * Scope for items in a specific package.
     */
    public function scopeInPackage($query, $packageNumber)
    {
        return $query->where('package_number', $packageNumber);
    }

    /**
     * Check if fully received (logistics module).
     */
    public function getIsFullyReceivedAttribute(): bool
    {
        return $this->quantity_received >= $this->quantity_shipped;
    }

    /**
     * Get quantity pending receipt (logistics module).
     */
    public function getQuantityPendingAttribute(): float
    {
        return max(0, ($this->quantity_shipped ?? 0) - ($this->quantity_received ?? 0));
    }

    /**
     * Record quantity received (logistics module).
     *
     * @param float $quantity Quantity received
     * @param float $rejectedQuantity Rejected quantity
     * @param string|null $rejectionReason Reason for rejection
     */
    public function recordReceipt(
        float $quantity,
        float $rejectedQuantity = 0,
        ?string $rejectionReason = null
    ): void {
        $this->increment('quantity_received', $quantity);

        if ($rejectedQuantity > 0) {
            $this->increment('quantity_rejected', $rejectedQuantity);
            $this->update(['rejection_reason' => $rejectionReason]);
        }

        // Update related manufacturing step
        if ($this->manufacturing_step_id) {
            $step = $this->manufacturingStep;
            if ($step) {
                $step->recordQuantityReceived($quantity);
            }
        }

        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->withProperties([
                'quantity' => $quantity,
                'rejected' => $rejectedQuantity,
                'reason' => $rejectionReason,
            ])
            ->log('Shipment item receipt recorded');
    }

    /**
     * Get the volume of the item.
     */
    public function getVolumeAttribute()
    {
        if (! $this->dimensions || ! isset($this->dimensions['length']) ||
            ! isset($this->dimensions['width']) || ! isset($this->dimensions['height'])) {
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

        if (! $volume) {
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

        if (! $dimensionalWeight) {
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

        if (! in_array($qrCode, $qrCodes)) {
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
