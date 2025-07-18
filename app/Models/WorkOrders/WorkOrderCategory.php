<?php

namespace App\Models\WorkOrders;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrderCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'discipline',
        'name',
        'code',
        'description',
        'color',
        'icon',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    // Relationships
    public function workOrderTypes(): HasMany
    {
        return $this->hasMany(WorkOrderType::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForDiscipline($query, string $discipline)
    {
        return $query->where('discipline', $discipline);
    }

    public function scopeMaintenance($query)
    {
        return $query->where('discipline', 'maintenance');
    }

    public function scopeQuality($query)
    {
        return $query->where('discipline', 'quality');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }

    // Helper methods
    public function isMaintenance(): bool
    {
        return $this->discipline === 'maintenance';
    }

    public function isQuality(): bool
    {
        return $this->discipline === 'quality';
    }

    public function isPreventive(): bool
    {
        return $this->code === 'preventive';
    }

    public function isCorrective(): bool
    {
        return $this->code === 'corrective';
    }

    public function isInspection(): bool
    {
        return $this->code === 'inspection';
    }

    public function isProject(): bool
    {
        return $this->code === 'project';
    }

    public function isCalibration(): bool
    {
        return $this->code === 'calibration';
    }

    // Get all allowed source types for this category
    public function getAllowedSourceTypes(): array
    {
        return match($this->discipline) {
            'maintenance' => match($this->code) {
                'preventive' => ['manual', 'routine'],
                'corrective' => ['manual', 'sensor', 'inspection'],
                'inspection' => ['manual', 'routine'],
                'project' => ['manual'],
                default => ['manual']
            },
            'quality' => match($this->code) {
                'calibration' => ['manual', 'calibration_schedule'],
                'quality_control' => ['manual', 'quality_alert'],
                'quality_audit' => ['manual', 'audit'],
                'non_conformance' => ['manual', 'complaint', 'audit'],
                default => ['manual']
            },
            default => ['manual']
        };
    }

    // Check if a source type is allowed for this category
    public function isSourceAllowed(string $sourceType): bool
    {
        return in_array($sourceType, $this->getAllowedSourceTypes());
    }

    // Static helper to get category by code
    public static function findByCode(string $code): ?self
    {
        return static::where('code', $code)->first();
    }
}
