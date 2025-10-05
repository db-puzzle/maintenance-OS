import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Package, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizableTableHeader } from '../../shared/ResizableTableHeader';
import { useScrollbarWidth } from '../../../hooks/useScrollbarWidth';
import { ScrollContainer } from '../../shared/ScrollContainer';

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
    // Column widths - no constraints, user can resize freely
    const [columns, setColumns] = useState<Column[]>([
        { key: 'sequence', title: '#', width: 50, minWidth: 30 },
        { key: 'name', title: 'Name', width: 280, minWidth: 100 },
        { key: 'complete', title: '% Complete', width: 120, minWidth: 60 },
        { key: 'resources', title: 'Assigned Resources', width: 160, minWidth: 80 },
    ]);

    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);
    const scrollbarWidth = useScrollbarWidth();

    const handleColumnsChange = useCallback((newColumns: Column[]) => {
        setColumns(newColumns);
    }, []);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Check if ScrollContainer has vertical scrollbar and sync header scroll
    useEffect(() => {
        const checkScrollbar = () => {
            // Find the ScrollContainer's actual scrollable element
            const scrollElement = containerRef.current?.querySelector('.scroll-container');
            if (scrollElement) {
                const hasScroll = scrollElement.scrollHeight > scrollElement.clientHeight;
                setHasVerticalScrollbar(hasScroll);
            }
        };

        checkScrollbar();
        window.addEventListener('resize', checkScrollbar);

        // Also check when tasks change
        const timer = setTimeout(checkScrollbar, 100);

        return () => {
            window.removeEventListener('resize', checkScrollbar);
            clearTimeout(timer);
        };
    }, [tasks]);

    // Sync horizontal scroll between header and body
    const handleScrollContainerScroll = useCallback((e: Event) => {
        const target = e.target as HTMLElement;
        if (headerRef.current && target) {
            headerRef.current.scrollLeft = target.scrollLeft;
        }
    }, []);

    // Setup scroll listener for ScrollContainer
    useEffect(() => {
        const scrollElement = scrollContainerRef.current?.querySelector('.scroll-container');
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScrollContainerScroll);
            return () => scrollElement.removeEventListener('scroll', handleScrollContainerScroll);
        }
    }, [handleScrollContainerScroll]);
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-background overflow-hidden border-r">
            {/* Header - Updated to match timeline header height (60px) */}
            <div
                ref={headerRef}
                className="h-[60px] border-b bg-muted/50 overflow-hidden flex-shrink-0"
                style={{ paddingRight: hasVerticalScrollbar ? `${scrollbarWidth}px` : 0 }}
            >
                <div style={{ minWidth: `${totalWidth}px`, height: '100%' }}>
                    <ResizableTableHeader
                        columns={columns}
                        onColumnsChange={handleColumnsChange}
                        className="h-full gantt-grid-header"
                    />
                </div>
            </div>

            {/* Body with ScrollContainer */}
            <div ref={scrollContainerRef} className="flex-1">
                <ScrollContainer id="gantt-grid" axis="xy" className="h-full">
                    <div style={{ minWidth: `${totalWidth}px` }}>
                        {tasks.map((task, index) => (
                            <div
                                key={task.id}
                                className={cn(
                                    "gantt-row flex h-[45px] border-b hover:bg-muted/10 transition-colors",
                                    task.selected && "bg-primary/5"
                                )}
                                style={{ minWidth: `${columns.reduce((sum, col) => sum + col.width, 0)}px` }}
                            >
                                {/* Sequence Number */}
                                <div
                                    className="flex items-center justify-end text-xs text-muted-foreground border-r px-2 flex-shrink-0"
                                    style={{
                                        width: `${columns[0].width}px`,
                                        minWidth: `${columns[0].width}px`,
                                        maxWidth: `${columns[0].width}px`
                                    }}
                                >
                                    {index + 1}
                                </div>

                                {/* Name Cell */}
                                <div
                                    className="flex items-center gap-2 text-sm border-r px-3 flex-shrink-0"
                                    style={{
                                        width: `${columns[1].width}px`,
                                        minWidth: `${columns[1].width}px`,
                                        maxWidth: `${columns[1].width}px`,
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
                                    className="flex items-center border-r px-3 flex-shrink-0"
                                    style={{
                                        width: `${columns[2].width}px`,
                                        minWidth: `${columns[2].width}px`,
                                        maxWidth: `${columns[2].width}px`
                                    }}
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
                                    className="flex items-center gap-1 px-3 flex-shrink-0"
                                    style={{
                                        width: `${columns[3].width}px`,
                                        minWidth: `${columns[3].width}px`,
                                        maxWidth: `${columns[3].width}px`
                                    }}
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
                </ScrollContainer>
            </div>
        </div>
    );
};
