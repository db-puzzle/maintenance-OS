import React from 'react';
import { cn } from '@/lib/utils';

interface TimeAxisProps {
    startDate: Date;
    endDate: Date;
    zoomLevel: number;
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
        const periods: { label: string; subLabel: string; x: number; width: number }[] = [];
        const current = new Date(startDate);
        const pixelsPerDay = 100 * zoomLevel;

        let x = 0;
        while (current <= endDate) {
            if (zoomLevel >= 2) {
                // Hour view
                const label = current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const subLabel = current.toLocaleDateString('en-US', { weekday: 'short' });
                periods.push({ label, subLabel, x, width: pixelsPerDay / 24 });
                current.setHours(current.getHours() + 1);
                x += pixelsPerDay / 24;
            } else if (zoomLevel >= 1) {
                // Day view
                const label = current.getDate().toString();
                const subLabel = current.toLocaleDateString('en-US', { weekday: 'short' });
                periods.push({ label, subLabel, x, width: pixelsPerDay });
                current.setDate(current.getDate() + 1);
                x += pixelsPerDay;
            } else {
                // Week view
                const weekStart = new Date(current);
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                const subLabel = `Week ${getWeekNumber(weekStart)}`;
                periods.push({ label, subLabel, x, width: pixelsPerDay * 7 });
                current.setDate(current.getDate() + 7);
                x += pixelsPerDay * 7;
            }
        }

        return periods;
    };

    const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const periods = generateTimePeriods();

    return (
        <div className="h-[80px] border-b bg-muted/50 sticky top-0 z-20">
            {/* Top level header */}
            <div className="h-[40px] border-b relative overflow-hidden">
                <div className="absolute" style={{ width: `${width}px` }}>
                    {periods.map((period, index) => (
                        <div
                            key={index}
                            className={cn(
                                "absolute h-full border-r flex items-center justify-center",
                                "text-sm font-medium"
                            )}
                            style={{
                                left: `${period.x}px`,
                                width: `${period.width}px`,
                            }}
                        >
                            {period.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom level header */}
            <div className="h-[40px] relative overflow-hidden">
                <div className="absolute" style={{ width: `${width}px` }}>
                    {periods.map((period, index) => (
                        <div
                            key={index}
                            className={cn(
                                "absolute h-full border-r flex items-center justify-center",
                                "text-xs text-muted-foreground"
                            )}
                            style={{
                                left: `${period.x}px`,
                                width: `${period.width}px`,
                            }}
                        >
                            {period.subLabel}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

