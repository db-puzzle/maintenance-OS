import React from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SchedulerGridProps {
    workCells: any[];
}

export const SchedulerGrid: React.FC<SchedulerGridProps> = ({ workCells }) => {
    const getUtilizationColor = (utilization: number): string => {
        if (utilization >= 90) return 'text-red-600';
        if (utilization >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getCellTypeLabel = (type: string): string => {
        switch (type) {
            case 'internal':
                return 'Internal';
            case 'external':
                return 'External';
            default:
                return type;
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="grid grid-cols-[200px_100px_120px] h-[40px] items-center border-b bg-muted/50 font-medium text-sm sticky top-0 z-10">
                <div className="px-2">Resource Name</div>
                <div className="px-2 text-center">Assigned Tasks</div>
                <div className="px-2 text-center">Utilization</div>
            </div>

            {/* Resource list */}
            <ScrollContainer id="scheduler-grid" axis="y" className="flex-1 overflow-auto">
                <div>
                    {workCells.map((workCell) => {
                        const utilization = workCell.current_utilization || 0;
                        const assignedTasks = workCell.scheduled_steps?.length || 0;

                        return (
                            <div
                                key={workCell.id}
                                className={cn(
                                    "grid grid-cols-[200px_100px_120px] h-[45px] items-center",
                                    "border-b hover:bg-accent/50"
                                )}
                            >
                                {/* Resource name */}
                                <div className="px-2 flex items-center gap-2">
                                    <span className="font-medium truncate">
                                        {workCell.name}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {getCellTypeLabel(workCell.cell_type)}
                                    </Badge>
                                    {!workCell.has_finite_capacity && (
                                        <Badge variant="secondary" className="text-xs">
                                            ∞
                                        </Badge>
                                    )}
                                </div>

                                {/* Assigned tasks count */}
                                <div className="px-2 text-center text-sm">
                                    {assignedTasks}
                                </div>

                                {/* Utilization */}
                                <div className="px-2">
                                    {workCell.has_finite_capacity ? (
                                        <div className="flex items-center gap-2">
                                            <Progress
                                                value={utilization}
                                                className="h-4 flex-1"
                                            />
                                            <span className={cn(
                                                "text-xs font-medium",
                                                getUtilizationColor(utilization)
                                            )}>
                                                {utilization}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            Unlimited
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollContainer>
        </div>
    );
};

