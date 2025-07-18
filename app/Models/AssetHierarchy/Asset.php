<?php

namespace App\Models\AssetHierarchy;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Traits\AssetRuntimeCalculator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    use HasFactory, AssetRuntimeCalculator;

    protected $table = 'assets';

    protected $fillable = [
        'tag',
        'serial_number',
        'part_number',
        'asset_type_id',
        'description',
        'manufacturer_id',
        'manufacturing_year',
        'plant_id',
        'area_id',
        'sector_id',
        'shift_id',
        'photo_path',
    ];

    protected $casts = [
        'manufacturing_year' => 'integer',
        'asset_type_id' => 'integer',
        'manufacturer_id' => 'integer',
        'plant_id' => 'integer',
        'area_id' => 'integer',
        'sector_id' => 'integer',
        'shift_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($asset) {
            // Valida se a área pertence à planta quando ambas são fornecidas
            if ($asset->area_id && $asset->plant_id && $asset->area->plant_id !== $asset->plant_id) {
                throw new \Exception("A área selecionada não pertence à planta {$asset->plant->name}");
            }

            // Valida se o setor pertence à área e à planta quando fornecidos
            if ($asset->sector_id) {
                if ($asset->area_id && $asset->sector->area_id !== $asset->area_id) {
                    throw new \Exception("O setor selecionado não pertence à área {$asset->area->name}");
                }
                if ($asset->plant_id && $asset->sector->area->plant_id !== $asset->plant_id) {
                    throw new \Exception("O setor selecionado não pertence à planta {$asset->plant->name}");
                }
            }
        });
    }

    public function assetType(): BelongsTo
    {
        return $this->belongsTo(AssetType::class);
    }

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function routines(): HasMany
    {
        return $this->hasMany(Routine::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function openWorkOrders(): HasMany
    {
        return $this->workOrders()->open();
    }

    public function preventiveWorkOrders(): HasMany
    {
        return $this->workOrders()->preventive();
    }

    public function correctiveWorkOrders(): HasMany
    {
        return $this->workOrders()->corrective();
    }

    /**
     * Get the runtime measurements for the asset.
     */
    public function runtimeMeasurements(): HasMany
    {
        return $this->hasMany(AssetRuntimeMeasurement::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get the latest runtime measurement.
     */
    public function latestRuntimeMeasurement()
    {
        return $this->hasOne(AssetRuntimeMeasurement::class)->latestOfMany('created_at');
    }

    /**
     * Get the current runtime hours from the latest measurement plus accumulated shift hours.
     */
    public function getCurrentRuntimeHoursAttribute(): float
    {
        return $this->calculateCurrentRuntime();
    }

    /**
     * Get the previous runtime measurement (second to last).
     */
    public function previousRuntimeMeasurement()
    {
        return $this->runtimeMeasurements()
            ->skip(1)
            ->first();
    }

    /**
     * Get maintenance metrics for the asset
     */
    public function getMaintenanceMetrics(Carbon $startDate, Carbon $endDate)
    {
        $workOrders = $this->workOrders()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        return [
            'total_work_orders' => $workOrders->count(),
            'preventive_count' => $workOrders->filter(function($wo) { return $wo->workOrderCategory?->code === 'preventive'; })->count(),
            'corrective_count' => $workOrders->filter(function($wo) { return $wo->workOrderCategory?->code === 'corrective'; })->count(),
            'total_downtime_hours' => $workOrders->sum('actual_hours'),
            'total_cost' => $workOrders->sum('actual_total_cost'),
            'mtbf' => $this->calculateMTBF($startDate, $endDate),
            'mttr' => $this->calculateMTTR($startDate, $endDate),
        ];
    }

    /**
     * Calculate Mean Time Between Failures
     */
    private function calculateMTBF(Carbon $startDate, Carbon $endDate): float
    {
        $failures = $this->workOrders()
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();
            
        if ($failures === 0) {
            return 0;
        }
        
        $totalHours = $startDate->diffInHours($endDate);
        $downtimeHours = $this->workOrders()
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('actual_hours');
            
        $uptimeHours = $totalHours - $downtimeHours;
        
        return round($uptimeHours / $failures, 2);
    }

    /**
     * Calculate Mean Time To Repair
     */
    private function calculateMTTR(Carbon $startDate, Carbon $endDate): float
    {
        $correctiveWorkOrders = $this->workOrders()
            ->corrective()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('actual_hours')
            ->get();
            
        if ($correctiveWorkOrders->isEmpty()) {
            return 0;
        }
        
        return round($correctiveWorkOrders->avg('actual_hours'), 2);
    }
    
    /**
     * Get average runtime hours per day based on recent measurements
     */
    public function getAverageRuntimePerDay(): float
    {
        // Get measurements from the last 30 days
        $measurements = $this->runtimeMeasurements()
            ->where('created_at', '>=', now()->subDays(30))
            ->orderBy('created_at', 'asc')
            ->get();
            
        if ($measurements->count() < 2) {
            // Not enough data, use default 8 hours per day
            return 8.0;
        }
        
        $totalHours = 0;
        $totalDays = 0;
        
        // Calculate runtime between consecutive measurements
        for ($i = 1; $i < $measurements->count(); $i++) {
            $previous = $measurements[$i - 1];
            $current = $measurements[$i];
            
            $hoursDiff = $current->reported_hours - $previous->reported_hours;
            $daysDiff = $previous->created_at->diffInDays($current->created_at);
            
            if ($daysDiff > 0 && $hoursDiff > 0) {
                $totalHours += $hoursDiff;
                $totalDays += $daysDiff;
            }
        }
        
        if ($totalDays === 0) {
            return 8.0; // Default
        }
        
        return round($totalHours / $totalDays, 2);
    }
}
