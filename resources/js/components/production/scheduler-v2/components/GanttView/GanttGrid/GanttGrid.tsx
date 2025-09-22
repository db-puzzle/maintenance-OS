import React from 'react';
import { ChevronRight, ChevronDown, Package, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GanttGridProps {
    tasks: any[];
    onTaskToggle?: (taskId: string) => void;
}

export const GanttGrid: React.FC<GanttGridProps> = ({ tasks, onTaskToggle }) => {
    return (
        <div className="gantt-grid bg-background">
            {/* Header */}
            <div className="gantt-grid-header flex bg-muted/30 border-b h-10 sticky top-0 z-10">
                <div className="w-[50px] flex items-center justify-center text-xs font-medium text-muted-foreground border-r px-2">
                    #
                </div>
                <div className="w-[280px] flex items-center text-xs font-medium text-muted-foreground border-r px-3">
                    Name
                </div>
                <div className="w-[120px] flex items-center text-xs font-medium text-muted-foreground border-r px-3">
                    % Complete
                </div>
                <div className="w-[160px] flex items-center text-xs font-medium text-muted-foreground px-3">
                    Assigned Resources
                </div>
            </div>

            {/* Body */}
            <div className="gantt-grid-body">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        className={cn(
                            "gantt-row flex h-[45px] border-b hover:bg-muted/20 transition-colors",
                            task.selected && "bg-primary/5"
                        )}
                    >
                        {/* Sequence Number */}
                        <div className="w-[50px] flex items-center justify-end text-xs text-muted-foreground border-r px-2">
                            {index + 1}
                        </div>

                        {/* Name Cell */}
                        <div
                            className="w-[280px] flex items-center gap-2 text-sm border-r px-3"
                            style={{ paddingLeft: `${12 + task.level * 24}px` }}
                        >
                            {task.isParent && (
                                <button
                                    onClick={() => onTaskToggle?.(task.id)}
                                    className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
                                >
                                    {task.expanded !== false ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </button>
                            )}

                            {!task.isParent && (
                                <div className="w-5 h-5 flex-shrink-0" /> // Spacer for alignment
                            )}

                            {task.type === 'order' ? (
                                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}

                            <span className="truncate font-medium">
                                {task.name || task.order_number || 'Untitled'}
                            </span>
                        </div>

                        {/* Percent Complete */}
                        <div className="w-[120px] flex items-center border-r px-3">
                            <div className="w-full">
                                <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-300"
                                        style={{ width: `${task.percentDone || task.percent_complete || 0}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-medium">
                                            {task.percentDone || task.percent_complete || 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Resources */}
                        <div className="w-[160px] flex items-center gap-1 px-3">
                            {task.work_cells && task.work_cells.length > 0 && (
                                <>
                                    {task.work_cells.slice(0, 3).map((workCell: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-semibold"
                                            title={workCell.name}
                                        >
                                            {workCell.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    ))}
                                    {task.work_cells.length > 3 && (
                                        <span className="text-xs text-muted-foreground">
                                            +{task.work_cells.length - 3}
                                        </span>
                                    )}
                                </>
                            )}
                            {(!task.work_cells || task.work_cells.length === 0) && (
                                <span className="text-xs text-muted-foreground">
                                    {task.isParent ? 'Multiple' : 'Unassigned'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
