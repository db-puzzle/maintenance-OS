# Logistics Module - Complete Specification

## Executive Summary

This specification details a comprehensive Logistics Module for managing the shipping and receiving of manufactured items. The module handles:

- **Outbound Shipments**: Sending items to external manufacturers for processing
- **Inbound Receipts**: Receiving processed items back from manufacturers
- **Customer Shipments**: Delivering completed products to customers
- **Multi-MO Bundling**: Grouping multiple manufacturing orders in single shipments
- **Photo Documentation**: Visual confirmation of shipped and received items
- **Packing Lists**: Automated generation of shipping documentation
- **Status Tracking**: Real-time visibility of items in transit

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Model Definitions](#model-definitions)
4. [Backend Services](#backend-services)
5. [Backend Controllers & Routes](#backend-controllers--routes)
6. [Frontend Type Definitions](#frontend-type-definitions)
7. [Frontend UI Components](#frontend-ui-components)
8. [Dashboards & Pages](#dashboards--pages)
9. [Workflow Examples](#workflow-examples)
10. [Integration Points](#integration-points)
11. [Testing Requirements](#testing-requirements)
12. [QR Code Integration](#qr-code-integration)
13. [Future Enhancements](#future-enhancements)

---

## 1. Overview

### 1.1 Core Concepts

**Shipment**: A physical delivery of one or more items from one location to another. Can contain:
- Multiple manufacturing orders (parent MOs with children)
- Items for different external manufacturing steps
- Finished products going to customers

**Shipment Item**: Individual line item within a shipment, representing:
- A specific manufacturing order
- A quantity of that order
- The destination step (for external processing shipments)

**Destination Types**:
- `manufacturer`: Items going to external manufacturer for processing
- `customer`: Finished goods being delivered to customer
- `warehouse`: Items being moved to storage (future)
- `work_cell`: Items being moved between internal work cells (future)

**Status Flow**:
```
planned → packed → shipped → in_transit → delivered → received
```

### 1.2 Key Features

1. **Smart Bundling**: Automatically suggests items that should ship together
2. **Photo Documentation**: Capture photos before shipping and after receiving
3. **Packing Lists**: Auto-generate PDF packing lists
4. **Tracking**: Monitor items in transit
5. **Partial Shipments**: Ship portions of MO quantities
6. **Multi-Destination**: Handle complex shipping scenarios

### 1.3 User Roles

- **Production Planner**: Plans which items need shipping
- **Shipping Coordinator**: Creates shipments, generates packing lists
- **Receiving Clerk**: Records incoming shipments
- **Quality Inspector**: Inspects received items

---

## 2. Database Schema

### 2.1 Shipments Table

```sql
-- Migration: YYYY_MM_DD_HHMMSS_create_shipments_table.php

CREATE TABLE shipments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Shipment identification
    shipment_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Auto-generated: SHIP-YYYYMMDD-XXXX',
    
    -- Destination
    destination_type ENUM('manufacturer', 'customer', 'warehouse', 'work_cell') NOT NULL,
    destination_id BIGINT UNSIGNED NULL COMMENT 'ID of manufacturer/customer/warehouse/work_cell',
    
    -- Destination details (denormalized for history)
    destination_name VARCHAR(255) NULL,
    destination_address TEXT NULL,
    
    -- Shipping details
    shipping_method ENUM('courier', 'freight', 'pickup', 'internal', 'other') DEFAULT 'courier',
    carrier_name VARCHAR(255) NULL COMMENT 'UPS, FedEx, etc.',
    tracking_number VARCHAR(255) NULL,
    
    -- Dates
    planned_ship_date DATE NULL,
    actual_ship_date DATE NULL,
    expected_delivery_date DATE NULL,
    actual_delivery_date DATE NULL,
    
    -- Status
    status ENUM('planned', 'packed', 'shipped', 'in_transit', 'delivered', 'received') DEFAULT 'planned',
    
    -- Documentation
    packing_list_generated BOOLEAN DEFAULT FALSE,
    packing_list_path VARCHAR(500) NULL COMMENT 'Path to PDF file',
    
    -- Notes
    shipping_notes TEXT NULL,
    receiving_notes TEXT NULL,
    
    -- User tracking
    created_by BIGINT UNSIGNED NULL,
    shipped_by BIGINT UNSIGNED NULL COMMENT 'User who marked as shipped',
    received_by BIGINT UNSIGNED NULL COMMENT 'User who received the shipment',
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (shipped_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_shipment_number (shipment_number),
    INDEX idx_status (status),
    INDEX idx_destination (destination_type, destination_id),
    INDEX idx_dates (planned_ship_date, actual_ship_date),
    INDEX idx_tracking (tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 Shipment Items Table

```sql
-- Migration: YYYY_MM_DD_HHMMSS_create_shipment_items_table.php

CREATE TABLE shipment_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Shipment reference
    shipment_id BIGINT UNSIGNED NOT NULL,
    
    -- Manufacturing order reference
    manufacturing_order_id BIGINT UNSIGNED NOT NULL,
    
    -- Step reference (for external processing shipments)
    manufacturing_step_id BIGINT UNSIGNED NULL COMMENT 'Which step needs external processing',
    
    -- Quantities
    quantity_shipped DECIMAL(10,2) NOT NULL,
    quantity_received DECIMAL(10,2) DEFAULT 0,
    quantity_rejected DECIMAL(10,2) DEFAULT 0 COMMENT 'Failed QC on receipt',
    
    -- Item details (denormalized for history)
    item_code VARCHAR(100) NULL,
    item_name VARCHAR(255) NULL,
    item_description TEXT NULL,
    
    -- Packaging
    package_count INT NULL COMMENT 'Number of boxes/pallets',
    package_type ENUM('box', 'pallet', 'crate', 'bag', 'other') NULL,
    
    -- Notes
    notes TEXT NULL,
    rejection_reason TEXT NULL COMMENT 'Why items were rejected on receipt',
    
    -- Metadata
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturing_order_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturing_step_id) REFERENCES manufacturing_steps(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_shipment (shipment_id),
    INDEX idx_mo (manufacturing_order_id),
    INDEX idx_step (manufacturing_step_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 Shipment Photos Table

Using Laravel Media Library (existing), but for clarity:

```sql
-- Photos are stored via Spatie Media Library
-- Associated to shipments via media collection: 'shipment_photos'
-- Custom properties:
--   - type: 'pre_shipment' | 'post_receipt'
--   - taken_by: user_id
--   - notes: string
```

### 2.4 Additional Indexes

```sql
-- Performance indexes for common queries

-- Find shipments by manufacturer
CREATE INDEX idx_shipments_manufacturer 
ON shipments(destination_type, destination_id, status) 
WHERE destination_type = 'manufacturer';

-- Find overdue shipments
CREATE INDEX idx_shipments_overdue 
ON shipments(expected_delivery_date, status) 
WHERE status IN ('shipped', 'in_transit');

-- Find items to ship for a step
CREATE INDEX idx_shipment_items_by_step 
ON shipment_items(manufacturing_step_id, shipment_id);
```

---

## 3. Model Definitions

### 3.1 Shipment Model

**File**: `app/Models/Logistics/Shipment.php`

```php
<?php

namespace App\Models\Logistics;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\Manufacturer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Shipment extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

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
    ];

    protected $casts = [
        'planned_ship_date' => 'date',
        'actual_ship_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'packing_list_generated' => 'boolean',
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
            if (!$shipment->shipment_number) {
                $shipment->shipment_number = static::generateShipmentNumber();
            }

            if (!$shipment->created_by) {
                $shipment->created_by = auth()->id();
            }
        });
    }

    /**
     * Get the shipment items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    /**
     * Get the destination (polymorphic).
     */
    public function destination(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who created the shipment.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('shipment_photos')
            ->useDisk('public');

        $this->addMediaCollection('packing_lists')
            ->singleFile()
            ->useDisk('public');
    }

    /**
     * Scope for shipments by status.
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
     * Generate unique shipment number.
     */
    public static function generateShipmentNumber(): string
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
     * Get total item count.
     */
    public function getTotalItemsAttribute(): int
    {
        return $this->items()->count();
    }

    /**
     * Check if shipment is overdue.
     */
    public function getIsOverdueAttribute(): bool
    {
        if (!$this->expected_delivery_date) {
            return false;
        }

        if (in_array($this->status, ['delivered', 'received'])) {
            return false;
        }

        return $this->expected_delivery_date->isPast();
    }

    /**
     * Mark shipment as shipped.
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
     * Mark shipment as received.
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
     * Get total weight (if needed for shipping).
     */
    public function getTotalWeight(): float
    {
        return $this->items->sum(function ($item) {
            return $item->quantity_shipped * ($item->manufacturingOrder->item->weight ?? 0);
        });
    }

    /**
     * Check if can be shipped.
     */
    public function canShip(): bool
    {
        return $this->status === 'planned' || $this->status === 'packed';
    }

    /**
     * Check if can be received.
     */
    public function canReceive(): bool
    {
        return $this->status === 'delivered' || $this->status === 'shipped' || $this->status === 'in_transit';
    }
}
```

### 3.2 ShipmentItem Model

**File**: `app/Models/Logistics/ShipmentItem.php`

```php
<?php

namespace App\Models\Logistics;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
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
    ];

    protected $casts = [
        'quantity_shipped' => 'decimal:2',
        'quantity_received' => 'decimal:2',
        'quantity_rejected' => 'decimal:2',
    ];

    protected $appends = ['is_fully_received', 'quantity_pending'];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            // Denormalize item details for history
            if ($item->manufacturingOrder) {
                $productItem = $item->manufacturingOrder->item;
                $item->item_code = $productItem->code ?? null;
                $item->item_name = $productItem->name ?? null;
                $item->item_description = $productItem->description ?? null;
            }
        });
    }

    /**
     * Get the shipment.
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Get the manufacturing order.
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }

    /**
     * Get the manufacturing step.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Check if fully received.
     */
    public function getIsFullyReceivedAttribute(): bool
    {
        return $this->quantity_received >= $this->quantity_shipped;
    }

    /**
     * Get quantity pending receipt.
     */
    public function getQuantityPendingAttribute(): float
    {
        return max(0, $this->quantity_shipped - $this->quantity_received);
    }

    /**
     * Record quantity received.
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
                $step->markAsReceived($quantity);
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
}
```

---

## 4. Backend Services

### 4.1 ShipmentService

**File**: `app/Services/Logistics/ShipmentService.php`

```php
<?php

namespace App\Services\Logistics;

use App\Models\Logistics\Shipment;
use App\Models\Logistics\ShipmentItem;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Manufacturer;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ShipmentService
{
    /**
     * Get suggested shipments (items that should ship together).
     */
    public function getSuggestedShipments(): Collection
    {
        // Group steps by manufacturer and expected ship date
        $steps = ManufacturingStep::awaitingShipment()
            ->with(['manufacturer', 'manufacturingRoute.manufacturingOrder.item'])
            ->get();

        $grouped = $steps->groupBy(function ($step) {
            $date = $step->scheduled_start?->format('Y-m-d') ?? 'unscheduled';
            return "{$step->manufacturer_id}_{$date}";
        });

        return $grouped->map(function ($steps, $key) {
            [$manufacturerId, $date] = explode('_', $key);
            
            return [
                'manufacturer_id' => $manufacturerId,
                'manufacturer' => $steps->first()->manufacturer,
                'planned_ship_date' => $date !== 'unscheduled' ? $date : null,
                'steps' => $steps,
                'total_orders' => $steps->pluck('manufacturingRoute.manufacturing_order_id')->unique()->count(),
            ];
        })->values();
    }

    /**
     * Create a shipment with items.
     */
    public function createShipment(array $data, array $items): Shipment
    {
        return DB::transaction(function () use ($data, $items) {
            // Create shipment
            $shipment = Shipment::create([
                'destination_type' => $data['destination_type'],
                'destination_id' => $data['destination_id'] ?? null,
                'destination_name' => $data['destination_name'] ?? null,
                'destination_address' => $data['destination_address'] ?? null,
                'shipping_method' => $data['shipping_method'] ?? 'courier',
                'carrier_name' => $data['carrier_name'] ?? null,
                'planned_ship_date' => $data['planned_ship_date'] ?? null,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'shipping_notes' => $data['shipping_notes'] ?? null,
                'status' => 'planned',
            ]);

            // Create shipment items
            foreach ($items as $itemData) {
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'manufacturing_order_id' => $itemData['manufacturing_order_id'],
                    'manufacturing_step_id' => $itemData['manufacturing_step_id'] ?? null,
                    'quantity_shipped' => $itemData['quantity'],
                    'package_count' => $itemData['package_count'] ?? null,
                    'package_type' => $itemData['package_type'] ?? null,
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            activity()
                ->performedOn($shipment)
                ->causedBy(auth()->user())
                ->withProperties(['item_count' => count($items)])
                ->log('Shipment created');

            return $shipment->load(['items.manufacturingOrder.item', 'items.manufacturingStep']);
        });
    }

    /**
     * Mark shipment as shipped with photos.
     */
    public function markAsShipped(
        Shipment $shipment,
        array $data,
        array $photos = []
    ): Shipment {
        DB::transaction(function () use ($shipment, $data, $photos) {
            $shipment->markAsShipped(
                $data['tracking_number'] ?? null,
                $data['carrier_name'] ?? null
            );

            // Handle photos
            foreach ($photos as $photo) {
                $shipment->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'pre_shipment',
                        'taken_by' => auth()->id(),
                        'notes' => $data['photo_notes'] ?? null,
                    ])
                    ->toMediaCollection('shipment_photos');
            }
        });

        return $shipment->fresh(['items']);
    }

    /**
     * Mark shipment as received with photos and item receipts.
     */
    public function markAsReceived(
        Shipment $shipment,
        array $itemReceipts,
        ?string $notes = null,
        array $photos = []
    ): Shipment {
        DB::transaction(function () use ($shipment, $itemReceipts, $notes, $photos) {
            // Record receipt for each item
            foreach ($itemReceipts as $receipt) {
                $item = ShipmentItem::find($receipt['item_id']);
                if ($item) {
                    $item->recordReceipt(
                        $receipt['quantity_received'],
                        $receipt['quantity_rejected'] ?? 0,
                        $receipt['rejection_reason'] ?? null
                    );
                }
            }

            // Mark shipment as received
            $shipment->markAsReceived($notes);

            // Handle photos
            foreach ($photos as $photo) {
                $shipment->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'post_receipt',
                        'taken_by' => auth()->id(),
                        'notes' => $notes,
                    ])
                    ->toMediaCollection('shipment_photos');
            }
        });

        return $shipment->fresh(['items']);
    }

    /**
     * Get shipments by destination.
     */
    public function getShipmentsByDestination(
        string $destinationType,
        int $destinationId
    ): Collection {
        return Shipment::where('destination_type', $destinationType)
            ->where('destination_id', $destinationId)
            ->with(['items.manufacturingOrder.item'])
            ->orderBy('planned_ship_date', 'desc')
            ->get();
    }

    /**
     * Get overdue shipments.
     */
    public function getOverdueShipments(): Collection
    {
        return Shipment::overdue()
            ->with(['items.manufacturingOrder.item', 'destination'])
            ->get();
    }

    /**
     * Get shipments awaiting receipt.
     */
    public function getShipmentsAwaitingReceipt(): Collection
    {
        return Shipment::whereIn('status', ['shipped', 'in_transit', 'delivered'])
            ->where('destination_type', '!=', 'customer') // Don't show customer shipments
            ->with(['items.manufacturingOrder.item'])
            ->orderBy('expected_delivery_date')
            ->get();
    }
}
```

### 4.2 PackingListService

**File**: `app/Services/Logistics/PackingListService.php`

```php
<?php

namespace App\Services\Logistics;

use App\Models\Logistics\Shipment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class PackingListService
{
    /**
     * Generate packing list PDF for shipment.
     */
    public function generatePackingList(Shipment $shipment): string
    {
        $pdf = Pdf::loadView('pdf.packing-list', [
            'shipment' => $shipment->load([
                'items.manufacturingOrder.item',
                'items.manufacturingStep',
                'destination',
            ]),
        ]);

        $filename = "packing-lists/{$shipment->shipment_number}.pdf";
        $path = Storage::disk('public')->putFileAs(
            'packing-lists',
            $pdf->output(),
            "{$shipment->shipment_number}.pdf"
        );

        $shipment->update([
            'packing_list_generated' => true,
            'packing_list_path' => $path,
        ]);

        activity()
            ->performedOn($shipment)
            ->causedBy(auth()->user())
            ->log('Packing list generated');

        return $path;
    }

    /**
     * Get packing list data for preview.
     */
    public function getPackingListData(Shipment $shipment): array
    {
        $shipment->load([
            'items.manufacturingOrder.item',
            'items.manufacturingStep',
            'destination',
        ]);

        return [
            'shipment_number' => $shipment->shipment_number,
            'ship_date' => $shipment->planned_ship_date?->format('M d, Y'),
            'destination' => $this->formatDestination($shipment),
            'items' => $shipment->items->map(function ($item) {
                return [
                    'order_number' => $item->manufacturingOrder->order_number,
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'quantity' => $item->quantity_shipped,
                    'packages' => $item->package_count ? "{$item->package_count} {$item->package_type}" : '-',
                    'step' => $item->manufacturingStep?->name,
                    'notes' => $item->notes,
                ];
            }),
            'total_items' => $shipment->items->count(),
            'total_quantity' => $shipment->items->sum('quantity_shipped'),
            'total_packages' => $shipment->items->sum('package_count'),
        ];
    }

    /**
     * Format destination for packing list.
     */
    protected function formatDestination(Shipment $shipment): array
    {
        return [
            'name' => $shipment->destination_name ?? $shipment->destination?->name ?? 'Unknown',
            'address' => $shipment->destination_address ?? $this->getDestinationAddress($shipment),
        ];
    }

    /**
     * Get destination address from related model.
     */
    protected function getDestinationAddress(Shipment $shipment): ?string
    {
        if (!$shipment->destination) {
            return null;
        }

        $parts = array_filter([
            $shipment->destination->address ?? null,
            $shipment->destination->city ?? null,
            $shipment->destination->state ?? null,
            $shipment->destination->zip_code ?? null,
        ]);

        return implode(', ', $parts);
    }
}
```

---

## 5. Backend Controllers & Routes

### 5.1 ShipmentController

**File**: `app/Http/Controllers/Logistics/ShipmentController.php`

```php
<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Logistics\Shipment;
use App\Models\Production\Manufacturer;
use App\Services\Logistics\ShipmentService;
use App\Services\Logistics\PackingListService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShipmentController extends Controller
{
    public function __construct(
        protected ShipmentService $shipmentService,
        protected PackingListService $packingListService
    ) {}

    /**
     * Display shipments dashboard.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $shipments = Shipment::with([
                'items.manufacturingOrder.item',
                'destination',
            ])
            ->when($request->status, fn($q, $status) => $q->byStatus($status))
            ->when($request->destination_type, fn($q, $type) => $q->where('destination_type', $type))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('logistics/shipments/index', [
            'shipments' => $shipments,
            'filters' => $request->only(['status', 'destination_type']),
        ]);
    }

    /**
     * Show shipment creation form.
     */
    public function create(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $suggestions = $this->shipmentService->getSuggestedShipments();

        return Inertia::render('logistics/shipments/create', [
            'suggestions' => $suggestions,
            'manufacturers' => Manufacturer::select('id', 'name', 'address', 'city', 'state')->get(),
        ]);
    }

    /**
     * Store new shipment.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $validated = $request->validate([
            'destination_type' => 'required|in:manufacturer,customer,warehouse,work_cell',
            'destination_id' => 'nullable|integer',
            'destination_name' => 'nullable|string|max:255',
            'destination_address' => 'nullable|string',
            'shipping_method' => 'nullable|in:courier,freight,pickup,internal,other',
            'carrier_name' => 'nullable|string|max:255',
            'planned_ship_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'shipping_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'items.*.manufacturing_step_id' => 'nullable|exists:manufacturing_steps,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.package_count' => 'nullable|integer|min:1',
            'items.*.package_type' => 'nullable|in:box,pallet,crate,bag,other',
            'items.*.notes' => 'nullable|string',
        ]);

        $shipment = $this->shipmentService->createShipment(
            $validated,
            $validated['items']
        );

        return redirect()
            ->route('logistics.shipments.show', $shipment)
            ->with('success', 'Shipment created successfully');
    }

    /**
     * Display shipment details.
     */
    public function show(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $shipment->load([
            'items.manufacturingOrder.item',
            'items.manufacturingStep',
            'destination',
            'creator',
            'shipper',
            'receiver',
            'media',
        ]);

        return Inertia::render('logistics/shipments/show', [
            'shipment' => $shipment,
        ]);
    }

    /**
     * Mark shipment as shipped.
     */
    public function markAsShipped(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'tracking_number' => 'nullable|string|max:255',
            'carrier_name' => 'nullable|string|max:255',
            'photo_notes' => 'nullable|string',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $shipment = $this->shipmentService->markAsShipped(
            $shipment,
            $validated,
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Shipment marked as shipped');
    }

    /**
     * Mark shipment as received.
     */
    public function markAsReceived(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'receiving_notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.item_id' => 'required|exists:shipment_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0',
            'items.*.quantity_rejected' => 'nullable|numeric|min:0',
            'items.*.rejection_reason' => 'nullable|string',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $shipment = $this->shipmentService->markAsReceived(
            $shipment,
            $validated['items'],
            $validated['receiving_notes'] ?? null,
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Shipment marked as received');
    }

    /**
     * Generate packing list.
     */
    public function generatePackingList(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $path = $this->packingListService->generatePackingList($shipment);

        return response()->download(storage_path("app/public/{$path}"));
    }
}
```

### 5.2 Routes

**File**: `routes/logistics.php`

```php
<?php

use App\Http\Controllers\Logistics\ShipmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'tenant'])->group(function () {
    // Shipments
    Route::resource('shipments', ShipmentController::class);
    
    Route::post('shipments/{shipment}/mark-as-shipped', [ShipmentController::class, 'markAsShipped'])
        ->name('shipments.mark-as-shipped');
    
    Route::post('shipments/{shipment}/mark-as-received', [ShipmentController::class, 'markAsReceived'])
        ->name('shipments.mark-as-received');
    
    Route::get('shipments/{shipment}/packing-list', [ShipmentController::class, 'generatePackingList'])
        ->name('shipments.packing-list');
});
```

Add to `routes/tenant.php`:

```php
require __DIR__.'/logistics.php';
```

---

## 6. Frontend Type Definitions

**File**: `resources/js/types/logistics.ts`

```typescript
import { ManufacturingOrder, ManufacturingStep, Manufacturer } from './production';
import { User } from './user';

export type ShipmentStatus = 
    | 'planned' 
    | 'packed' 
    | 'shipped' 
    | 'in_transit' 
    | 'delivered' 
    | 'received';

export type DestinationType = 
    | 'manufacturer' 
    | 'customer' 
    | 'warehouse' 
    | 'work_cell';

export type ShippingMethod = 
    | 'courier' 
    | 'freight' 
    | 'pickup' 
    | 'internal' 
    | 'other';

export type PackageType = 
    | 'box' 
    | 'pallet' 
    | 'crate' 
    | 'bag' 
    | 'other';

export interface Shipment {
    id: number;
    shipment_number: string;
    
    destination_type: DestinationType;
    destination_id: number | null;
    destination_name: string | null;
    destination_address: string | null;
    destination?: Manufacturer | any; // Polymorphic
    
    shipping_method: ShippingMethod;
    carrier_name: string | null;
    tracking_number: string | null;
    
    planned_ship_date: string | null;
    actual_ship_date: string | null;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;
    
    status: ShipmentStatus;
    
    packing_list_generated: boolean;
    packing_list_path: string | null;
    
    shipping_notes: string | null;
    receiving_notes: string | null;
    
    created_by: number | null;
    shipped_by: number | null;
    received_by: number | null;
    
    creator?: User;
    shipper?: User;
    receiver?: User;
    
    items?: ShipmentItem[];
    media?: any[]; // Spatie Media
    
    total_items: number;
    is_overdue: boolean;
    
    created_at: string;
    updated_at: string;
}

export interface ShipmentItem {
    id: number;
    shipment_id: number;
    
    manufacturing_order_id: number;
    manufacturing_order?: ManufacturingOrder;
    
    manufacturing_step_id: number | null;
    manufacturing_step?: ManufacturingStep;
    
    quantity_shipped: number;
    quantity_received: number;
    quantity_rejected: number;
    
    item_code: string | null;
    item_name: string | null;
    item_description: string | null;
    
    package_count: number | null;
    package_type: PackageType | null;
    
    notes: string | null;
    rejection_reason: string | null;
    
    is_fully_received: boolean;
    quantity_pending: number;
    
    created_at: string;
    updated_at: string;
}

export interface ShipmentSuggestion {
    manufacturer_id: number;
    manufacturer: Manufacturer;
    planned_ship_date: string | null;
    steps: ManufacturingStep[];
    total_orders: number;
}

export interface CreateShipmentData {
    destination_type: DestinationType;
    destination_id?: number;
    destination_name?: string;
    destination_address?: string;
    shipping_method?: ShippingMethod;
    carrier_name?: string;
    planned_ship_date?: string;
    expected_delivery_date?: string;
    shipping_notes?: string;
    items: CreateShipmentItem[];
}

export interface CreateShipmentItem {
    manufacturing_order_id: number;
    manufacturing_step_id?: number;
    quantity: number;
    package_count?: number;
    package_type?: PackageType;
    notes?: string;
}

export interface MarkShippedData {
    tracking_number?: string;
    carrier_name?: string;
    photo_notes?: string;
    photos?: File[];
}

export interface MarkReceivedData {
    receiving_notes?: string;
    items: ReceiptItem[];
    photos?: File[];
}

export interface ReceiptItem {
    item_id: number;
    quantity_received: number;
    quantity_rejected?: number;
    rejection_reason?: string;
}
```

---

## 7. Frontend UI Components

### 7.1 ShipmentStatusBadge

**File**: `resources/js/components/logistics/ShipmentStatusBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { ShipmentStatus } from '@/types/logistics';
import { cn } from '@/lib/utils';

interface ShipmentStatusBadgeProps {
    status: ShipmentStatus;
    className?: string;
}

const statusConfig: Record<ShipmentStatus, { label: string; className: string }> = {
    planned: { 
        label: 'Planejado', 
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
    },
    packed: { 
        label: 'Embalado', 
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
    },
    shipped: { 
        label: 'Enviado', 
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
    },
    in_transit: { 
        label: 'Em Trânsito', 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
    },
    delivered: { 
        label: 'Entregue', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    },
    received: { 
        label: 'Recebido', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    },
};

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
    const config = statusConfig[status];
    
    return (
        <Badge className={cn(config.className, className)}>
            {config.label}
        </Badge>
    );
}
```

### 7.2 ShipmentCard

**File**: `resources/js/components/logistics/ShipmentCard.tsx`

```typescript
import React from 'react';
import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shipment } from '@/types/logistics';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { Package, Calendar, MapPin, AlertTriangle } from 'lucide-react';

interface ShipmentCardProps {
    shipment: Shipment;
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">
                            <Link 
                                href={route('logistics.shipments.show', shipment.id)}
                                className="hover:underline"
                            >
                                {shipment.shipment_number}
                            </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {shipment.destination_name || shipment.destination?.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {shipment.is_overdue && (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        <ShipmentStatusBadge status={shipment.status} />
                    </div>
                </div>
            </CardHeader>
            
            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{shipment.total_items} items</span>
                    </div>
                    
                    {shipment.planned_ship_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(shipment.planned_ship_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                    )}
                    
                    {shipment.tracking_number && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{shipment.tracking_number}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
```

### 7.3 CreateShipmentDialog

This would be a large component - see the full dashboard pages below for context.

---

## 8. Dashboards & Pages

### 8.1 Shipments Index Page

**File**: `resources/js/pages/logistics/shipments/index.tsx`

```typescript
import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Shipment } from '@/types/logistics';
import { Button } from '@/components/ui/button';
import { ShipmentCard } from '@/components/logistics/ShipmentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, PackageSearch, Truck, PackageCheck } from 'lucide-react';

interface Props {
    shipments: {
        data: Shipment[];
        links: any;
        meta: any;
    };
    filters: {
        status?: string;
        destination_type?: string;
    };
}

export default function ShipmentsIndex({ shipments, filters }: Props) {
    const [activeTab, setActiveTab] = useState(filters.status || 'all');
    
    const getShipmentsByStatus = (status: string) => {
        if (status === 'all') return shipments.data;
        return shipments.data.filter(s => s.status === status);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Remessas" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Remessas</h1>
                    <Link href={route('logistics.shipments.create')}>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Remessa
                        </Button>
                    </Link>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="all">
                            Todas ({shipments.data.length})
                        </TabsTrigger>
                        <TabsTrigger value="planned" className="gap-2">
                            <PackageSearch className="h-4 w-4" />
                            Planejadas ({getShipmentsByStatus('planned').length})
                        </TabsTrigger>
                        <TabsTrigger value="shipped" className="gap-2">
                            <Truck className="h-4 w-4" />
                            Enviadas ({getShipmentsByStatus('shipped').length})
                        </TabsTrigger>
                        <TabsTrigger value="received" className="gap-2">
                            <PackageCheck className="h-4 w-4" />
                            Recebidas ({getShipmentsByStatus('received').length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-4">
                        {getShipmentsByStatus(activeTab).length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Nenhuma remessa encontrada
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            getShipmentsByStatus(activeTab).map((shipment) => (
                                <ShipmentCard key={shipment.id} shipment={shipment} />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
```

---

## 9. Workflow Examples

### 9.1 External Manufacturing Shipment

```
1. Production Planner creates Manufacturing Order with external steps
2. Planner assigns manufacturer to external step
3. Previous step completes → External step status = 'awaiting_shipment'
4. Shipping Coordinator goes to Logistics → Create Shipment
5. System suggests bundling all items going to same manufacturer
6. Coordinator creates shipment with multiple MO items
7. System generates packing list PDF
8. Coordinator takes photos of items in truck
9. Coordinator marks shipment as 'shipped', enters tracking number
10. System updates all related manufacturing steps to 'shipped'
11. Manufacturer processes items (manual status update to 'in_process')
12. Items return, Receiving Clerk marks shipment as 'received'
13. Clerk enters quantities received per item, takes photos
14. System updates manufacturing steps to 'received'
15. If quality check step configured, it becomes 'queued'
```

### 9.2 Partial Shipment Scenario

```
MO-001: 100 units needed for heat treatment at Manufacturer A

Shipment 1:
- Date: Jan 10
- Quantity: 50 units
- Status: shipped → in_process → received

Shipment 2:
- Date: Jan 15  
- Quantity: 50 units
- Status: shipped → in_process → received

When all 100 units received → Step marked as 'completed'
```

---

## 10. Integration Points

### 10.1 With External Steps Module - CRITICAL INTEGRATION

**State Separation Principle:**
- **Steps** track work completion: `status = 'completed'`
- **Shipments** track physical location: `status = 'received'`
- When Shipment is marked `received`, related Steps are marked `completed`

**Integration Code Example:**

```php
// In ShipmentService::markAsReceived()

public function markAsReceived(
    Shipment $shipment,
    array $itemReceipts,
    ?string $notes = null,
    array $photos = []
): Shipment {
    DB::transaction(function () use ($shipment, $itemReceipts, $notes, $photos) {
        // 1. Update SHIPMENT status (Logistics owns this)
        $shipment->update([
            'status' => 'received',  // ← SHIPMENT is received
            'actual_delivery_date' => now(),
            'receiving_notes' => $notes,
            'received_by' => auth()->id(),
        ]);

        // 2. Update each shipment item and related steps
        foreach ($itemReceipts as $receipt) {
            $item = ShipmentItem::find($receipt['item_id']);
            if (!$item) continue;
            
            // Record receipt on shipment item
            $item->increment('quantity_received', $receipt['quantity_received']);
            
            if ($receipt['quantity_rejected'] > 0) {
                $item->increment('quantity_rejected', $receipt['quantity_rejected']);
                $item->update(['rejection_reason' => $receipt['rejection_reason']]);
            }
            
            // 3. Update related MANUFACTURING STEP
            if ($item->manufacturing_step_id) {
                $step = $item->manufacturingStep;
                
                if ($step && $step->execution_location === 'external') {
                    // Record quantity received on the step
                    $step->recordQuantityReceived(
                        $receipt['quantity_received'],
                        $notes
                    );
                    
                    // The step's recordQuantityReceived() method will:
                    // - Increment step.quantity_received
                    // - Mark step.status = 'completed' when all quantities received
                    // - Trigger next step activation
                }
            }
        }

        // 4. Handle photos (these go on the shipment)
        foreach ($photos as $photo) {
            $shipment->addMedia($photo)
                ->withCustomProperties(['type' => 'post_receipt'])
                ->toMediaCollection('shipment_photos');
        }
    });

    return $shipment->fresh(['items']);
}
```

**What Happens in ManufacturingStep::recordQuantityReceived():**

```php
// In app/Models/Production/ManufacturingStep.php

public function recordQuantityReceived(float $quantity, ?string $notes = null): void
{
    // Increment received quantity
    $this->increment('quantity_received', $quantity);
    $this->update(['received_date' => now()]);

    // Check if all shipped quantity is received
    if ($this->quantity_received >= $this->quantity_shipped) {
        // COMPLETE the step - same as internal steps
        $this->update([
            'status' => 'completed',  // ← STEP is completed
            'actual_end_time' => now(),
            // external_status can stay 'in_process' or be cleared
        ]);

        // Log the completion
        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->log('External step completed - all quantities received');

        // CRITICAL: Activate the next step in the route
        $this->checkNextStepActivation();
    } else {
        // Partial receipt - log but don't complete
        activity()
            ->performedOn($this)
            ->log('Partial receipt recorded for external step');
    }
}
```

**State Flow Summary:**

| Event | Shipment Status | Step Status | Step External Status | What It Means |
|-------|----------------|-------------|---------------------|---------------|
| Shipment created | `planned` | `queued` | `awaiting_shipment` | Ready to ship |
| Shipment ships | `shipped` | `in_progress` | `shipped` | Items in transit |
| At manufacturer | `in_transit` | `in_progress` | `in_process` | Work happening |
| Shipment received | `received` ✓ | `completed` ✓ | `in_process` | **Both complete, next step can start** |

**Key Benefits:**
- ✅ Consistent completion model (all steps end with `status='completed'`)
- ✅ Clear separation (Logistics owns shipping, Steps own work completion)
- ✅ Proper sequencing (next steps activate when step completes, not when shipment ships)
- ✅ Partial shipments supported (step completes when all quantities received)

### 10.2 With Scheduler Module

- Expected delivery dates feed into schedule
- Delays update downstream step timing
- Scheduler shows items in transit

### 10.3 With Quality Module

- Received items can trigger QC steps
- Rejected quantities create rework

### 10.4 With Notifications (Future)

- Email when shipment ships
- Alert when shipment overdue
- Notify when items received

---

## 11. Testing Requirements

### 11.1 Unit Tests

```php
/** @test */
public function generates_unique_shipment_numbers()
{
    $shipment1 = Shipment::factory()->create();
    $shipment2 = Shipment::factory()->create();
    
    $this->assertNotEquals($shipment1->shipment_number, $shipment2->shipment_number);
}

/** @test */
public function marks_shipment_as_shipped_and_updates_steps()
{
    $step = ManufacturingStep::factory()->create([
        'execution_location' => 'external',
        'external_status' => 'awaiting_shipment',
    ]);
    
    $shipment = Shipment::factory()->create();
    ShipmentItem::factory()->create([
        'shipment_id' => $shipment->id,
        'manufacturing_step_id' => $step->id,
        'quantity_shipped' => 50,
    ]);
    
    $shipment->markAsShipped('TRACK123', 'UPS');
    
    $this->assertEquals('shipped', $shipment->status);
    $step->refresh();
    $this->assertEquals('shipped', $step->external_status);
}
```

### 11.2 Feature Tests

```php
/** @test */
public function user_can_create_shipment()
{
    $user = User::factory()->create();
    $manufacturer = Manufacturer::factory()->create();
    $mo = ManufacturingOrder::factory()->create();
    
    $this->actingAs($user)
        ->post(route('logistics.shipments.store'), [
            'destination_type' => 'manufacturer',
            'destination_id' => $manufacturer->id,
            'planned_ship_date' => now()->addDays(1)->format('Y-m-d'),
            'items' => [
                [
                    'manufacturing_order_id' => $mo->id,
                    'quantity' => 100,
                ],
            ],
        ])
        ->assertRedirect();
    
    $this->assertDatabaseHas('shipments', [
        'destination_type' => 'manufacturer',
        'destination_id' => $manufacturer->id,
    ]);
}
```

---

## 12. QR Code Integration

### 12.1 Existing QR Code System

Manufacturing Orders already have QR codes generated by the system. The logistics module **reuses** this existing infrastructure.

**Current QR Code Structure:**

```
URL Format: https://[domain]/production/orders/{mo-number}/qr

Example: https://maintenance-os.com/production/orders/MO-2024-0001/qr
```

**Generated By:**
```php
// app/Services/Production/QrCodeService.php
public function generateOrderUrl(ManufacturingOrder $order): string
{
    return url(route('production.orders.qr', [
        'mo_number' => $order->order_number
    ], false));
}
```

**Key Point**: No changes needed to QR generation - we just parse the existing URLs!

---

### 12.2 QR Code Usage in Logistics

#### Shipping Workflow

```
1. User creates shipment
   ↓
2. Scan MO QR codes to add items
   ↓
3. Parse URL to extract MO number
   ↓
4. Look up MO → Get external step → Add to shipment
   ↓
5. Generate packing list (includes QR codes for reference)
```

#### Receiving Workflow

```
1. Shipment arrives
   ↓
2. Scan MO QR codes to verify contents
   ↓
3. Parse URL to extract MO number
   ↓
4. Match against expected shipment items
   ↓
5. Record receipt quantities
   ↓
6. Mark step as completed
```

---

### 12.3 URL Parsing Service

**File**: `app/Services/Logistics/QrParsingService.php`

```php
<?php

namespace App\Services\Logistics;

use App\Models\Production\ManufacturingOrder;

class QrParsingService
{
    /**
     * Parse MO number from QR code URL.
     * 
     * Supports formats:
     * - https://domain.com/production/orders/MO-2024-0001/qr
     * - /production/orders/MO-2024-0001/qr
     * - MO-2024-0001 (direct number)
     */
    public function parseMoNumberFromQr(string $qrContent): ?string
    {
        // Pattern matches:
        // /production/orders/{mo-number}/qr
        // /production/orders/{mo-number}
        $pattern = '/\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i';
        
        if (preg_match($pattern, $qrContent, $matches)) {
            return $matches[1];
        }
        
        // If it looks like an MO number directly (MO-YYYY-####)
        if (preg_match('/^MO-\d{4}-\d+$/i', $qrContent)) {
            return strtoupper($qrContent);
        }
        
        return null;
    }
    
    /**
     * Find MO from QR code content.
     */
    public function findMoFromQr(string $qrContent): ?ManufacturingOrder
    {
        $moNumber = $this->parseMoNumberFromQr($qrContent);
        
        if (!$moNumber) {
            return null;
        }
        
        return ManufacturingOrder::where('order_number', $moNumber)->first();
    }
    
    /**
     * Validate QR code belongs to expected shipment.
     */
    public function validateQrForShipment(string $qrContent, int $shipmentId): array
    {
        $mo = $this->findMoFromQr($qrContent);
        
        if (!$mo) {
            return [
                'valid' => false,
                'error' => 'Manufacturing Order not found',
            ];
        }
        
        // Check if MO is in this shipment
        $shipmentItem = \App\Models\Logistics\ShipmentItem::where('shipment_id', $shipmentId)
            ->where('manufacturing_order_id', $mo->id)
            ->first();
        
        if (!$shipmentItem) {
            return [
                'valid' => false,
                'error' => 'This MO is not part of the shipment',
                'mo' => $mo,
            ];
        }
        
        return [
            'valid' => true,
            'mo' => $mo,
            'shipment_item' => $shipmentItem,
        ];
    }
}
```

---

### 12.4 Frontend QR Scanning Component

**File**: `resources/js/components/logistics/QrScanner.tsx`

```typescript
import React, { useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine, Keyboard } from 'lucide-react';

interface QrScannerProps {
    onScan: (moNumber: string) => void;
    mode?: 'camera' | 'manual';
}

export function QrScanner({ onScan, mode = 'camera' }: QrScannerProps) {
    const [manualInput, setManualInput] = useState('');
    const [scanning, setScanning] = useState(false);
    
    const parseMoNumber = (qrContent: string): string | null => {
        // Match: /production/orders/{mo-number}/qr or /production/orders/{mo-number}
        const pattern = /\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i;
        const match = qrContent.match(pattern);
        
        if (match) {
            return match[1];
        }
        
        // Check if it's a direct MO number
        if (/^MO-\d{4}-\d+$/i.test(qrContent)) {
            return qrContent.toUpperCase();
        }
        
        return null;
    };
    
    const handleScan = (decodedText: string) => {
        const moNumber = parseMoNumber(decodedText);
        
        if (moNumber) {
            onScan(moNumber);
            setScanning(false);
        } else {
            alert('QR Code inválido ou formato não reconhecido');
        }
    };
    
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const moNumber = parseMoNumber(manualInput);
        
        if (moNumber) {
            onScan(moNumber);
            setManualInput('');
        } else {
            alert('Número de OM inválido');
        }
    };
    
    const startScanner = () => {
        setScanning(true);
        
        const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            },
            false
        );
        
        scanner.render((decodedText) => {
            handleScan(decodedText);
            scanner.clear();
        }, (errorMessage) => {
            // Ignore scan errors (continuous scanning)
        });
    };
    
    return (
        <div className="space-y-4">
            {mode === 'camera' && (
                <div>
                    {!scanning ? (
                        <Button onClick={startScanner} className="w-full">
                            <ScanLine className="h-4 w-4 mr-2" />
                            Escanear QR Code
                        </Button>
                    ) : (
                        <div id="qr-reader" className="w-full" />
                    )}
                </div>
            )}
            
            {/* Manual entry fallback */}
            <div className="relative">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">ou</span>
                </div>
                <form onSubmit={handleManualSubmit} className="mt-2 flex gap-2">
                    <Input
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Digite o número da OM (MO-2024-0001)"
                        className="flex-1"
                    />
                    <Button type="submit" variant="outline">
                        <Keyboard className="h-4 w-4 mr-2" />
                        Adicionar
                    </Button>
                </form>
            </div>
        </div>
    );
}
```

---

### 12.5 Integration with Shipment Creation

**Enhanced Create Shipment Page:**

```typescript
// resources/js/pages/logistics/shipments/create.tsx

export default function CreateShipment() {
    const [selectedMos, setSelectedMos] = useState<ManufacturingOrder[]>([]);
    
    const handleQrScan = async (moNumber: string) => {
        try {
            // Call backend to get MO details
            const response = await axios.get(
                route('logistics.shipments.find-mo', { mo_number: moNumber })
            );
            
            const mo = response.data.mo;
            
            // Check if already added
            if (selectedMos.some(m => m.id === mo.id)) {
                toast.warning('OM já adicionada');
                return;
            }
            
            // Check if MO has external steps awaiting shipment
            if (!mo.has_external_steps_awaiting_shipment) {
                toast.error('Esta OM não possui etapas aguardando envio');
                return;
            }
            
            // Add to list
            setSelectedMos([...selectedMos, mo]);
            toast.success(`OM ${mo.order_number} adicionada`);
            
        } catch (error) {
            toast.error('Erro ao buscar OM');
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Escanear OMs para Envio</CardTitle>
                </CardHeader>
                <CardContent>
                    <QrScanner onScan={handleQrScan} />
                </CardContent>
            </Card>
            
            {selectedMos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>OMs Selecionadas ({selectedMos.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* List of selected MOs with external steps */}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
```

---

### 12.6 Backend Endpoint for QR Lookup

**File**: `app/Http/Controllers/Logistics/ShipmentController.php`

```php
/**
 * Find MO from QR scan for shipment creation.
 */
public function findMoFromQr(Request $request, string $moNumber)
{
    $this->authorize('create', Shipment::class);
    
    $mo = ManufacturingOrder::where('order_number', $moNumber)
        ->with([
            'item',
            'manufacturingRoute.steps' => function ($query) {
                $query->where('execution_location', 'external')
                      ->where('external_status', 'awaiting_shipment');
            }
        ])
        ->first();
    
    if (!$mo) {
        return response()->json(['error' => 'Manufacturing Order not found'], 404);
    }
    
    // Check if MO has external steps awaiting shipment
    $externalSteps = $mo->manufacturingRoute?->steps ?? collect();
    
    return response()->json([
        'mo' => $mo,
        'has_external_steps_awaiting_shipment' => $externalSteps->isNotEmpty(),
        'external_steps' => $externalSteps,
    ]);
}
```

**Route:**
```php
Route::get('shipments/find-mo/{mo_number}', [ShipmentController::class, 'findMoFromQr'])
    ->name('shipments.find-mo');
```

---

### 12.7 Benefits of Using Existing QR System

1. ✅ **No Duplicate Infrastructure**: Reuse existing QR code generation
2. ✅ **Consistent UX**: Users already familiar with MO QR codes
3. ✅ **No Database Changes**: QR codes already exist for all MOs
4. ✅ **Mobile Compatible**: Existing QR system works on mobile
5. ✅ **URL Parsing**: Simple regex to extract MO number
6. ✅ **Fallback Option**: Manual MO number entry always available

---

### 12.8 QR Code on Packing Lists

Include MO QR codes on packing lists for easy receiving verification:

**Packing List Template Update:**

```blade
<!-- resources/views/pdf/packing-list.blade.php -->

@foreach($shipment->items as $item)
<tr>
    <td>{{ $item->manufacturing_order->order_number }}</td>
    <td>{{ $item->item_name }}</td>
    <td>{{ $item->quantity_shipped }}</td>
    <td style="text-align: center;">
        <!-- Include QR code -->
        <img src="data:image/png;base64,{{ $item->qr_code_base64 }}" 
             width="80" 
             height="80" 
             alt="QR Code" />
    </td>
</tr>
@endforeach
```

**Generate QR codes in PackingListService:**

```php
public function getPackingListData(Shipment $shipment): array
{
    $qrCodeService = app(QrCodeService::class);
    
    $items = $shipment->items->map(function ($item) use ($qrCodeService) {
        // Generate QR code for each MO
        $url = $qrCodeService->generateOrderUrl($item->manufacturingOrder);
        $qrCode = $qrCodeService->generateQrCode($url, ['size' => 200]);
        
        return [
            'order_number' => $item->manufacturingOrder->order_number,
            'item_code' => $item->item_code,
            'quantity' => $item->quantity_shipped,
            'qr_code_base64' => base64_encode($qrCode),
        ];
    });
    
    // ... rest of packing list data
}
```

---

## 13. Future Enhancements

### Phase 2 Features:

1. **QR Code Scanning**: Scan MO QR codes during pack/receive
   - Uses existing QR code system (no changes to QR generation needed)
   - URL format: `https://[domain]/production/orders/{mo-number}/qr`
   - Parse MO number from URL path to identify items for shipment
   - Mobile-optimized scanning interface
2. **Label Printing**: Generate shipping labels
3. **Carrier Integration**: Real-time tracking via API
4. **Advanced Bundling**: AI-suggested optimal grouping
5. **Temperature Tracking**: For sensitive materials
6. **Customs Documentation**: International shipments
7. **Cost Tracking**: Freight costs per shipment
8. **Returns Management**: Handle rejected shipments
9. **Multi-location**: Ship from different warehouses
10. **Mobile App**: Dedicated shipping/receiving app with QR scanner

---

## Conclusion

This logistics module provides a complete foundation for managing complex shipping scenarios in a manufacturing environment. The design emphasizes:

- **Flexibility**: Handle various destination types and partial shipments
- **Traceability**: Photo documentation and detailed histories
- **Integration**: Seamless connection with external manufacturing steps
- **User Experience**: Guided workflows for shipping and receiving

Implementation should proceed in phases:
1. Core shipment/item models and basic CRUD
2. Photo management and packing lists
3. Dashboards and bundling logic
4. Advanced features and integrations

Next: Review both specifications (External Steps + Logistics), approve, and begin implementation! 🚀

