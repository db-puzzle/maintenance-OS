import React from 'react';
import { cn } from '@/lib/utils';

interface MOProgressBarProps {
    completed: number;
    scrapped: number;
    total: number;
    className?: string;
    showPercentage?: boolean;
}

export function MOProgressBar({
    completed,
    scrapped,
    total,
    className,
    showPercentage = false
}: MOProgressBarProps) {
    const completedPercentage = total > 0 ? (completed / total) * 100 : 0;
    const scrappedPercentage = total > 0 ? (scrapped / total) * 100 : 0;
    const totalPercentage = completedPercentage + scrappedPercentage;

    return (
        <div className={cn("w-full", className)}>
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                {/* Completed portion */}
                <div
                    className="absolute top-0 left-0 h-full bg-green-600 transition-all duration-300"
                    style={{ width: `${completedPercentage}%` }}
                />

                {/* Scrapped portion */}
                {scrappedPercentage > 0 && (
                    <div
                        className="absolute top-0 h-full bg-red-600 transition-all duration-300"
                        style={{
                            left: `${completedPercentage}%`,
                            width: `${scrappedPercentage}%`
                        }}
                    />
                )}

                {/* Progress indicator line */}
                {totalPercentage > 0 && totalPercentage < 100 && (
                    <div
                        className="absolute top-0 w-0.5 h-full bg-gray-800"
                        style={{ left: `${totalPercentage}%` }}
                    />
                )}
            </div>

            {showPercentage && (
                <div className="mt-1 text-xs text-muted-foreground text-center">
                    {Math.round(completedPercentage)}% Complete
                    {scrappedPercentage > 0 && ` • ${Math.round(scrappedPercentage)}% Scrap`}
                </div>
            )}
        </div>
    );
}
