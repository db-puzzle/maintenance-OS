import React from 'react';
import { TimelineLayout, getWeekends } from '../../../utils/timelineCalculations';
import { cn } from '@/lib/utils';

interface NonWorkingTimeProps {
    startDate: Date;
    endDate: Date;
    layout: TimelineLayout;
    height: number;
}

export const NonWorkingTime: React.FC<NonWorkingTimeProps> = ({
    startDate,
    endDate,
    layout,
    height,
}) => {
    const weekends = getWeekends(startDate, endDate);

    return (
        <>
            {weekends.map((date, index) => {
                const x = layout.getPositionForDate(date);
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                const width = layout.getPositionForDate(nextDay) - x;

                return (
                    <div
                        key={index}
                        className={cn(
                            "absolute top-0 bg-red-500/10",
                            "pointer-events-none"
                        )}
                        style={{
                            left: `${x}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                        }}
                    />
                );
            })}
        </>
    );
};

