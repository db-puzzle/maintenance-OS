export interface TimelineLayout {
    totalWidth: number;
    pixelsPerDay: number;
    pixelsPerHour: number;
    daysInView: number;
    getPositionForDate: (date: Date) => number;
    getDateForPosition: (x: number) => Date;
}

interface CalculateTimelineLayoutProps {
    startDate: Date;
    endDate: Date;
    zoomLevel: number;
    containerWidth: number;
}

export const calculateTimelineLayout = ({
    startDate,
    endDate,
    zoomLevel,
    containerWidth,
}: CalculateTimelineLayoutProps): TimelineLayout => {
    // Calculate days in view
    const daysInView = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Base pixels per day (adjust based on zoom level)
    const basePixelsPerDay = 100; // Base width for one day
    const pixelsPerDay = basePixelsPerDay * zoomLevel;
    const pixelsPerHour = pixelsPerDay / 24;

    // Total timeline width
    const totalWidth = Math.max(daysInView * pixelsPerDay, containerWidth);

    // Helper functions
    const getPositionForDate = (date: Date): number => {
        const daysDiff = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff * pixelsPerDay;
    };

    const getDateForPosition = (x: number): Date => {
        const daysDiff = x / pixelsPerDay;
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + daysDiff);
        return newDate;
    };

    return {
        totalWidth,
        pixelsPerDay,
        pixelsPerHour,
        daysInView,
        getPositionForDate,
        getDateForPosition,
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
        case 'week':
            snapped.setHours(0, 0, 0, 0);
            const day = snapped.getDay();
            const diff = snapped.getDate() - day + (day === 0 ? -6 : 1);
            snapped.setDate(diff);
            break;
    }

    return snapped;
};

