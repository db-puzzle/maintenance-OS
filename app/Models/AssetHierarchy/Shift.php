<?php

namespace App\Models\AssetHierarchy;

use App\Models\Production\WorkCell;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'timezone',
    ];

    protected $appends = ['asset_count'];

    public function schedules(): HasMany
    {
        return $this->hasMany(ShiftSchedule::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function workCells(): HasMany
    {
        return $this->hasMany(WorkCell::class);
    }

    public function getAssetCountAttribute(): int
    {
        return $this->assets()->count();
    }

    /**
     * Convert a local time to UTC for a specific date
     *
     * @param  string  $time  The time in HH:MM format
     * @param  string  $date  The date in Y-m-d format
     */
    public function localTimeToUTC(string $time, string $date): Carbon
    {
        return Carbon::parse($date.' '.$time, $this->timezone)->utc();
    }

    /**
     * Convert a UTC time to local time
     */
    public function utcToLocalTime(Carbon $utcTime): Carbon
    {
        return $utcTime->copy()->setTimezone($this->timezone);
    }

    /**
     * Get shift times for a specific date in UTC
     *
     * @param  string  $date  The date in Y-m-d format
     * @param  string  $weekday  The weekday name
     */
    public function getShiftTimesForDateInUTC(string $date, string $weekday): array
    {
        $schedule = $this->schedules()->where('weekday', $weekday)->first();
        if (! $schedule) {
            return [];
        }

        $shiftTimes = [];
        foreach ($schedule->shiftTimes as $shiftTime) {
            if (! $shiftTime->active) {
                continue;
            }

            $startUTC = $this->localTimeToUTC($shiftTime->start_time, $date);
            $endUTC = $this->localTimeToUTC($shiftTime->end_time, $date);

            // Handle overnight shifts
            if ($endUTC->lt($startUTC)) {
                $endUTC->addDay();
            }

            $breaks = [];
            foreach ($shiftTime->breaks as $break) {
                $breakStartUTC = $this->localTimeToUTC($break->start_time, $date);
                $breakEndUTC = $this->localTimeToUTC($break->end_time, $date);

                // Handle overnight breaks
                if ($breakEndUTC->lt($breakStartUTC)) {
                    $breakEndUTC->addDay();
                }

                $breaks[] = [
                    'start' => $breakStartUTC,
                    'end' => $breakEndUTC,
                ];
            }

            $shiftTimes[] = [
                'start' => $startUTC,
                'end' => $endUTC,
                'breaks' => $breaks,
            ];
        }

        return $shiftTimes;
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
