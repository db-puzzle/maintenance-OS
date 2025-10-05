import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Package, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizableTableHeader } from '../../shared/ResizableTableHeader';

interface Column {
    key: string;
    title: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
}

interface GanttGridProps {
    tasks: any[];
    onTaskToggle?: (taskId: string) => void;
}

export const GanttGrid: React.FC<GanttGridProps> = ({ tasks, onTaskToggle }) => {
    const [columns, setColumns] = useState([
        { key: 'sequence', title: '#', width: 50, minWidth: 40, maxWidth: 80 },
        { key: 'name', title: 'Name', width: 280, minWidth: 150, maxWidth: 400 },
        { key: 'complete', title: '% Complete', width: 120, minWidth: 80, maxWidth: 200 },
        { key: 'resources', title: 'Assigned Resources', width: 160, minWidth: 100, maxWidth: 300 },
    ]);

    const handleColumnsChange = useCallback((newColumns: Column[]) => {
        setColumns(newColumns as typeof columns);
    }, []);
    return (
        <div className="gantt-grid bg-background h-full flex flex-col">
            {/* Header - Updated to match timeline header height (60px) */}
            <div className="h-[60px] border-b bg-muted/50">
                <ResizableTableHeader
                    columns={columns}
                    onColumnsChange={handleColumnsChange}
                    className="h-full gantt-grid-header"
                />
            </div>

            {/* Body */}
            <div className="gantt-grid-body flex-1 overflow-auto">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        className={cn(
                            "gantt-row flex h-[45px] border-b hover:bg-muted/10 transition-colors",
                            task.selected && "bg-primary/5"
                        )}
                    >
                        {/* Sequence Number */}
                        <div
                            className="flex items-center justify-end text-xs text-muted-foreground border-r px-2"
                            style={{ width: `${columns[0].width}px` }}
                        >
                            {index + 1}
                        </div>

                        {/* Name Cell */}
                        <div
                            className="flex items-center gap-2 text-sm border-r px-3"
                            style={{
                                width: `${columns[1].width}px`,
                                paddingLeft: `${12 + task.level * 24}px`
                            }}
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
                        <div
                            className="flex items-center border-r px-3"
                            style={{ width: `${columns[2].width}px` }}
                        >
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
                        <div
                            className="flex items-center gap-1 px-3"
                            style={{ width: `${columns[3].width}px` }}
                        >
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
