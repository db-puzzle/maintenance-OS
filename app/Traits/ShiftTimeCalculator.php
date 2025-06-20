<?php

namespace App\Traits;

use Illuminate\Support\Facades\Log;

trait ShiftTimeCalculator
{
    /**
     * Converte um horário em minutos
     */
    protected function timeToMinutes(string $time): int
    {
        [$hours, $minutes] = explode(':', $time);
        $totalMinutes = ($hours * 60) + $minutes;

        Log::debug('Time converted to minutes', [
            'time' => $time,
            'hours' => $hours,
            'minutes' => $minutes,
            'total_minutes' => $totalMinutes,
        ]);

        return $totalMinutes;
    }

    /**
     * Calcula a duração entre dois horários em minutos
     */
    protected function calculateDuration(string $start, string $end): int
    {
        $startMinutes = $this->timeToMinutes($start);
        $endMinutes = $this->timeToMinutes($end);

        if ($endMinutes < $startMinutes) {
            $duration = (24 * 60 - $startMinutes) + $endMinutes;
            Log::debug('Duration calculation crosses midnight', [
                'start' => $start,
                'end' => $end,
                'start_minutes' => $startMinutes,
                'end_minutes' => $endMinutes,
                'duration' => $duration,
            ]);

            return $duration;
        }

        $duration = $endMinutes - $startMinutes;
        Log::debug('Duration calculation', [
            'start' => $start,
            'end' => $end,
            'start_minutes' => $startMinutes,
            'end_minutes' => $endMinutes,
            'duration' => $duration,
        ]);

        return $duration;
    }

    /**
     * Calcula os totais de horas trabalhadas e de intervalo
     */
    protected function calculateShiftTotals(array $schedules): array
    {
        Log::debug('Calculating shift totals', [
            'schedules_count' => count($schedules),
        ]);

        $totalWorkMinutes = 0;
        $totalBreakMinutes = 0;

        foreach ($schedules as $schedule) {
            foreach ($schedule['shifts'] as $shift) {
                if (! $shift['active']) {
                    Log::debug('Skipping inactive shift', [
                        'shift' => $shift,
                    ]);

                    continue;
                }

                // Calcula duração total do turno
                $shiftDuration = $this->calculateDuration($shift['start_time'], $shift['end_time']);

                // Calcula duração total dos intervalos
                $shiftBreakMinutes = 0;
                foreach ($shift['breaks'] as $break) {
                    $breakDuration = $this->calculateDuration($break['start_time'], $break['end_time']);
                    $shiftBreakMinutes += $breakDuration;
                }

                // Horas de trabalho = duração do turno - duração dos intervalos
                $workMinutes = $shiftDuration - $shiftBreakMinutes;
                $totalWorkMinutes += $workMinutes;
                $totalBreakMinutes += $shiftBreakMinutes;

                Log::debug('Shift calculation', [
                    'shift_time' => $shift['start_time'].' - '.$shift['end_time'],
                    'shift_duration' => $shiftDuration,
                    'break_minutes' => $shiftBreakMinutes,
                    'work_minutes' => $workMinutes,
                ]);
            }
        }

        $result = [
            'work_hours' => floor($totalWorkMinutes / 60),
            'work_minutes' => $totalWorkMinutes % 60,
            'break_hours' => floor($totalBreakMinutes / 60),
            'break_minutes' => $totalBreakMinutes % 60,
        ];

        Log::debug('Shift totals calculated', [
            'total_work_minutes' => $totalWorkMinutes,
            'total_break_minutes' => $totalBreakMinutes,
            'result' => $result,
        ]);

        return $result;
    }
}
