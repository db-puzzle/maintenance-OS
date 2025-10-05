import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Column {
    key: string;
    title: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
}

interface ResizableTableHeaderProps {
    columns: Column[];
    onColumnsChange: (columns: Column[]) => void;
    className?: string;
    style?: React.CSSProperties;
}

export const ResizableTableHeader: React.FC<ResizableTableHeaderProps> = ({
    columns,
    onColumnsChange,
    className,
    style,
}) => {
    const [localColumns, setLocalColumns] = useState(columns);
    const [resizing, setResizing] = useState<string | null>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);

    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);

    const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
        e.preventDefault();
        const columnIndex = localColumns.findIndex(col => col.key === columnKey);
        if (columnIndex === -1) return;

        setResizing(columnKey);
        startXRef.current = e.clientX;
        startWidthRef.current = localColumns[columnIndex].width;
    }, [localColumns]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;

        const columnIndex = localColumns.findIndex(col => col.key === resizing);
        if (columnIndex === -1) return;

        const column = localColumns[columnIndex];
        const deltaX = e.clientX - startXRef.current;
        const newWidth = Math.max(
            column.minWidth || 50,
            startWidthRef.current + deltaX
        );

        const newColumns = [...localColumns];
        newColumns[columnIndex] = { ...column, width: newWidth };
        setLocalColumns(newColumns);
        onColumnsChange(newColumns);
    }, [resizing, localColumns, onColumnsChange]);

    const handleMouseUp = useCallback(() => {
        setResizing(null);
    }, []);

    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [resizing, handleMouseMove, handleMouseUp]);

    const totalWidth = localColumns.reduce((sum, col) => sum + col.width, 0);

    return (
        <div
            className={cn("flex bg-muted/30 sticky top-0 z-10 h-full", className)}
            style={{ ...style, minWidth: `${totalWidth}px` }}
        >
            {localColumns.map((column, index) => (
                <div
                    key={column.key}
                    className={cn(
                        "relative flex items-center text-xs font-medium text-muted-foreground px-3 h-full",
                        index < localColumns.length - 1 && "border-r"
                    )}
                    style={{ width: `${column.width}px` }}
                >
                    <span className="truncate">{column.title}</span>
                    {index < localColumns.length - 1 && (
                        <div
                            className={cn(
                                "absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group",
                                "hover:after:absolute hover:after:right-0 hover:after:top-0",
                                "hover:after:bottom-0 hover:after:w-1 hover:after:bg-primary/20",
                                resizing === column.key && "after:absolute after:right-0 after:top-0",
                                resizing === column.key && "after:bottom-0 after:w-1 after:bg-primary"
                            )}
                            onMouseDown={(e) => handleMouseDown(e, column.key)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};
