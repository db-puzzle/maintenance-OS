<?php

namespace App\Traits;

use App\Models\AssetHierarchy\Shift;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

trait AssetRuntimeCalculator
{
    use ShiftTimeCalculator;

    /**
     * Calculate the current runtime hours for an asset
     * This includes the last reported runtime plus accumulated shift hours
     */
    public function calculateCurrentRuntime(): float
    {
        // Get the latest runtime measurement
        $latestMeasurement = $this->latestRuntimeMeasurement;
        
        if (!$latestMeasurement) {
            return 0.0;
        }
        
        // If no shift is associated, return the last reported value
        if (!$this->shift_id) {
            return $latestMeasurement->reported_hours;
        }
        
        // Calculate accumulated hours since last measurement
        // Use measurement_datetime as the starting point (when the measurement was actually taken)
        $accumulatedHours = $this->calculateAccumulatedShiftHours(
            $latestMeasurement->measurement_datetime,
            now()
        );
        
        $totalRuntime = $latestMeasurement->reported_hours + $accumulatedHours;
        
        return $totalRuntime;
    }
    
    /**
     * Calculate accumulated working hours based on shift schedule
     * between two dates
     */
    protected function calculateAccumulatedShiftHours(Carbon $startDate, Carbon $endDate): float
    {
        if (!$this->shift_id || !$this->shift) {
            return 0.0;
        }
        
        $shift = $this->shift()->with(['schedules.shiftTimes.breaks'])->first();
        $totalMinutes = 0;
        
        if (!$shift || $shift->schedules->isEmpty()) {
            return 0.0;
        }
        
        // Start from the actual start date/time, not the beginning of the day
        $currentDate = $startDate->copy()->startOfDay();
        
        while ($currentDate <= $endDate) {
            // Get the day name (Monday, Tuesday, etc.)
            $dayName = $currentDate->format('l');
            
            // Find schedule for this day
            $daySchedule = $shift->schedules->firstWhere('weekday', $dayName);
            
            if ($daySchedule) {
                // Calculate working minutes for this day
                $dayMinutes = $this->calculateDayWorkingMinutesFromSchedule(
                    $daySchedule,
                    $currentDate,
                    $startDate,
                    $endDate
                );
                
                if ($dayMinutes > 0) {
                }
                
                $totalMinutes += $dayMinutes;
            }
            
            // Also check if the previous day had a shift that extends into today
            $previousDate = $currentDate->copy()->subDay();
            $previousDayName = $previousDate->format('l');
            $previousDaySchedule = $shift->schedules->firstWhere('weekday', $previousDayName);
            
            if ($previousDaySchedule) {
                // Check for shifts that end after midnight (into the current day)
                $midnightCrossingMinutes = $this->calculateMidnightCrossingMinutes(
                    $previousDaySchedule,
                    $previousDate,
                    $currentDate,
                    $startDate,
                    $endDate
                );
                
                if ($midnightCrossingMinutes > 0) {
                    $totalMinutes += $midnightCrossingMinutes;
                }
            }
            
            $currentDate->addDay();
        }
        
        $totalHours = round($totalMinutes / 60, 1);
        
        // Convert minutes to hours
        return $totalHours;
    }
    
    /**
     * Calculate working minutes for a specific day from schedule model
     * considering start and end date boundaries
     */
    protected function calculateDayWorkingMinutesFromSchedule(
        $daySchedule,
        Carbon $currentDate,
        Carbon $startDate,
        Carbon $endDate
    ): int {
        $totalMinutes = 0;
        
        // Calculate the day boundaries (start and end of the current day)
        $dayStart = $currentDate->copy()->startOfDay();
        $dayEnd = $currentDate->copy()->endOfDay();
        
        // Get the shift to access timezone conversion methods
        $shift = $daySchedule->shift;
        
        foreach ($daySchedule->shiftTimes as $shiftTime) {
            if (!$shiftTime->active) {
                continue;
            }
            
            // Convert shift times to UTC using the shift's timezone
            $shiftStart = $shift->localTimeToUTC($shiftTime->start_time, $currentDate->format('Y-m-d'));
            $shiftEnd = $shift->localTimeToUTC($shiftTime->end_time, $currentDate->format('Y-m-d'));
            
            // Handle shifts that cross midnight
            if ($shiftEnd < $shiftStart) {
                $shiftEnd->addDay();
            }
            
            $originalShiftStart = $shiftStart->copy();
            $originalShiftEnd = $shiftEnd->copy();
            
            // For shifts that cross midnight, we need to handle them differently
            // We should only count the hours that belong to the current day
            if ($shiftEnd->format('Y-m-d') > $currentDate->format('Y-m-d')) {
                // This shift crosses into the next day
                // We need to check if we're processing the start day or the end day
                
                // If the shift starts on the current day, only count up to midnight
                if ($shiftStart->format('Y-m-d') == $currentDate->format('Y-m-d')) {
                    $shiftEnd = $dayEnd->copy();
                }
                // If the shift starts before the current day (we're on the end day)
                else if ($shiftStart->format('Y-m-d') < $currentDate->format('Y-m-d')) {
                    // The shift started yesterday, adjust start to beginning of today
                    $shiftStart = $dayStart->copy();
                }
            }
            
            // Then adjust for calculation boundaries
            if ($shiftStart < $startDate) {
                $shiftStart = $startDate->copy();
            }
            
            if ($shiftEnd > $endDate) {
                $shiftEnd = $endDate->copy();
            }
            
            // Skip if shift is outside our time range
            if ($shiftStart >= $shiftEnd) {
                continue;
            }
            
            // Calculate shift duration in minutes
            $shiftMinutes = $shiftStart->diffInMinutes($shiftEnd);
            
            // Subtract break time
            $breakMinutes = $this->calculateBreakMinutesFromModels(
                $shiftTime->breaks,
                $shiftStart,
                $shiftEnd,
                $currentDate,
                $shift
            );
            
            $netMinutes = $shiftMinutes - $breakMinutes;
            
            $totalMinutes += $netMinutes;
        }
        
        return max(0, $totalMinutes);
    }
    
    /**
     * Calculate working minutes for shifts that cross midnight from previous day into current day
     */
    protected function calculateMidnightCrossingMinutes(
        $previousDaySchedule,
        Carbon $previousDate,
        Carbon $currentDate,
        Carbon $startDate,
        Carbon $endDate
    ): int {
        $totalMinutes = 0;
        
        // We're only interested in the portion after midnight (start of current day)
        $midnightStart = $currentDate->copy()->startOfDay();
        $dayEnd = $currentDate->copy()->endOfDay();
        
        // Get the shift to access timezone conversion methods
        $shift = $previousDaySchedule->shift;
        
        foreach ($previousDaySchedule->shiftTimes as $shiftTime) {
            if (!$shiftTime->active) {
                continue;
            }
            
            // Convert shift times to UTC using the shift's timezone
            // Use the previous date as the base since the shift is defined for that day
            $shiftStart = $shift->localTimeToUTC($shiftTime->start_time, $previousDate->format('Y-m-d'));
            $shiftEnd = $shift->localTimeToUTC($shiftTime->end_time, $previousDate->format('Y-m-d'));
            
            // Check if this shift crosses midnight
            if ($shiftEnd <= $shiftStart) {
                $shiftEnd->addDay();
                
                // Only process if the shift actually extends into the current day
                if ($shiftEnd->format('Y-m-d') == $currentDate->format('Y-m-d')) {
                    // We only want the portion after midnight
                    $effectiveStart = $midnightStart->copy();
                    $effectiveEnd = $shiftEnd->copy();
                    
                    // Apply calculation boundaries
                    if ($effectiveStart < $startDate) {
                        $effectiveStart = $startDate->copy();
                    }
                    
                    if ($effectiveEnd > $endDate) {
                        $effectiveEnd = $endDate->copy();
                    }
                    
                    // Skip if outside our time range
                    if ($effectiveStart >= $effectiveEnd) {
                        continue;
                    }
                    
                    // Calculate shift duration in minutes
                    $shiftMinutes = $effectiveStart->diffInMinutes($effectiveEnd);
                    
                    // Subtract break time (breaks that occur after midnight)
                    $breakMinutes = $this->calculateBreakMinutesFromModels(
                        $shiftTime->breaks,
                        $effectiveStart,
                        $effectiveEnd,
                        $previousDate,
                        $shift
                    );
                    
                    $netMinutes = $shiftMinutes - $breakMinutes;
                    
                    $totalMinutes += $netMinutes;
                }
            }
        }
        
        return max(0, $totalMinutes);
    }
    
    /**
     * Calculate break minutes within a specific time range from break models
     */
    protected function calculateBreakMinutesFromModels(
        $breaks,
        Carbon $rangeStart,
        Carbon $rangeEnd,
        Carbon $baseDate,
        $shift = null
    ): int {
        $totalBreakMinutes = 0;
        
        foreach ($breaks as $break) {
            // If shift is provided, use UTC conversion, otherwise use the old method
            if ($shift) {
                $breakStart = $shift->localTimeToUTC($break->start_time, $baseDate->format('Y-m-d'));
                $breakEnd = $shift->localTimeToUTC($break->end_time, $baseDate->format('Y-m-d'));
            } else {
                $breakStart = $baseDate->copy()->setTimeFromTimeString($break->start_time);
                $breakEnd = $baseDate->copy()->setTimeFromTimeString($break->end_time);
            }
            
            // Handle breaks that cross midnight
            if ($breakEnd < $breakStart) {
                $breakEnd->addDay();
            }
            
            $originalBreakStart = $breakStart->copy();
            $originalBreakEnd = $breakEnd->copy();
            
            // Adjust break times to fit within the range
            if ($breakStart < $rangeStart) {
                $breakStart = $rangeStart->copy();
            }
            
            if ($breakEnd > $rangeEnd) {
                $breakEnd = $rangeEnd->copy();
            }
            
            // Calculate break duration if it overlaps with our range
            if ($breakStart < $breakEnd) {
                $breakMinutes = $breakStart->diffInMinutes($breakEnd);
                $totalBreakMinutes += $breakMinutes;
            }
        }
        
        return $totalBreakMinutes;
    }
    
    /**
     * Get runtime calculation details for debugging/display
     */
    public function getRuntimeCalculationDetails(): array
    {
        $latestMeasurement = $this->latestRuntimeMeasurement;
        
        if (!$latestMeasurement) {
            return [
                'last_reported_hours' => 0,
                'accumulated_shift_hours' => 0,
                'current_runtime_hours' => 0,
                'has_shift' => false,
                'calculation_method' => 'no_measurements'
            ];
        }
        
        $accumulatedHours = 0;
        $hasShift = (bool) $this->shift_id;
        $calculationMethod = 'manual_only';
        
        if ($hasShift) {
            $accumulatedHours = $this->calculateAccumulatedShiftHours(
                $latestMeasurement->measurement_datetime,
                now()
            );
            $calculationMethod = 'manual_plus_shift';
        }
        
        $details = [
            'last_reported_hours' => $latestMeasurement->reported_hours,
            'accumulated_shift_hours' => $accumulatedHours,
            'current_runtime_hours' => $latestMeasurement->reported_hours + $accumulatedHours,
            'has_shift' => $hasShift,
            'shift_name' => $hasShift ? $this->shift->name : null,
            'last_measurement_date' => $latestMeasurement->measurement_datetime->toIso8601String(),
            'calculation_method' => $calculationMethod
        ];
        
        return $details;
    }
    
    /**
     * Get detailed runtime breakdown for debugging
     */
    public function getDetailedRuntimeBreakdown(): array
    {
        $latestMeasurement = $this->latestRuntimeMeasurement;
        
        if (!$latestMeasurement) {
            return [
                'error' => 'No measurements found',
                'last_reported_hours' => 0,
                'accumulated_shift_hours' => 0,
                'current_runtime_hours' => 0
            ];
        }
        
        $breakdown = [
            'last_reported_hours' => $latestMeasurement->reported_hours,
            'measurement_datetime' => $latestMeasurement->measurement_datetime->toIso8601String(),
            'calculation_start' => $latestMeasurement->measurement_datetime->toIso8601String(),
            'calculation_end' => now()->toIso8601String(),
            'has_shift' => (bool) $this->shift_id,
            'shift_name' => $this->shift ? $this->shift->name : null,
            'daily_breakdown' => []
        ];
        
        if (!$this->shift_id || !$this->shift) {
            $breakdown['accumulated_shift_hours'] = 0;
            $breakdown['current_runtime_hours'] = $latestMeasurement->reported_hours;
            return $breakdown;
        }
        
        $shift = $this->shift()->with(['schedules.shiftTimes.breaks'])->first();
        
        if (!$shift || $shift->schedules->isEmpty()) {
            $breakdown['accumulated_shift_hours'] = 0;
            $breakdown['current_runtime_hours'] = $latestMeasurement->reported_hours;
            return $breakdown;
        }
        
        $totalMinutes = 0;
        $startDate = $latestMeasurement->measurement_datetime;
        $endDate = now();
        $currentDate = $startDate->copy()->startOfDay();
        
        while ($currentDate <= $endDate) {
            $dayName = $currentDate->format('l');
            $daySchedule = $shift->schedules->firstWhere('weekday', $dayName);
            
            $dayInfo = [
                'date' => $currentDate->format('Y-m-d'),
                'weekday' => $dayName,
                'has_schedule' => (bool) $daySchedule,
                'minutes_worked' => 0,
                'hours_worked' => 0,
                'shifts' => [],
                'midnight_crossing_minutes' => 0,
                'midnight_crossing_hours' => 0
            ];
            
            if ($daySchedule) {
                $dayMinutes = 0;
                
                foreach ($daySchedule->shiftTimes as $shiftTime) {
                    if (!$shiftTime->active) {
                        continue;
                    }
                    
                    $shiftStart = $shift->localTimeToUTC($shiftTime->start_time, $currentDate->format('Y-m-d'));
                    $shiftEnd = $shift->localTimeToUTC($shiftTime->end_time, $currentDate->format('Y-m-d'));
                    
                    if ($shiftEnd < $shiftStart) {
                        $shiftEnd->addDay();
                    }
                    
                    $originalShiftStart = $shiftStart->copy();
                    $originalShiftEnd = $shiftEnd->copy();
                    
                    // Calculate day boundaries
                    $dayStart = $currentDate->copy()->startOfDay();
                    $dayEnd = $currentDate->copy()->endOfDay();
                    
                    // For shifts that cross midnight, we need to handle them differently
                    // We should only count the hours that belong to the current day
                    if ($shiftEnd->format('Y-m-d') > $currentDate->format('Y-m-d')) {
                        // This shift crosses into the next day
                        // We need to check if we're processing the start day or the end day
                        
                        // If the shift starts on the current day, only count up to midnight
                        if ($shiftStart->format('Y-m-d') == $currentDate->format('Y-m-d')) {
                            $shiftEnd = $dayEnd->copy();
                        }
                        // If the shift starts before the current day (we're on the end day)
                        else if ($shiftStart->format('Y-m-d') < $currentDate->format('Y-m-d')) {
                            // The shift started yesterday, adjust start to beginning of today
                            $shiftStart = $dayStart->copy();
                        }
                    }
                    
                    // Then adjust for calculation boundaries
                    if ($shiftStart < $startDate) {
                        $shiftStart = $startDate->copy();
                    }
                    
                    if ($shiftEnd > $endDate) {
                        $shiftEnd = $endDate->copy();
                    }
                    
                    $shiftMinutes = 0;
                    $breakMinutes = 0;
                    
                    if ($shiftStart < $shiftEnd) {
                        $shiftMinutes = $shiftStart->diffInMinutes($shiftEnd);
                        $breakMinutes = $this->calculateBreakMinutesFromModels(
                            $shiftTime->breaks,
                            $shiftStart,
                            $shiftEnd,
                            $currentDate,
                            $shift
                        );
                    }
                    
                    $netMinutes = $shiftMinutes - $breakMinutes;
                    $dayMinutes += $netMinutes;
                    
                    $shiftInfo = [
                        'original_start' => $originalShiftStart->format('Y-m-d H:i:s'),
                        'original_end' => $originalShiftEnd->format('Y-m-d H:i:s'),
                        'adjusted_start' => $shiftStart->format('Y-m-d H:i:s'),
                        'adjusted_end' => $shiftEnd->format('Y-m-d H:i:s'),
                        'shift_minutes' => $shiftMinutes,
                        'break_minutes' => $breakMinutes,
                        'net_minutes' => $netMinutes
                    ];
                    
                    $dayInfo['shifts'][] = $shiftInfo;
                }
                
                $dayInfo['minutes_worked'] = $dayMinutes;
                $dayInfo['hours_worked'] = round($dayMinutes / 60, 2);
                $totalMinutes += $dayMinutes;
            }
            
            // Also check if the previous day had a shift that extends into today
            $previousDate = $currentDate->copy()->subDay();
            $previousDayName = $previousDate->format('l');
            $previousDaySchedule = $shift->schedules->firstWhere('weekday', $previousDayName);
            
            if ($previousDaySchedule) {
                // Check for shifts that end after midnight (into the current day)
                $midnightCrossingMinutes = $this->calculateMidnightCrossingMinutes(
                    $previousDaySchedule,
                    $previousDate,
                    $currentDate,
                    $startDate,
                    $endDate
                );
                
                if ($midnightCrossingMinutes > 0) {
                    // Add midnight crossing info to the current day's breakdown
                    $dayInfo['midnight_crossing_minutes'] = $midnightCrossingMinutes;
                    $dayInfo['midnight_crossing_hours'] = round($midnightCrossingMinutes / 60, 2);
                    $dayInfo['minutes_worked'] += $midnightCrossingMinutes;
                    $dayInfo['hours_worked'] = round($dayInfo['minutes_worked'] / 60, 2);
                    $totalMinutes += $midnightCrossingMinutes;
                }
            }
            
            $breakdown['daily_breakdown'][] = $dayInfo;
            $currentDate->addDay();
        }
        
        $breakdown['total_minutes'] = $totalMinutes;
        $breakdown['accumulated_shift_hours'] = round($totalMinutes / 60, 1);
        $breakdown['current_runtime_hours'] = $latestMeasurement->reported_hours + round($totalMinutes / 60, 1);
        
        return $breakdown;
    }
} 