<?php

namespace App\Services\Production;

class TimeFormatter
{
    /**
     * Format a duration in seconds to a human-readable format.
     */
    public static function formatDuration(int $seconds, string $scale = 'auto'): array
    {
        if ($scale === 'auto') {
            $scale = self::detectBestScale($seconds);
        }

        return match ($scale) {
            'hours' => [
                'value' => round($seconds / 3600, 2),
                'unit' => 'hours',
                'display' => round($seconds / 3600, 2) . ' hrs',
            ],
            'minutes' => [
                'value' => round($seconds / 60, 1),
                'unit' => 'minutes',
                'display' => round($seconds / 60, 1) . ' min',
            ],
            default => [
                'value' => $seconds,
                'unit' => 'seconds',
                'display' => $seconds . ' sec',
            ],
        };
    }

    /**
     * Format cycle time (seconds per unit) to a human-readable format.
     */
    public static function formatCycleTime(float $secondsPerUnit, string $scale = 'auto'): array
    {
        if ($scale === 'auto') {
            $scale = self::detectBestScale($secondsPerUnit);
        }

        return match ($scale) {
            'hours' => [
                'value' => round($secondsPerUnit / 3600, 3),
                'unit' => 'hours/unit',
                'display' => round($secondsPerUnit / 3600, 3) . ' hrs/unit',
            ],
            'minutes' => [
                'value' => round($secondsPerUnit / 60, 2),
                'unit' => 'minutes/unit',
                'display' => round($secondsPerUnit / 60, 2) . ' min/unit',
            ],
            default => [
                'value' => round($secondsPerUnit, 1),
                'unit' => 'seconds/unit',
                'display' => round($secondsPerUnit, 1) . ' sec/unit',
            ],
        };
    }

    /**
     * Format throughput (units per time) from cycle time.
     */
    public static function formatThroughput(float $secondsPerUnit, string $scale = 'auto'): array
    {
        if ($secondsPerUnit <= 0) {
            return ['value' => 0, 'unit' => 'units/hour', 'display' => '0 units/hr'];
        }

        $unitsPerSecond = 1 / $secondsPerUnit;

        if ($scale === 'auto') {
            $scale = self::detectBestThroughputScale($unitsPerSecond);
        }

        return match ($scale) {
            'hours' => [
                'value' => round($unitsPerSecond * 3600, 2),
                'unit' => 'units/hour',
                'display' => round($unitsPerSecond * 3600, 2) . ' units/hr',
            ],
            'minutes' => [
                'value' => round($unitsPerSecond * 60, 2),
                'unit' => 'units/minute',
                'display' => round($unitsPerSecond * 60, 2) . ' units/min',
            ],
            default => [
                'value' => round($unitsPerSecond, 3),
                'unit' => 'units/second',
                'display' => round($unitsPerSecond, 3) . ' units/sec',
            ],
        };
    }

    /**
     * Convert from display value to seconds based on unit and mode.
     */
    public static function convertToSeconds(float $value, string $unit, string $mode = 'duration'): float
    {
        if ($mode === 'throughput') {
            // Convert throughput to cycle time (seconds per unit)
            if ($value <= 0) {
                return 0;
            }

            $multiplier = match ($unit) {
                'units/hour' => 3600,
                'units/minute' => 60,
                default => 1, // units/second
            };

            return $multiplier / $value;
        } else {
            // Convert duration or cycle time to seconds
            $multiplier = match ($unit) {
                'hours', 'hours/unit' => 3600,
                'minutes', 'minutes/unit' => 60,
                default => 1, // seconds
            };

            return $value * $multiplier;
        }
    }

    /**
     * Parse time input with unit.
     */
    public static function parseTimeInput(array $input): float
    {
        $value = (float) ($input['value'] ?? 0);
        $unit = $input['unit'] ?? 'seconds';
        $mode = $input['mode'] ?? 'duration';

        return self::convertToSeconds($value, $unit, $mode);
    }

    /**
     * Detect the best scale for displaying a duration.
     */
    private static function detectBestScale(float $seconds): string
    {
        if ($seconds >= 3600) {
            return 'hours';
        }
        if ($seconds >= 60) {
            return 'minutes';
        }

        return 'seconds';
    }

    /**
     * Detect the best scale for displaying throughput.
     */
    private static function detectBestThroughputScale(float $unitsPerSecond): string
    {
        if ($unitsPerSecond <= 0.017) {
            return 'hours';
        } // Less than 1 unit/minute
        if ($unitsPerSecond <= 1) {
            return 'minutes';
        }

        return 'seconds';
    }
}
