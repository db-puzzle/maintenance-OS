<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ShipmentPhoto extends Model
{
    use HasFactory;

    public $timestamps = false; // Using created_at only

    protected $fillable = [
        'shipment_id',
        'photo_type',
        'file_path',
        'thumbnail_path',
        'description',
        'metadata',
        'uploaded_by',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
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

        static::deleting(function ($model) {
            // Delete the actual files when deleting the record
            if ($model->file_path && Storage::exists($model->file_path)) {
                Storage::delete($model->file_path);
            }
            
            if ($model->thumbnail_path && Storage::exists($model->thumbnail_path)) {
                Storage::delete($model->thumbnail_path);
            }
        });
    }

    /**
     * Get the shipment that owns the photo.
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Get the user who uploaded the photo.
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Scope for photos by type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('photo_type', $type);
    }

    /**
     * Get the full URL for the photo.
     */
    public function getUrlAttribute()
    {
        return $this->file_path ? Storage::url($this->file_path) : null;
    }

    /**
     * Get the full URL for the thumbnail.
     */
    public function getThumbnailUrlAttribute()
    {
        return $this->thumbnail_path ? Storage::url($this->thumbnail_path) : $this->url;
    }

    /**
     * Get the file size in bytes.
     */
    public function getFileSizeAttribute()
    {
        return $this->file_path && Storage::exists($this->file_path) 
            ? Storage::size($this->file_path) 
            : null;
    }

    /**
     * Get the file size in human-readable format.
     */
    public function getHumanFileSizeAttribute()
    {
        $size = $this->file_size;
        
        if (!$size) {
            return null;
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }

        return round($size, 2) . ' ' . $units[$i];
    }

    /**
     * Get the photo type label.
     */
    public function getPhotoTypeLabelAttribute()
    {
        $labels = [
            'package' => 'Pacote',
            'container' => 'Container',
            'document' => 'Documento',
            'damage' => 'Dano',
        ];

        return $labels[$this->photo_type] ?? $this->photo_type;
    }

    /**
     * Extract GPS coordinates from metadata.
     */
    public function getGpsCoordinatesAttribute()
    {
        if (!$this->metadata || !isset($this->metadata['GPS'])) {
            return null;
        }

        $gps = $this->metadata['GPS'];
        
        if (isset($gps['GPSLatitude']) && isset($gps['GPSLongitude'])) {
            $lat = $this->convertGpsToDecimal(
                $gps['GPSLatitude'],
                $gps['GPSLatitudeRef'] ?? 'N'
            );
            
            $lng = $this->convertGpsToDecimal(
                $gps['GPSLongitude'],
                $gps['GPSLongitudeRef'] ?? 'E'
            );

            return [
                'latitude' => $lat,
                'longitude' => $lng,
            ];
        }

        return null;
    }

    /**
     * Convert GPS coordinates to decimal.
     */
    protected function convertGpsToDecimal($coordinate, $hemisphere)
    {
        if (is_array($coordinate) && count($coordinate) === 3) {
            $degrees = $coordinate[0];
            $minutes = $coordinate[1];
            $seconds = $coordinate[2];

            $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

            if ($hemisphere === 'S' || $hemisphere === 'W') {
                $decimal = -$decimal;
            }

            return $decimal;
        }

        return null;
    }

    /**
     * Get the capture date from metadata.
     */
    public function getCaptureDateAttribute()
    {
        if ($this->metadata && isset($this->metadata['DateTimeOriginal'])) {
            return \Carbon\Carbon::parse($this->metadata['DateTimeOriginal']);
        }

        return $this->created_at;
    }
}