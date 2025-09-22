import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AllocationBarProps {
    allocation: any;
    x: number;
    y: number;
    width: number;
    height: number;
    isSelected: boolean;
    isDragging: boolean;
    onSelect: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}

export const AllocationBar: React.FC<AllocationBarProps> = ({
    allocation,
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
            case 'scheduled':
                return 'bg-blue-500';
            case 'in_progress':
                return 'bg-yellow-500';
            case 'completed':
                return 'bg-green-500';
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <div
            className={cn(
                "absolute flex items-center group",
                isDragging && "opacity-50 z-50",
                !allocation.is_locked && "cursor-move"
            )}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
            }}
            onClick={onSelect}
            onMouseDown={onDragStart}
        >
            {/* Main bar */}
            <div
                className={cn(
                    "relative h-full rounded shadow-sm overflow-hidden",
                    "border-2 transition-all",
                    getStatusColor(allocation.status || 'scheduled'),
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent",
                    "hover:shadow-md"
                )}
                style={{ width: '100%' }}
            >
                {/* Content */}
                <div className="absolute inset-0 px-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white truncate">
                        {allocation.name}
                    </span>
                    {allocation.is_locked && (
                        <Lock className="h-3 w-3 text-white/80 flex-shrink-0 ml-1" />
                    )}
                </div>
            </div>
        </div>
    );
};

