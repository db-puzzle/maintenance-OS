<?php

namespace App\Models;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScanLog extends Model
{
    protected $fillable = [
        'resource_type',
        'resource_id',
        'user_id',
        'ip_address',
        'user_agent',
        'device_type',
        'in_app',
        'metadata',
        'scanned_at'
    ];

    protected $casts = [
        'metadata' => 'array',
        'scanned_at' => 'datetime',
        'in_app' => 'boolean'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getResourceAttribute()
    {
        return match($this->resource_type) {
            'item' => Item::where('item_number', $this->resource_id)->first(),
            'order' => ManufacturingOrder::where('order_number', $this->resource_id)->first(),
            // 'shipment' => Shipment::where('shipment_number', $this->resource_id)->first(),
            default => null
        };
    }
}