import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ResizableTableHeader } from '../../shared/ResizableTableHeader';
import { useScrollbarWidth } from '../../../hooks/useScrollbarWidth';

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
    // Column widths - no constraints, user can resize freely
    const [columns, setColumns] = useState<Column[]>([
        { key: 'name', title: 'Resource Name', width: 200, minWidth: 100 },
        { key: 'tasks', title: 'Assigned Tasks', width: 100, minWidth: 60 },
        { key: 'utilization', title: 'Utilization', width: 120, minWidth: 80 },
    ]);

    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);
    const scrollbarWidth = useScrollbarWidth();

    const handleColumnsChange = useCallback((newColumns: Column[]) => {
        setColumns(newColumns);
    }, []);

    // Check if ScrollContainer has vertical scrollbar
    useEffect(() => {
        const checkScrollbar = () => {
            // Find the ScrollContainer's actual scrollable element
            const scrollElement = containerRef.current?.querySelector('.overflow-auto') || scrollContainerRef.current;
            if (scrollElement) {
                const hasScroll = scrollElement.scrollHeight > scrollElement.clientHeight;
                setHasVerticalScrollbar(hasScroll);
            }
        };

        checkScrollbar();
        window.addEventListener('resize', checkScrollbar);

        // Also check when workCells change
        const timer = setTimeout(checkScrollbar, 100);

        return () => {
            window.removeEventListener('resize', checkScrollbar);
            clearTimeout(timer);
        };
    }, [workCells]);

    // Sync horizontal scroll from body to header
    const handleScrollContainerScroll = useCallback((e: Event) => {
        const target = e.target as HTMLElement;
        if (headerRef.current && target) {
            headerRef.current.scrollLeft = target.scrollLeft;
        }
    }, []);

    // Setup scroll listener for ScrollContainer
    useEffect(() => {
        const scrollElement = scrollContainerRef.current?.querySelector('.overflow-auto') || scrollContainerRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScrollContainerScroll);
            return () => scrollElement.removeEventListener('scroll', handleScrollContainerScroll);
        }
    }, [handleScrollContainerScroll]);
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
        <div ref={containerRef} className="h-full flex flex-col bg-background border-r">
            {/* Header - Updated to match timeline header height (60px) */}
            <div
                ref={headerRef}
                className="h-[60px] border-b bg-muted/50 overflow-x-hidden overflow-y-hidden"
                style={{ paddingRight: hasVerticalScrollbar ? `${scrollbarWidth}px` : 0 }}
            >
                <ResizableTableHeader
                    columns={columns}
                    onColumnsChange={handleColumnsChange}
                    className="h-full"
                />
            </div>

            {/* Resource list */}
            <div ref={scrollContainerRef} className="flex-1 min-h-0">
                <ScrollContainer id="scheduler-grid" axis="xy" className="h-full">
                    <div style={{
                        minWidth: `${columns.reduce((sum, col) => sum + col.width, 0)}px`,
                        minHeight: `${workCells.length * 45}px`
                    }}>
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
                                    style={{ minWidth: `${columns.reduce((sum, col) => sum + col.width, 0)}px` }}
                                >
                                    {/* Resource name */}
                                    <div
                                        className="px-2 flex items-center gap-2 border-r flex-shrink-0"
                                        style={{
                                            width: `${columns[0].width}px`,
                                            minWidth: `${columns[0].width}px`,
                                            maxWidth: `${columns[0].width}px`
                                        }}
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
                                        className="px-2 text-center text-sm border-r flex-shrink-0"
                                        style={{
                                            width: `${columns[1].width}px`,
                                            minWidth: `${columns[1].width}px`,
                                            maxWidth: `${columns[1].width}px`
                                        }}
                                    >
                                        {assignedTasks}
                                    </div>

                                    {/* Utilization */}
                                    <div
                                        className="px-2 flex-shrink-0"
                                        style={{
                                            width: `${columns[2].width}px`,
                                            minWidth: `${columns[2].width}px`,
                                            maxWidth: `${columns[2].width}px`
                                        }}
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
        </div>
    );
};

