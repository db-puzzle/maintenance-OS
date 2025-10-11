/**
 * Zoom configuration for the production scheduler
 * Defines discrete zoom levels with their display characteristics
 */

export type TimeScaleType = 'hour' | '4hour' | 'day' | '3day' | 'week' | '2week' | 'month' | 'quarter';

export interface ZoomLevel {
    id: string;
    name: string;
    description: string;
    factor: number;
    timeScale: TimeScaleType;
    pixelsPerUnit: number;
    unitsPerMajorGrid: number;
    minorGridDivisions: number;
    dateFormat: {
        major: string;
        minor: string;
    };
}

export const ZOOM_LEVELS: ZoomLevel[] = [
    {
        id: 'hour',
        name: 'Hour View',
        description: '1 day visible - Detailed hourly scheduling',
        factor: 8.0,
        timeScale: 'hour',
        pixelsPerUnit: 80, // 80px per hour
        unitsPerMajorGrid: 1,
        minorGridDivisions: 4, // 15-minute intervals
        dateFormat: {
            major: 'MMM d, yyyy',
            minor: 'h:mm a'
        }
    },
    {
        id: '4hour',
        name: '4-Hour View',
        description: '3 days visible - Short-term detailed planning',
        factor: 4.0,
        timeScale: '4hour',
        pixelsPerUnit: 80, // 80px per 4-hour block
        unitsPerMajorGrid: 1,
        minorGridDivisions: 4, // 1-hour intervals
        dateFormat: {
            major: 'MMM d, yyyy',
            minor: 'h a'
        }
    },
    {
        id: 'day',
        name: 'Day View',
        description: '1 week visible - Standard daily scheduling',
        factor: 2.0,
        timeScale: 'day',
        pixelsPerUnit: 120, // 120px per day
        unitsPerMajorGrid: 1,
        minorGridDivisions: 4, // 6-hour intervals
        dateFormat: {
            major: 'MMM yyyy',
            minor: 'EEE d'
        }
    },
    {
        id: '3day',
        name: '3-Day View',
        description: '3 weeks visible - Medium-term planning',
        factor: 1.0,
        timeScale: '3day',
        pixelsPerUnit: 120, // 120px per 3-day block
        unitsPerMajorGrid: 1,
        minorGridDivisions: 3, // Daily divisions
        dateFormat: {
            major: 'MMM yyyy',
            minor: 'd'
        }
    },
    {
        id: 'week',
        name: 'Week View',
        description: '1 month visible - Monthly overview',
        factor: 0.5,
        timeScale: 'week',
        pixelsPerUnit: 180, // 180px per week
        unitsPerMajorGrid: 1,
        minorGridDivisions: 7, // Daily divisions
        dateFormat: {
            major: 'MMM yyyy',
            minor: 'Week W'
        }
    },
    {
        id: '2week',
        name: '2-Week View',
        description: '2 months visible - Bi-monthly planning',
        factor: 0.25,
        timeScale: '2week',
        pixelsPerUnit: 180, // 180px per 2-week block
        unitsPerMajorGrid: 1,
        minorGridDivisions: 2, // Weekly divisions
        dateFormat: {
            major: 'MMM yyyy',
            minor: 'W'
        }
    },
    {
        id: 'month',
        name: 'Month View',
        description: '3 months visible - Quarterly overview',
        factor: 0.125,
        timeScale: 'month',
        pixelsPerUnit: 240, // 240px per month
        unitsPerMajorGrid: 1,
        minorGridDivisions: 4, // Weekly divisions
        dateFormat: {
            major: 'yyyy',
            minor: 'MMM'
        }
    },
    {
        id: 'quarter',
        name: '4-Month View',
        description: '1 year visible - Annual planning',
        factor: 0.0625,
        timeScale: 'quarter',
        pixelsPerUnit: 240, // 240px per quarter
        unitsPerMajorGrid: 1,
        minorGridDivisions: 3, // Monthly divisions
        dateFormat: {
            major: 'yyyy',
            minor: 'QQQ'
        }
    }
];

// Helper functions for zoom operations
export const getZoomLevelById = (id: string): ZoomLevel | undefined => {
    return ZOOM_LEVELS.find(level => level.id === id);
};

export const getZoomLevelByFactor = (factor: number): ZoomLevel => {
    // Find closest zoom level by factor
    return ZOOM_LEVELS.reduce((closest, level) => {
        const closestDiff = Math.abs(closest.factor - factor);
        const levelDiff = Math.abs(level.factor - factor);
        return levelDiff < closestDiff ? level : closest;
    });
};

export const getNextZoomLevel = (currentId: string, direction: 'in' | 'out'): ZoomLevel | null => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level.id === currentId);
    if (currentIndex === -1) return null;

    const nextIndex = direction === 'in' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= ZOOM_LEVELS.length) return null;

    return ZOOM_LEVELS[nextIndex];
};

export const getDefaultZoomLevel = (): ZoomLevel => {
    return ZOOM_LEVELS.find(level => level.id === 'day') || ZOOM_LEVELS[2];
};

// Calculate the number of units for a given time scale
export const getTimeUnits = (startDate: Date, endDate: Date, timeScale: TimeScaleType): number => {
    const msPerHour = 1000 * 60 * 60;
    const msPerDay = msPerHour * 24;
    const timeDiff = endDate.getTime() - startDate.getTime();

    switch (timeScale) {
        case 'hour':
            return Math.ceil(timeDiff / msPerHour);
        case '4hour':
            return Math.ceil(timeDiff / (msPerHour * 4));
        case 'day':
            return Math.ceil(timeDiff / msPerDay);
        case '3day':
            return Math.ceil(timeDiff / (msPerDay * 3));
        case 'week':
            return Math.ceil(timeDiff / (msPerDay * 7));
        case '2week':
            return Math.ceil(timeDiff / (msPerDay * 14));
        case 'month':
            return Math.ceil(timeDiff / (msPerDay * 30)); // Approximate
        case 'quarter':
            return Math.ceil(timeDiff / (msPerDay * 91)); // Approximate
        default:
            return 0;
    }
};

// Get the start of a time unit
export const getTimeUnitStart = (date: Date, timeScale: TimeScaleType): Date => {
    const result = new Date(date);

    switch (timeScale) {
        case 'hour':
            result.setMinutes(0, 0, 0);
            break;
        case '4hour':
            result.setHours(Math.floor(result.getHours() / 4) * 4, 0, 0, 0);
            break;
        case 'day':
            result.setHours(0, 0, 0, 0);
            break;
        case '3day': {
            result.setHours(0, 0, 0, 0);
            const dayOfMonth = result.getDate();
            result.setDate(dayOfMonth - ((dayOfMonth - 1) % 3));
            break;
        }
        case 'week': {
            result.setHours(0, 0, 0, 0);
            const dayOfWeek = result.getDay();
            result.setDate(result.getDate() - dayOfWeek);
            break;
        }
        case '2week': {
            result.setHours(0, 0, 0, 0);
            const weekStart = new Date(result);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weeksSinceEpoch = Math.floor(weekStart.getTime() / (1000 * 60 * 60 * 24 * 7));
            if (weeksSinceEpoch % 2 !== 0) {
                weekStart.setDate(weekStart.getDate() - 7);
            }
            return weekStart;
        }
        case 'month':
            result.setDate(1);
            result.setHours(0, 0, 0, 0);
            break;
        case 'quarter': {
            const quarter = Math.floor(result.getMonth() / 3);
            result.setMonth(quarter * 3, 1);
            result.setHours(0, 0, 0, 0);
            break;
        }
    }

    return result;
};

// Add time units to a date
export const addTimeUnits = (date: Date, units: number, timeScale: TimeScaleType): Date => {
    const result = new Date(date);

    switch (timeScale) {
        case 'hour':
            result.setHours(result.getHours() + units);
            break;
        case '4hour':
            result.setHours(result.getHours() + (units * 4));
            break;
        case 'day':
            result.setDate(result.getDate() + units);
            break;
        case '3day':
            result.setDate(result.getDate() + (units * 3));
            break;
        case 'week':
            result.setDate(result.getDate() + (units * 7));
            break;
        case '2week':
            result.setDate(result.getDate() + (units * 14));
            break;
        case 'month':
            result.setMonth(result.getMonth() + units);
            break;
        case 'quarter':
            result.setMonth(result.getMonth() + (units * 3));
            break;
    }

    return result;
};
