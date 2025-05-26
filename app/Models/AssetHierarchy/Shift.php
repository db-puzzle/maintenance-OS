<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = [
        'name',
        'description',
        'total_work_hours',
        'total_work_minutes',
        'total_break_hours',
        'total_break_minutes',
        'plant_id'
    ];

    public function plant(): BelongsTo
    {
        return $this->belongsTo(Plant::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ShiftSchedule::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function getAssetCountAttribute(): int
    {
        return $this->assets()->count();
    }

    public function calculateTotals()
    {
        $totalWorkMinutes = 0;
        $totalBreakMinutes = 0;

        foreach ($this->shiftTimes as $shiftTime) {
            $totalWorkMinutes += $shiftTime->work_hours * 60 + $shiftTime->work_minutes;
            $totalBreakMinutes += $shiftTime->break_hours * 60 + $shiftTime->break_minutes;
        }

        $this->total_work_hours = floor($totalWorkMinutes / 60);
        $this->total_work_minutes = $totalWorkMinutes % 60;
        $this->total_break_hours = floor($totalBreakMinutes / 60);
        $this->total_break_minutes = $totalBreakMinutes % 60;
        $this->save();
    }
} 