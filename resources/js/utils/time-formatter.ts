export interface TimeFormat {
    value: number;
    unit: string;
    display: string;
}

export interface TimeInput {
    value: number;
    unit: string;
    mode?: 'duration' | 'cycle_time' | 'throughput';
}

export class TimeFormatter {
    /**
     * Format a duration in seconds to a human-readable format.
     */
    static formatDuration(seconds: number, scale: string = 'auto'): TimeFormat {
        if (scale === 'auto') {
            scale = this.detectBestScale(seconds);
        }

        switch (scale) {
            case 'hours':
                return {
                    value: Math.round((seconds / 3600) * 100) / 100,
                    unit: 'hours',
                    display: `${Math.round((seconds / 3600) * 100) / 100} hrs`
                };
            case 'minutes':
                return {
                    value: Math.round((seconds / 60) * 10) / 10,
                    unit: 'minutes',
                    display: `${Math.round((seconds / 60) * 10) / 10} min`
                };
            default:
                return {
                    value: seconds,
                    unit: 'seconds',
                    display: `${seconds} sec`
                };
        }
    }

    /**
     * Format cycle time (seconds per unit) to a human-readable format.
     */
    static formatCycleTime(secondsPerUnit: number, scale: string = 'auto'): TimeFormat {
        if (scale === 'auto') {
            scale = this.detectBestScale(secondsPerUnit);
        }

        switch (scale) {
            case 'hours':
                return {
                    value: Math.round((secondsPerUnit / 3600) * 1000) / 1000,
                    unit: 'hours/unit',
                    display: `${Math.round((secondsPerUnit / 3600) * 1000) / 1000} hrs/unit`
                };
            case 'minutes':
                return {
                    value: Math.round((secondsPerUnit / 60) * 100) / 100,
                    unit: 'minutes/unit',
                    display: `${Math.round((secondsPerUnit / 60) * 100) / 100} min/unit`
                };
            default:
                return {
                    value: Math.round(secondsPerUnit * 10) / 10,
                    unit: 'seconds/unit',
                    display: `${Math.round(secondsPerUnit * 10) / 10} sec/unit`
                };
        }
    }

    /**
     * Format throughput (units per time) from cycle time.
     */
    static formatThroughput(secondsPerUnit: number, scale: string = 'auto'): TimeFormat {
        if (secondsPerUnit <= 0) {
            return { value: 0, unit: 'units/hour', display: '0 units/hr' };
        }

        const unitsPerSecond = 1 / secondsPerUnit;

        if (scale === 'auto') {
            scale = this.detectBestThroughputScale(unitsPerSecond);
        }

        switch (scale) {
            case 'hours':
                return {
                    value: Math.round(unitsPerSecond * 3600 * 100) / 100,
                    unit: 'units/hour',
                    display: `${Math.round(unitsPerSecond * 3600 * 100) / 100} units/hr`
                };
            case 'minutes':
                return {
                    value: Math.round(unitsPerSecond * 60 * 100) / 100,
                    unit: 'units/minute',
                    display: `${Math.round(unitsPerSecond * 60 * 100) / 100} units/min`
                };
            default:
                return {
                    value: Math.round(unitsPerSecond * 1000) / 1000,
                    unit: 'units/second',
                    display: `${Math.round(unitsPerSecond * 1000) / 1000} units/sec`
                };
        }
    }

    /**
     * Convert from display value to seconds based on unit and mode.
     */
    static convertToSeconds(value: number, unit: string, mode: string = 'duration'): number {
        if (mode === 'throughput') {
            // Convert throughput to cycle time (seconds per unit)
            if (value <= 0) return 0;

            let multiplier = 1;
            if (unit.includes('hour')) multiplier = 3600;
            else if (unit.includes('minute')) multiplier = 60;

            return multiplier / value;
        } else {
            // Convert duration or cycle time to seconds
            let multiplier = 1;
            if (unit.includes('hour')) multiplier = 3600;
            else if (unit.includes('minute')) multiplier = 60;

            return value * multiplier;
        }
    }

    /**
     * Parse time input with unit.
     */
    static parseTimeInput(input: TimeInput): number {
        const value = input.value || 0;
        const unit = input.unit || 'seconds';
        const mode = input.mode || 'duration';

        return this.convertToSeconds(value, unit, mode);
    }

    /**
     * Detect the best scale for displaying a duration.
     */
    private static detectBestScale(seconds: number): string {
        if (seconds >= 3600) return 'hours';
        if (seconds >= 60) return 'minutes';
        return 'seconds';
    }

    /**
     * Detect the best scale for displaying throughput.
     */
    private static detectBestThroughputScale(unitsPerSecond: number): string {
        if (unitsPerSecond <= 0.017) return 'hours'; // Less than 1 unit/minute
        if (unitsPerSecond <= 1) return 'minutes';
        return 'seconds';
    }

    /**
     * Format seconds to a human-readable duration string.
     */
    static formatDurationString(seconds: number): string {
        if (seconds < 60) return `${seconds}s`;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    }
}
