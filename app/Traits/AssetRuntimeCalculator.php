<?php

namespace App\Traits;

use App\Models\AssetHierarchy\Shift;
use Carbon\Carbon;

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
        $accumulatedHours = $this->calculateAccumulatedShiftHours(
            $latestMeasurement->measurement_datetime,
            now()
        );
        
        return $latestMeasurement->reported_hours + $accumulatedHours;
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
        
        // Iterate through each day between start and end dates
        $currentDate = $startDate->copy()->startOfDay();
        $endDateEndOfDay = $endDate->copy()->endOfDay();
        
        while ($currentDate <= $endDateEndOfDay) {
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
                
                $totalMinutes += $dayMinutes;
            }
            
            $currentDate->addDay();
        }
        
        // Convert minutes to hours
        return round($totalMinutes / 60, 1);
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
        
        foreach ($daySchedule->shiftTimes as $shiftTime) {
            if (!$shiftTime->active) {
                continue;
            }
            
            // Create datetime objects for shift start and end
            $shiftStart = $currentDate->copy()->setTimeFromTimeString($shiftTime->start_time);
            $shiftEnd = $currentDate->copy()->setTimeFromTimeString($shiftTime->end_time);
            
            // Handle shifts that cross midnight
            if ($shiftEnd < $shiftStart) {
                $shiftEnd->addDay();
            }
            
            // Adjust for boundary conditions
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
                $currentDate
            );
            
            $totalMinutes += ($shiftMinutes - $breakMinutes);
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
        Carbon $baseDate
    ): int {
        $totalBreakMinutes = 0;
        
        foreach ($breaks as $break) {
            $breakStart = $baseDate->copy()->setTimeFromTimeString($break->start_time);
            $breakEnd = $baseDate->copy()->setTimeFromTimeString($break->end_time);
            
            // Handle breaks that cross midnight
            if ($breakEnd < $breakStart) {
                $breakEnd->addDay();
            }
            
            // Adjust break times to fit within the range
            if ($breakStart < $rangeStart) {
                $breakStart = $rangeStart->copy();
            }
            
            if ($breakEnd > $rangeEnd) {
                $breakEnd = $rangeEnd->copy();
            }
            
            // Calculate break duration if it overlaps with our range
            if ($breakStart < $breakEnd) {
                $totalBreakMinutes += $breakStart->diffInMinutes($breakEnd);
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
        
        return [
            'last_reported_hours' => $latestMeasurement->reported_hours,
            'accumulated_shift_hours' => $accumulatedHours,
            'current_runtime_hours' => $latestMeasurement->reported_hours + $accumulatedHours,
            'has_shift' => $hasShift,
            'shift_name' => $hasShift ? $this->shift->name : null,
            'last_measurement_date' => $latestMeasurement->measurement_datetime->toIso8601String(),
            'calculation_method' => $calculationMethod
        ];
    }
} 