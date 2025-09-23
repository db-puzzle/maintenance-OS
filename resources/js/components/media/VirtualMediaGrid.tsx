import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as ReactWindow from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Media } from '@/types/media';
import { ProgressiveImage } from './ProgressiveImage';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const Grid = ReactWindow.FixedSizeGrid;
type GridChildComponentProps = ReactWindow.GridChildComponentProps;

interface VirtualMediaGridProps {
    media: Media[];
    onItemClick?: (media: Media, index: number) => void;
    onSelectionChange?: (selected: Media[]) => void;
    selectable?: boolean;
    columnMinWidth?: number;
    gap?: number;
}

export function VirtualMediaGrid({
    media,
    onItemClick,
    onSelectionChange,
    selectable = false,
    columnMinWidth = 200,
    gap = 16,
}: VirtualMediaGridProps) {
    const gridRef = useRef<Grid>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [columnCount, setColumnCount] = useState(4);

    const toggleSelection = useCallback((item: Media) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                newSet.add(item.id);
            }

            if (onSelectionChange) {
                const selected = media.filter(m => newSet.has(m.id));
                onSelectionChange(selected);
            }

            return newSet;
        });
    }, [media, onSelectionChange]);

    // Calculate dynamic column count based on container width
    const calculateColumns = useCallback((width: number) => {
        const availableWidth = width - gap;
        const columns = Math.floor(availableWidth / (columnMinWidth + gap));
        return Math.max(1, columns);
    }, [columnMinWidth, gap]);

    // Fixed row height for FixedSizeGrid
    const rowHeight = useMemo(() => {
        const columnWidth = (window.innerWidth - gap * (columnCount + 1)) / columnCount;
        // Use a standard aspect ratio for fixed height
        return columnWidth + gap;
    }, [columnCount, gap]);

    // Fixed column width for FixedSizeGrid
    const columnWidth = useMemo(() => {
        const totalWidth = window.innerWidth;
        const availableWidth = totalWidth - gap * (columnCount + 1);
        return availableWidth / columnCount;
    }, [columnCount, gap]);

    // Memoized cell renderer
    const Cell = useMemo(() => {
        return React.memo(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
            const index = rowIndex * columnCount + columnIndex;
            const item = media[index];

            if (!item) return null;

            const isSelected = selectedIds.has(item.id);
            const isPriority = index < columnCount * 2; // First two rows

            // Adjust style for gaps
            const adjustedStyle = {
                ...style,
                left: (style.left as number) + gap,
                top: (style.top as number) + gap,
                width: (style.width as number) - gap,
                height: (style.height as number) - gap,
            };

            return (
                <div style={adjustedStyle} className="relative group">
                    <ProgressiveImage
                        src={item.url}
                        srcSet={`
                            ${item.conversions?.thumb} 300w,
                            ${item.conversions?.preview} 600w,
                            ${item.conversions?.large} 1200w
                        `}
                        sizes={`(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw`}
                        alt={item.name}
                        blurhash={item.blurhash}
                        dominantColor={item.dominant_color}
                        aspectRatio={item.aspect_ratio}
                        priority={isPriority}
                        className={cn(
                            'rounded-lg transition-all cursor-pointer',
                            isSelected && 'ring-2 ring-primary ring-offset-2'
                        )}
                        containerClassName="w-full h-full"
                        onLoad={() => {
                            // Recalculate row height if needed
                            if (gridRef.current) {
                                gridRef.current.resetAfterRowIndex(rowIndex);
                            }
                        }}
                    />

                    {/* Selection checkbox */}
                    {selectable && (
                        <div
                            className={cn(
                                'absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity',
                                isSelected && 'opacity-100'
                            )}
                        >
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(item)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* Item overlay */}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-lg"
                        onClick={() => onItemClick?.(item, index)}
                    />
                </div>
            );
        });
    }, [media, columnCount, gap, selectedIds, selectable, toggleSelection, onItemClick]);

    Cell.displayName = 'VirtualGridCell';

    const rowCount = Math.ceil(media.length / columnCount);

    return (
        <AutoSizer>
            {({ height, width }) => {
                const newColumnCount = calculateColumns(width);
                if (newColumnCount !== columnCount) {
                    setColumnCount(newColumnCount);
                }

                return (
                    <Grid
                        ref={gridRef}
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        height={height}
                        rowCount={rowCount}
                        rowHeight={rowHeight}
                        width={width}
                        overscanRowCount={2}
                        overscanColumnCount={1}
                        itemData={media}
                    >
                        {Cell}
                    </Grid>
                );
            }}
        </AutoSizer>
    );
}
