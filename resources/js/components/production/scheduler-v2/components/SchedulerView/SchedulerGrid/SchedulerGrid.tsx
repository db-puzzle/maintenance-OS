import React, { useState, useCallback } from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ResizableTableHeader } from '../../shared/ResizableTableHeader';

interface Column {
    key: string;
    title: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
}

interface SchedulerGridProps {
    workCells: any[];
}

export const SchedulerGrid: React.FC<SchedulerGridProps> = ({ workCells }) => {
    const [columns, setColumns] = useState([
        { key: 'name', title: 'Resource Name', width: 200, minWidth: 120, maxWidth: 300 },
        { key: 'tasks', title: 'Assigned Tasks', width: 100, minWidth: 80, maxWidth: 150 },
        { key: 'utilization', title: 'Utilization', width: 120, minWidth: 100, maxWidth: 200 },
    ]);

    const handleColumnsChange = useCallback((newColumns: Column[]) => {
        setColumns(newColumns as typeof columns);
    }, []);
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
            {/* Header - Updated to match timeline header height (60px) */}
            <div className="h-[60px] border-b bg-muted/50">
                <ResizableTableHeader
                    columns={columns}
                    onColumnsChange={handleColumnsChange}
                    className="h-full"
                />
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
                                    "flex h-[45px] items-center",
                                    "border-b hover:bg-accent/50"
                                )}
                            >
                                {/* Resource name */}
                                <div
                                    className="px-2 flex items-center gap-2 border-r"
                                    style={{ width: `${columns[0].width}px` }}
                                >
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
                                <div
                                    className="px-2 text-center text-sm border-r"
                                    style={{ width: `${columns[1].width}px` }}
                                >
                                    {assignedTasks}
                                </div>

                                {/* Utilization */}
                                <div
                                    className="px-2"
                                    style={{ width: `${columns[2].width}px` }}
                                >
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

