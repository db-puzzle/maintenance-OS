import React from 'react';
import { cn } from '@/lib/utils';
import { ZoomLevel } from '../../../utils/zoomConfig';
import { calculateTimelineLayout } from '../../../utils/timelineCalculations';
import { format } from 'date-fns';

interface TimeAxisProps {
    startDate: Date;
    endDate: Date;
    zoomLevel: ZoomLevel;
    width: number;
}

export const TimeAxis: React.FC<TimeAxisProps> = ({
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
            subLabel: string;
            x: number;
            width: number;
            isMajor: boolean;
        }[] = [];

        const boundaries = layout.getUnitBoundaries();

        boundaries.forEach((boundary, index) => {
            const isMajor = index % zoomLevel.unitsPerMajorGrid === 0;

            // Format labels based on time scale
            let label: string;
            let subLabel: string;

            switch (zoomLevel.timeScale) {
                case 'hour':
                    label = format(boundary.start, 'h:mm a');
                    subLabel = format(boundary.start, 'EEE MMM d');
                    break;
                case '4hour':
                    label = format(boundary.start, 'h a');
                    subLabel = format(boundary.start, 'MMM d');
                    break;
                case 'day':
                    label = format(boundary.start, 'd');
                    subLabel = format(boundary.start, 'EEE');
                    break;
                case '3day':
                    label = format(boundary.start, 'd');
                    subLabel = format(boundary.start, 'MMM');
                    break;
                case 'week':
                    label = `W${getWeekNumber(boundary.start)}`;
                    subLabel = format(boundary.start, 'MMM');
                    break;
                case '2week':
                    label = `W${getWeekNumber(boundary.start)}`;
                    subLabel = format(boundary.start, 'MMM yyyy');
                    break;
                case 'month':
                    label = format(boundary.start, 'MMM');
                    subLabel = format(boundary.start, 'yyyy');
                    break;
                case 'quarter':
                    label = `Q${getQuarter(boundary.start)}`;
                    subLabel = format(boundary.start, 'yyyy');
                    break;
                default:
                    label = format(boundary.start, 'd');
                    subLabel = format(boundary.start, 'MMM yyyy');
            }

            periods.push({
                label,
                subLabel,
                x: boundary.position,
                width: boundary.width,
                isMajor
            });
        });

        return periods;
    };

    const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getQuarter = (date: Date): number => {
        return Math.floor(date.getMonth() / 3) + 1;
    };

    const periods = generateTimePeriods();

    return (
        <div className="h-[60px]" style={{ width: `${width}px` }}>
            {/* Top level header */}
            <div className="h-[30px] border-b relative">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="relative h-full" style={{ width: `${width}px` }}>
                        {periods.map((period, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "absolute top-0 bottom-0 border-r flex items-center justify-center px-1",
                                    "text-sm font-medium",
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
            </div>

            {/* Bottom level header */}
            <div className="h-[30px] relative">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="relative h-full" style={{ width: `${width}px` }}>
                        {periods.map((period, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "absolute top-0 bottom-0 border-r flex items-center justify-center px-1",
                                    "text-xs text-muted-foreground",
                                    period.isMajor ? "border-border" : "border-border/50"
                                )}
                                style={{
                                    left: `${period.x}px`,
                                    width: `${period.width}px`,
                                }}
                            >
                                <span className="truncate">{period.subLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

