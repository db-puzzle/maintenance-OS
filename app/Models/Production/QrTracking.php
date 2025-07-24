<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrTracking extends Model
{
    use HasFactory;

    protected $table = 'qr_tracking_events';
    
    public $timestamps = false; // Using created_at only

    protected $fillable = [
        'qr_code',
        'event_type',
        'event_data',
        'location',
        'scanned_by',
        'device_info',
        'created_at',
    ];

    protected $casts = [
        'event_data' => 'array',
        'device_info' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    /**
     * Get the user who scanned/created the event.
     */
    public function scannedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }

    /**
     * Scope for events by QR code.
     */
    public function scopeForQrCode($query, $qrCode)
    {
        return $query->where('qr_code', $qrCode);
    }

    /**
     * Scope for events by type.
     */
    public function scopeOfType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope for recent events.
     */
    public function scopeRecent($query, $hours = 24)
    {
        return $query->where('created_at', '>=', now()->subHours($hours));
    }

    /**
     * Create a generation event.
     */
    public static function recordGeneration($qrCode, $data = [])
    {
        return static::create([
            'qr_code' => $qrCode,
            'event_type' => 'generated',
            'event_data' => $data,
        ]);
    }

    /**
     * Create a scan event.
     */
    public static function recordScan($qrCode, $location = null, $userId = null, $deviceInfo = [])
    {
        return static::create([
            'qr_code' => $qrCode,
            'event_type' => 'scanned',
            'location' => $location,
            'scanned_by' => $userId ?? auth()->id(),
            'device_info' => $deviceInfo,
        ]);
    }

    /**
     * Create a status update event.
     */
    public static function recordStatusUpdate($qrCode, $oldStatus, $newStatus, $userId = null)
    {
        return static::create([
            'qr_code' => $qrCode,
            'event_type' => 'status_update',
            'event_data' => [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ],
            'scanned_by' => $userId ?? auth()->id(),
        ]);
    }

    /**
     * Create a location change event.
     */
    public static function recordLocationChange($qrCode, $oldLocation, $newLocation, $userId = null)
    {
        return static::create([
            'qr_code' => $qrCode,
            'event_type' => 'location_change',
            'event_data' => [
                'old_location' => $oldLocation,
                'new_location' => $newLocation,
            ],
            'location' => $newLocation,
            'scanned_by' => $userId ?? auth()->id(),
        ]);
    }

    /**
     * Get the last scan for a QR code.
     */
    public static function getLastScan($qrCode)
    {
        return static::forQrCode($qrCode)
            ->ofType('scanned')
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get the scan history for a QR code.
     */
    public static function getScanHistory($qrCode)
    {
        return static::forQrCode($qrCode)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get event type label.
     */
    public function getEventTypeLabelAttribute()
    {
        $labels = [
            'generated' => 'Gerado',
            'scanned' => 'Escaneado',
            'status_update' => 'Atualização de Status',
            'location_change' => 'Mudança de Local',
        ];

        return $labels[$this->event_type] ?? $this->event_type;
    }
}