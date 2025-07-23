<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipment_number',
        'shipment_type',
        'destination_type',
        'destination_reference',
        'destination_details',
        'status',
        'scheduled_ship_date',
        'actual_ship_date',
        'estimated_delivery_date',
        'actual_delivery_date',
        'manifest_generated_at',
        'manifest_path',
        'carrier',
        'tracking_number',
        'freight_cost',
        'created_by',
    ];

    protected $casts = [
        'destination_details' => 'array',
        'scheduled_ship_date' => 'date',
        'actual_ship_date' => 'datetime',
        'estimated_delivery_date' => 'date',
        'actual_delivery_date' => 'datetime',
        'manifest_generated_at' => 'datetime',
        'freight_cost' => 'decimal:2',
    ];

    /**
     * Get the user who created the shipment.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the items in the shipment.
     */
    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    /**
     * Get the photos for the shipment.
     */
    public function photos(): HasMany
    {
        return $this->hasMany(ShipmentPhoto::class);
    }

    /**
     * Scope for shipments with a specific status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for shipments scheduled in a date range.
     */
    public function scopeScheduledBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('scheduled_ship_date', [$startDate, $endDate]);
    }

    /**
     * Scope for shipments by type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('shipment_type', $type);
    }

    /**
     * Get the total weight of the shipment.
     */
    public function getTotalWeightAttribute()
    {
        return $this->items->sum('weight');
    }

    /**
     * Get the total quantity of items.
     */
    public function getTotalQuantityAttribute()
    {
        return $this->items->sum('quantity');
    }

    /**
     * Get the package count.
     */
    public function getPackageCountAttribute()
    {
        return $this->items->pluck('package_number')->unique()->count();
    }

    /**
     * Check if the shipment is ready to ship.
     */
    public function getIsReadyToShipAttribute()
    {
        return $this->status === 'ready' && 
               $this->items->count() > 0 &&
               $this->destination_details !== null;
    }

    /**
     * Check if the shipment is overdue.
     */
    public function getIsOverdueAttribute()
    {
        return $this->scheduled_ship_date && 
               $this->scheduled_ship_date < now()->startOfDay() && 
               in_array($this->status, ['draft', 'ready']);
    }

    /**
     * Check if the shipment has been delivered.
     */
    public function getIsDeliveredAttribute()
    {
        return $this->status === 'delivered' && $this->actual_delivery_date !== null;
    }

    /**
     * Mark the shipment as ready.
     */
    public function markAsReady()
    {
        if ($this->items->count() === 0) {
            throw new \Exception('Cannot mark empty shipment as ready.');
        }

        $this->update(['status' => 'ready']);
    }

    /**
     * Ship the shipment.
     */
    public function ship($carrier = null, $trackingNumber = null)
    {
        if ($this->status !== 'ready') {
            throw new \Exception('Only ready shipments can be shipped.');
        }

        $this->update([
            'status' => 'in_transit',
            'actual_ship_date' => now(),
            'carrier' => $carrier ?? $this->carrier,
            'tracking_number' => $trackingNumber ?? $this->tracking_number,
        ]);
    }

    /**
     * Mark the shipment as delivered.
     */
    public function markAsDelivered($deliveryDate = null)
    {
        if ($this->status !== 'in_transit') {
            throw new \Exception('Only in-transit shipments can be marked as delivered.');
        }

        $this->update([
            'status' => 'delivered',
            'actual_delivery_date' => $deliveryDate ?? now(),
        ]);
    }

    /**
     * Cancel the shipment.
     */
    public function cancel()
    {
        if (in_array($this->status, ['in_transit', 'delivered'])) {
            throw new \Exception('Cannot cancel shipped or delivered shipments.');
        }

        $this->update(['status' => 'cancelled']);
    }

    /**
     * Generate a unique shipment number.
     */
    public static function generateShipmentNumber()
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        
        $lastShipment = static::where('shipment_number', 'like', "SH-{$year}{$month}-%")
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastShipment 
            ? intval(substr($lastShipment->shipment_number, -4)) + 1 
            : 1;
        
        return sprintf('SH-%s%s-%04d', $year, $month, $sequence);
    }

    /**
     * Get the tracking URL.
     */
    public function getTrackingUrlAttribute()
    {
        if (!$this->carrier || !$this->tracking_number) {
            return null;
        }

        $carriers = [
            'fedex' => 'https://www.fedex.com/fedextrack/?tracknumbers=',
            'ups' => 'https://www.ups.com/track?tracknum=',
            'dhl' => 'https://www.dhl.com/en/express/tracking.html?AWB=',
            'usps' => 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=',
        ];

        $carrierLower = strtolower($this->carrier);
        
        if (isset($carriers[$carrierLower])) {
            return $carriers[$carrierLower] . $this->tracking_number;
        }

        return null;
    }
}