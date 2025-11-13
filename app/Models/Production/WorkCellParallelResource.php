<?php

namespace App\Models\Production;

use App\Models\AssetHierarchy\Shift;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkCellParallelResource extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_cell_id',
        'shift_id',
        'resource_date',
        'available_count',
        'notes',
    ];

    protected $casts = [
        'resource_date' => 'date',
        'available_count' => 'integer',
    ];

    /**
     * Get the work cell that owns the parallel resource.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the shift associated with this resource.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * Scope for resources on a specific date.
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('resource_date', $date);
    }

    /**
     * Scope for resources for a specific shift.
     */
    public function scopeForShift($query, $shiftId)
    {
        return $query->where('shift_id', $shiftId);
    }

    /**
     * Scope for resources without a specific shift (general resources).
     */
    public function scopeGeneralResources($query)
    {
        return $query->whereNull('shift_id');
    }

    /**
     * Get or create a resource entry for a specific work cell, date, and shift.
     */
    public static function getOrCreateFor(WorkCell $workCell, $date, $shiftId = null, $defaultCount = null)
    {
        $resource = static::where('work_cell_id', $workCell->id)
            ->where('resource_date', $date)
            ->where('shift_id', $shiftId)
            ->first();

        if (! $resource) {
            $resource = static::create([
                'work_cell_id' => $workCell->id,
                'shift_id' => $shiftId,
                'resource_date' => $date,
                'available_count' => $defaultCount ?? $workCell->max_parallel_executions,
            ]);
        }

        return $resource;
    }

    /**
     * Update available count with validation.
     */
    public function updateAvailableCount(int $count): void
    {
        if ($count < 0) {
            throw new \InvalidArgumentException('Available count cannot be negative.');
        }

        if ($count > $this->workCell->max_parallel_executions) {
            throw new \InvalidArgumentException('Available count cannot exceed work cell maximum parallel executions.');
        }

        $this->update(['available_count' => $count]);
    }
}
