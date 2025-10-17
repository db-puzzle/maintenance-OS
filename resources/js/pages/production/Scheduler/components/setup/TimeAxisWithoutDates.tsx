import React from 'react';
import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/components/production/scheduler-v2/utils/zoomConfig';
import { calculateTimelineLayout } from '@/components/production/scheduler-v2/utils/timelineCalculations';

interface TimeAxisWithoutDatesProps {
    startDate: Date;
    endDate: Date;
    zoomLevel: ZoomLevel;
    width: number;
}

export const TimeAxisWithoutDates: React.FC<TimeAxisWithoutDatesProps> = ({
    startDate,
    endDate,
    zoomLevel,
    width,
}) => {
    // Generate time periods based on zoom level
    const generateTimePeriods = () => {
        const layout = calculateTimelineLayout({
            startDate,
            endDate,
            zoomLevel,
            containerWidth: width
        });

        const periods: {
            label: string;
            x: number;
            width: number;
            isMajor: boolean;
        }[] = [];

        const boundaries = layout.getUnitBoundaries();

        boundaries.forEach((boundary, index) => {
            const isMajor = index % zoomLevel.unitsPerMajorGrid === 0;

            // Format labels based on time scale without specific dates
            let label: string;

            switch (zoomLevel.timeScale) {
                case 'hour':
                    label = 'Hour';
                    break;
                case '4hour':
                    label = '4 Hours';
                    break;
                case 'day':
                    label = 'Day';
                    break;
                case '3day':
                    label = '3 Days';
                    break;
                case 'week':
                    label = 'Week';
                    break;
                case '2week':
                    label = '2 Weeks';
                    break;
                case 'month':
                    label = 'Month';
                    break;
                case 'quarter':
                    label = 'Quarter';
                    break;
                default:
                    label = 'Period';
            }

            // Only show label on major grid lines to avoid clutter
            periods.push({
                label: isMajor ? label : '',
                x: boundary.position,
                width: boundary.width,
                isMajor
            });
        });

        return periods;
    };

    const periods = generateTimePeriods();

    return (
        <div className="h-[60px]" style={{ width: `${width}px` }}>
            {/* Single header row showing time scale */}
            <div className="h-full border-b relative flex items-center">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="relative h-full" style={{ width: `${width}px` }}>
                        {periods.map((period, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "absolute top-0 bottom-0 border-r flex items-center justify-center px-1",
                                    "text-sm text-muted-foreground",
                                    period.isMajor ? "border-border" : "border-border/50"
                                )}
                                style={{
                                    left: `${period.x}px`,
                                    width: `${period.width}px`,
                                }}
                            >
                                <span className="truncate">{period.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Time scale indicator */}
                <div className="absolute top-2 left-4 text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded border">
                    Time Scale: {zoomLevel.name}
                </div>
            </div>
        </div>
    );
};
