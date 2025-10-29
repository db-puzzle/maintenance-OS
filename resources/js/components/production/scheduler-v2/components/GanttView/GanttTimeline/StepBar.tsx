import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface Step {
    name: string;
    status: string;
    is_locked?: boolean;
    percent_complete: number;
}

interface StepBarProps {
    step: Step;
    x: number;
    y: number;
    width: number;
    height: number;
    isSelected: boolean;
    isDragging: boolean;
    onSelect: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

export const StepBar: React.FC<StepBarProps> = ({
    step,
    x,
    y,
    width,
    height,
    isSelected,
    isDragging,
    onSelect,
    onDragStart,
}) => {
    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'pending':
                return 'bg-gray-400';
            case 'ready':
            case 'queued':
                return 'bg-yellow-400';
            case 'in_progress':
                return 'bg-blue-400';
            case 'completed':
                return 'bg-green-400';
            case 'on_hold':
                return 'bg-orange-400';
            default:
                return 'bg-gray-300';
        }
    };

    // const progressWidth = (width * step.percent_complete) / 100; // Unused variable

    return (
        <div
            className={cn(
                "absolute flex items-center group",
                isDragging && "opacity-50",
                !step.is_locked && "cursor-move"
            )}
            style={{
                left: `${x}px`,
                top: `${y + 8}px`,
                width: `${width}px`,
                height: `${height - 16}px`,
            }}
            onClick={onSelect}
            onMouseDown={onDragStart}
        >
            {/* Main bar */}
            <div
                className={cn(
                    "relative h-full rounded shadow-sm overflow-hidden",
                    "border-2 transition-all",
                    getStatusColor(step.status),
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent",
                    "hover:shadow-md"
                )}
                style={{ width: '100%' }}
            >
                {/* Progress overlay */}
                {step.percent_complete > 0 && (
                    <div
                        className="absolute inset-0 bg-black/15"
                        style={{ width: `${step.percent_complete}%` }}
                    />
                )}

                {/* Content */}
                <div className="absolute inset-0 px-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white truncate">
                        {step.name}
                    </span>
                    {step.is_locked && (
                        <Lock className="h-3 w-3 text-white/80 flex-shrink-0 ml-1" />
                    )}
                </div>

                {/* Progress percentage */}
                {step.percent_complete > 0 && width > 60 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <span className="text-xs text-white/80">
                            {step.percent_complete}%
                        </span>
                    </div>
                )}
            </div>

            {/* Resize handles */}
            {!step.is_locked && (
                <>
                    <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            // Handle resize start
                        }}
                    />
                    <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            // Handle resize end
                        }}
                    />
                </>
            )}
        </div>
    );
};

