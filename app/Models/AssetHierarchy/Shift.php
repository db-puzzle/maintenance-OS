<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = [
        'name'
    ];

    protected $appends = ['asset_count'];

    public function plants(): HasMany
    {
        return $this->hasMany(Plant::class);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }

    public function sectors(): HasMany
    {
        return $this->hasMany(Sector::class);
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

        foreach ($this->schedules as $schedule) {
            foreach ($schedule->shiftTimes as $shiftTime) {
                if ($shiftTime->active) {
                    // Calculate work time
                    $start = strtotime($shiftTime->start_time);
                    $end = strtotime($shiftTime->end_time);
                    $workMinutes = ($end - $start) / 60;
                    
                    // Subtract break time
                    foreach ($shiftTime->breaks as $break) {
                        $breakStart = strtotime($break->start_time);
                        $breakEnd = strtotime($break->end_time);
                        $breakMinutes = ($breakEnd - $breakStart) / 60;
                        $totalBreakMinutes += $breakMinutes;
                        $workMinutes -= $breakMinutes;
                    }
                    
                    $totalWorkMinutes += $workMinutes;
                }
            }
        }

        return [
            'work_hours' => floor($totalWorkMinutes / 60),
            'work_minutes' => $totalWorkMinutes % 60,
            'break_hours' => floor($totalBreakMinutes / 60),
            'break_minutes' => $totalBreakMinutes % 60,
        ];
    }
} 