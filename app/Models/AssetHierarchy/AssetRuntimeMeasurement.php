<?php

namespace App\Models\AssetHierarchy;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetRuntimeMeasurement extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'user_id',
        'reported_hours',
        'source',
        'notes',
        'measurement_datetime',
    ];

    protected $casts = [
        'reported_hours' => 'float',
        'measurement_datetime' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['previous_hours', 'hours_difference'];

    /**
     * Get the asset that owns the runtime measurement.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the user who reported the measurement.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * Get the previous hours from the previous measurement.
     */
    public function getPreviousHoursAttribute(): float
    {
        if (!$this->asset_id || !$this->created_at) {
            return 0.0;
        }

        // Avoid lazy loading by querying directly
        $previousMeasurement = self::where('asset_id', $this->asset_id)
            ->where('created_at', '<', $this->created_at)
            ->orderBy('created_at', 'desc')
            ->first();

        return $previousMeasurement ? (float) $previousMeasurement->reported_hours : 0.0;
    }

    /**
     * Get the hours difference from the previous measurement.
     */
    public function getHoursDifferenceAttribute(): float
    {
        return (float) $this->reported_hours - $this->previous_hours;
    }
}
