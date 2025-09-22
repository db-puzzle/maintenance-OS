import React from 'react';
import { TimelineLayout } from '../../../utils/timelineCalculations';
import { cn } from '@/lib/utils';

interface CapacityIndicatorProps {
    workCell: any;
    allocations: any[];
    layout: TimelineLayout;
    height: number;
}

export const CapacityIndicator: React.FC<CapacityIndicatorProps> = ({
    workCell,
    allocations,
    layout,
    height,
}) => {
    // Calculate capacity usage for each day
    const capacityUsage = calculateDailyCapacityUsage(
        allocations,
        layout,
        workCell.default_production_rate_per_hour || 8 // Default 8 hours per day
    );

    return (
        <div className="absolute inset-0 pointer-events-none">
            {capacityUsage.map((usage, index) => {
                const { date, utilization } = usage;
                const x = layout.getPositionForDate(date);
                const width = layout.pixelsPerDay;

                // Color based on utilization
                let bgColor = 'bg-green-100';
                if (utilization > 100) {
                    bgColor = 'bg-red-100';
                } else if (utilization > 80) {
                    bgColor = 'bg-yellow-100';
                }

                return (
                    <div
                        key={index}
                        className={cn(
                            "absolute top-0 opacity-30",
                            bgColor
                        )}
                        style={{
                            left: `${x}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                        }}
                    />
                );
            })}
        </div>
    );
};

function calculateDailyCapacityUsage(
    allocations: any[],
    layout: TimelineLayout,
    dailyCapacityHours: number
): { date: Date; utilization: number }[] {
    const usage: { date: Date; utilization: number }[] = [];

    // Get all dates in the view
    const startDate = new Date(layout.getDateForPosition(0));
    const endDate = new Date(layout.getDateForPosition(layout.totalWidth));
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        let totalHours = 0;

        // Calculate total hours allocated on this day
        allocations.forEach(allocation => {
            const allocStart = new Date(allocation.planned_start_date);
            const allocEnd = new Date(allocation.planned_end_date);

            // Check if allocation overlaps with this day
            const dayStart = new Date(current);
            const dayEnd = new Date(current);
            dayEnd.setDate(dayEnd.getDate() + 1);

            if (allocEnd > dayStart && allocStart < dayEnd) {
                // Calculate overlap hours
                const overlapStart = Math.max(allocStart.getTime(), dayStart.getTime());
                const overlapEnd = Math.min(allocEnd.getTime(), dayEnd.getTime());
                const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
                totalHours += overlapHours;
            }
        });

        const utilization = (totalHours / dailyCapacityHours) * 100;
        usage.push({ date: new Date(current), utilization });

        current.setDate(current.getDate() + 1);
    }

    return usage;
}

