<?php

namespace App\Models\Production;

use App\Models\User;
use App\Traits\HasMediaTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\UploadedFile;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Shipment extends Model implements HasMedia
{
    use HasFactory;
    use HasMediaTrait;

    protected $fillable = [
        'shipment_number',
        'destination_type',
        'destination_id',
        'destination_name',
        'destination_address',
        'shipping_method',
        'carrier_name',
        'tracking_number',
        'planned_ship_date',
        'actual_ship_date',
        'expected_delivery_date',
        'actual_delivery_date',
        'status',
        'packing_list_generated',
        'packing_list_path',
        'shipping_notes',
        'receiving_notes',
        'created_by',
        'shipped_by',
        'received_by',
        // Legacy fields for backward compatibility
        'shipment_type',
        'destination_reference',
        'destination_details',
        'scheduled_ship_date',
        'estimated_delivery_date',
        'manifest_generated_at',
        'manifest_path',
        'carrier',
        'freight_cost',
    ];

    protected $casts = [
        'planned_ship_date' => 'date',
        'actual_ship_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'packing_list_generated' => 'boolean',
        // Legacy casts
        'destination_details' => 'array',
        'scheduled_ship_date' => 'date',
        'estimated_delivery_date' => 'date',
        'manifest_generated_at' => 'datetime',
        'freight_cost' => 'decimal:2',
    ];

    protected $appends = ['total_items', 'is_overdue'];

    public const STATUSES = [
        'planned' => 'Planned',
        'packed' => 'Packed',
        'shipped' => 'Shipped',
        'in_transit' => 'In Transit',
        'delivered' => 'Delivered',
        'received' => 'Received',
    ];

    public const DESTINATION_TYPES = [
        'manufacturer' => 'External Manufacturer',
        'customer' => 'Customer',
        'warehouse' => 'Warehouse',
        'work_cell' => 'Work Cell',
    ];

    public const SHIPPING_METHODS = [
        'courier' => 'Courier',
        'freight' => 'Freight',
        'pickup' => 'Pickup',
        'internal' => 'Internal Transfer',
        'other' => 'Other',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($shipment) {
            if (! $shipment->shipment_number) {
                $shipment->shipment_number = static::generateLogisticsShipmentNumber();
            }

            if (! $shipment->created_by) {
                $shipment->created_by = auth()->id();
            }
        });
    }

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
     * Get the user who shipped the shipment.
     */
    public function shipper(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shipped_by');
    }

    /**
     * Get the user who received the shipment.
     */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /**
     * Get the destination (polymorphic).
     */
    public function destination(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope for shipments with a specific status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for shipments by status (alias).
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for shipments to manufacturers.
     */
    public function scopeToManufacturers($query)
    {
        return $query->where('destination_type', 'manufacturer');
    }

    /**
     * Scope for overdue shipments.
     */
    public function scopeOverdue($query)
    {
        return $query->where('expected_delivery_date', '<', now())
            ->whereIn('status', ['shipped', 'in_transit']);
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
     * Legacy format: SH-YYYYMM-XXXX.
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
     * Generate unique shipment number for logistics module.
     * Format: SHIP-YYYYMMDD-XXXX.
     */
    public static function generateLogisticsShipmentNumber(): string
    {
        $date = now()->format('Ymd');
        $prefix = "SHIP-{$date}-";

        $lastShipment = static::where('shipment_number', 'like', "{$prefix}%")
            ->orderBy('shipment_number', 'desc')
            ->first();

        if ($lastShipment) {
            $lastNumber = (int) substr($lastShipment->shipment_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Mark shipment as shipped (logistics module).
     *
     * @param string|null $trackingNumber Tracking number
     * @param string|null $carrierName Carrier name
     */
    public function markAsShipped(?string $trackingNumber = null, ?string $carrierName = null): void
    {
        $this->update([
            'status' => 'shipped',
            'actual_ship_date' => now(),
            'tracking_number' => $trackingNumber,
            'carrier_name' => $carrierName,
            'shipped_by' => auth()->id(),
        ]);

        // Update related manufacturing steps
        foreach ($this->items as $item) {
            if ($item->manufacturing_step_id) {
                $step = $item->manufacturingStep;
                if ($step && $step->external_status === 'awaiting_shipment') {
                    $step->markAsShipped($item->quantity_shipped);
                }
            }
        }

        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->withProperties([
                'tracking_number' => $trackingNumber,
                'carrier' => $carrierName,
            ])
            ->log('Shipment marked as shipped');
    }

    /**
     * Mark shipment as received (logistics module).
     *
     * @param string|null $notes Receiving notes
     */
    public function markAsReceived(?string $notes = null): void
    {
        $this->update([
            'status' => 'received',
            'actual_delivery_date' => now(),
            'receiving_notes' => $notes,
            'received_by' => auth()->id(),
        ]);

        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->withProperties(['notes' => $notes])
            ->log('Shipment marked as received');
    }

    /**
     * Check if can be shipped (logistics module).
     */
    public function canShip(): bool
    {
        return $this->status === 'planned' || $this->status === 'packed';
    }

    /**
     * Check if can be received (logistics module).
     */
    public function canReceive(): bool
    {
        return $this->status === 'delivered' || $this->status === 'shipped' || $this->status === 'in_transit';
    }

    /**
     * Get total item count.
     */
    public function getTotalItemsAttribute(): int
    {
        return $this->items()->count();
    }

    /**
     * Get the tracking URL.
     */
    public function getTrackingUrlAttribute()
    {
        if (! $this->carrier || ! $this->tracking_number) {
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

    /**
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png'])
            ->useFallbackUrl('/images/no-shipment-photo.jpg');
    }

    /**
     * Store shipment photo with GPS data.
     */
    public function addShipmentPhoto(UploadedFile $file, array $gpsData = []): Media
    {
        return $this->addMedia($file)
            ->withCustomProperties([
                'gps_latitude' => $gpsData['latitude'] ?? null,
                'gps_longitude' => $gpsData['longitude'] ?? null,
                'gps_altitude' => $gpsData['altitude'] ?? null,
                'captured_at' => $gpsData['captured_at'] ?? now(),
            ])
            ->toMediaCollection('photos');
    }
}
