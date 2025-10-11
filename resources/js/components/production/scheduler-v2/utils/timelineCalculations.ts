import { ZoomLevel, getTimeUnits, getTimeUnitStart, addTimeUnits } from './zoomConfig';

export interface TimelineLayout {
    totalWidth: number;
    pixelsPerDay: number;
    pixelsPerHour: number;
    pixelsPerUnit: number;
    daysInView: number;
    unitsInView: number;
    timeScale: string;
    getPositionForDate: (date: Date) => number;
    getDateForPosition: (x: number) => Date;
    getUnitBoundaries: () => { start: Date; end: Date; position: number; width: number }[];
}

interface CalculateTimelineLayoutProps {
    startDate: Date;
    endDate: Date;
    zoomLevel: ZoomLevel;
    containerWidth: number;
}

export const calculateTimelineLayout = ({
    startDate,
    endDate,
    zoomLevel,
    containerWidth,
}: CalculateTimelineLayoutProps): TimelineLayout => {
    // Calculate time units in view based on zoom level
    const unitsInView = getTimeUnits(startDate, endDate, zoomLevel.timeScale);
    const pixelsPerUnit = zoomLevel.pixelsPerUnit;

    // Calculate pixels per day and hour for compatibility
    let pixelsPerDay: number;
    let pixelsPerHour: number;

    switch (zoomLevel.timeScale) {
        case 'hour':
            pixelsPerHour = pixelsPerUnit;
            pixelsPerDay = pixelsPerHour * 24;
            break;
        case '4hour':
            pixelsPerHour = pixelsPerUnit / 4;
            pixelsPerDay = pixelsPerHour * 24;
            break;
        case 'day':
            pixelsPerDay = pixelsPerUnit;
            pixelsPerHour = pixelsPerDay / 24;
            break;
        case '3day':
            pixelsPerDay = pixelsPerUnit / 3;
            pixelsPerHour = pixelsPerDay / 24;
            break;
        case 'week':
            pixelsPerDay = pixelsPerUnit / 7;
            pixelsPerHour = pixelsPerDay / 24;
            break;
        case '2week':
            pixelsPerDay = pixelsPerUnit / 14;
            pixelsPerHour = pixelsPerDay / 24;
            break;
        case 'month':
            pixelsPerDay = pixelsPerUnit / 30; // Approximate
            pixelsPerHour = pixelsPerDay / 24;
            break;
        case 'quarter':
            pixelsPerDay = pixelsPerUnit / 91; // Approximate
            pixelsPerHour = pixelsPerDay / 24;
            break;
        default:
            pixelsPerDay = 100;
            pixelsPerHour = pixelsPerDay / 24;
    }

    // Calculate days in view for compatibility
    const daysInView = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Total timeline width
    const totalWidth = Math.max(unitsInView * pixelsPerUnit, containerWidth);

    // Helper functions
    const getPositionForDate = (date: Date): number => {
        const timeDiff = date.getTime() - startDate.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        return daysDiff * pixelsPerDay;
    };

    const getDateForPosition = (x: number): Date => {
        const daysDiff = x / pixelsPerDay;
        const newDate = new Date(startDate);
        newDate.setTime(newDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
        return newDate;
    };

    // Get unit boundaries for grid rendering
    const getUnitBoundaries = (): { start: Date; end: Date; position: number; width: number }[] => {
        const boundaries: { start: Date; end: Date; position: number; width: number }[] = [];
        let currentDate = getTimeUnitStart(startDate, zoomLevel.timeScale);

        while (currentDate < endDate) {
            const nextDate = addTimeUnits(currentDate, 1, zoomLevel.timeScale);
            const unitStart = currentDate < startDate ? startDate : currentDate;
            const unitEnd = nextDate > endDate ? endDate : nextDate;

            if (unitEnd > unitStart) {
                const startPos = getPositionForDate(unitStart);
                const endPos = getPositionForDate(unitEnd);

                boundaries.push({
                    start: new Date(currentDate),
                    end: new Date(nextDate),
                    position: startPos,
                    width: endPos - startPos
                });
            }

            currentDate = nextDate;
        }

        return boundaries;
    };

    return {
        totalWidth,
        pixelsPerDay,
        pixelsPerHour,
        pixelsPerUnit,
        daysInView,
        unitsInView,
        timeScale: zoomLevel.timeScale,
        getPositionForDate,
        getDateForPosition,
        getUnitBoundaries,
    };
};

export const formatDuration = (hours: number): string => {
    if (hours < 24) {
        return `${hours}h`;
    } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        if (remainingHours === 0) {
            return `${days}d`;
        }
        return `${days}d ${remainingHours}h`;
    }
};

export const getWeekends = (startDate: Date, endDate: Date): Date[] => {
    const weekends: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        if (current.getDay() === 0 || current.getDay() === 6) {
            weekends.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return weekends;
};

export const snapToGrid = (date: Date, gridUnit: 'hour' | 'day' | 'week'): Date => {
    const snapped = new Date(date);

    switch (gridUnit) {
        case 'hour':
            snapped.setMinutes(0, 0, 0);
            break;
        case 'day':
            snapped.setHours(0, 0, 0, 0);
            break;
        case 'week': {
            snapped.setHours(0, 0, 0, 0);
            const day = snapped.getDay();
            const diff = snapped.getDate() - day + (day === 0 ? -6 : 1);
            snapped.setDate(diff);
            break;
        }
    }

    return snapped;
};

