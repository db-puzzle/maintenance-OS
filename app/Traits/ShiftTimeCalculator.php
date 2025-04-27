<?php

namespace App\Traits;

trait ShiftTimeCalculator
{
    /**
     * Converte um horário em minutos
     */
    protected function timeToMinutes(string $time): int
    {
        list($hours, $minutes) = explode(':', $time);
        return ($hours * 60) + $minutes;
    }

    /**
     * Calcula a duração entre dois horários em minutos
     */
    protected function calculateDuration(string $start, string $end): int
    {
        $startMinutes = $this->timeToMinutes($start);
        $endMinutes = $this->timeToMinutes($end);
        
        if ($endMinutes < $startMinutes) {
            return (24 * 60 - $startMinutes) + $endMinutes;
        }
        
        return $endMinutes - $startMinutes;
    }

    /**
     * Calcula os totais de horas trabalhadas e de intervalo
     */
    protected function calculateShiftTotals(array $schedules): array
    {
        $totalWorkMinutes = 0;
        $totalBreakMinutes = 0;

        foreach ($schedules as $schedule) {
            foreach ($schedule['shifts'] as $shift) {
                if (!$shift['active']) continue;

                // Calcula duração total do turno
                $shiftDuration = $this->calculateDuration($shift['start_time'], $shift['end_time']);
                
                // Calcula duração total dos intervalos
                $shiftBreakMinutes = 0;
                foreach ($shift['breaks'] as $break) {
                    $breakDuration = $this->calculateDuration($break['start_time'], $break['end_time']);
                    $shiftBreakMinutes += $breakDuration;
                }

                // Horas de trabalho = duração do turno - duração dos intervalos
                $totalWorkMinutes += ($shiftDuration - $shiftBreakMinutes);
                $totalBreakMinutes += $shiftBreakMinutes;
            }
        }

        return [
            'work_hours' => floor($totalWorkMinutes / 60),
            'work_minutes' => $totalWorkMinutes % 60,
            'break_hours' => floor($totalBreakMinutes / 60),
            'break_minutes' => $totalBreakMinutes % 60
        ];
    }
} 