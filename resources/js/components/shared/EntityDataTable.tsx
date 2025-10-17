import { DataTable, type Column } from '@/components/data-table';
import { ColumnConfig } from '@/types/shared';
import { ArrowUpDown } from 'lucide-react';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface EntityDataTableProps<T> {
    data: T[];
    columns: ColumnConfig<T>[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    onRowDoubleClick?: (row: T) => void;
    actions?: (row: T) => React.ReactNode;
    emptyMessage?: string;
    columnVisibility?: Record<string, boolean>;
    onSort?: (columnKey: string) => void;
    maxHeight?: string;
    // Selection props
    selectable?: boolean;
    selectedRows?: Set<string | number>;
    onSelectionChange?: (selectedRows: Set<string | number>) => void;
    getRowId?: (row: T) => string | number;
}
export function EntityDataTable<T>({
    data,
    columns,
    loading = false,
    onRowClick,
    onRowDoubleClick,
    actions,
    emptyMessage = 'Nenhum registro encontrado.',
    columnVisibility = {},
    onSort,
    maxHeight,
    selectable = false,
    selectedRows = new Set<string | number>(),
    onSelectionChange,
    getRowId = (row: T) => (row as { id: string | number }).id,
}: EntityDataTableProps<T>) {
    // Handle select all logic
    const handleSelectAll = () => {
        if (!onSelectionChange) return;

        const allRowIds = data.map(row => getRowId(row));
        const allSelected = allRowIds.every(id => selectedRows.has(id));

        if (allSelected) {
            // Deselect all
            onSelectionChange(new Set());
        } else {
            // Select all
            onSelectionChange(new Set(allRowIds));
        }
    };

    // Handle individual row selection
    const handleRowSelection = (row: T) => {
        if (!onSelectionChange) return;

        const rowId = getRowId(row);
        const newSelection = new Set(selectedRows);

        if (newSelection.has(rowId)) {
            newSelection.delete(rowId);
        } else {
            newSelection.add(rowId);
        }

        onSelectionChange(newSelection);
    };

    // Check if all rows are selected
    const isAllSelected = data.length > 0 && data.every(row => selectedRows.has(getRowId(row)));
    const isIndeterminate = data.some(row => selectedRows.has(getRowId(row))) && !isAllSelected;

    // Columns that should have centered headers
    const centeredHeaderColumns = ['execution_mode', 'trigger_info', 'last_execution', 'tasks_count', 'version', 'form_status'];

    // Create checkbox column if selectable
    const checkboxColumn: Column<T> | null = selectable ? {
        id: 'select',
        header: (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
                />
            </div>
        ),
        cell: (row: { original: T }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={selectedRows.has(getRowId(row.original))}
                    onCheckedChange={() => handleRowSelection(row.original)}
                    aria-label="Select row"
                />
            </div>
        ),
        width: 'w-[40px]',
    } : null;

    // Convert ColumnConfig to DataTable Column format
    const dataTableColumns: Column<T>[] = [
        ...(checkboxColumn ? [checkboxColumn] : []),
        ...columns.map((col) => {
            const shouldCenterHeader = centeredHeaderColumns.includes(col.key) || col.headerAlign === 'center';
            const headerAlign = col.headerAlign || (shouldCenterHeader ? 'center' : 'left');
            const getAlignmentClass = (align: string) => {
                switch (align) {
                    case 'center': return 'justify-center';
                    case 'right': return 'justify-end';
                    default: return '';
                }
            };
            return {
                id: col.key,
                header:
                    col.sortable && onSort ? (
                        <div className={`flex cursor-pointer items-center gap-2 ${getAlignmentClass(headerAlign)}`} onClick={() => onSort(col.key)}>
                            {col.label}
                            <ArrowUpDown className="h-4 w-4" />
                        </div>
                    ) : (
                        headerAlign === 'center' ? (
                            <div className="text-center">{col.label}</div>
                        ) : headerAlign === 'right' ? (
                            <div className="text-right">{col.label}</div>
                        ) : (
                            col.label
                        )
                    ),
                cell: (row: { original: T }): React.ReactNode => {
                    const value = col.render ? col.render((row.original as Record<string, unknown>)[col.key], row.original) : (row.original as Record<string, unknown>)[col.key];
                    return value as React.ReactNode;
                },
                width: col.width,
            };
        })
    ];
    // Add actions column if provided
    if (actions) {
        dataTableColumns.push({
            id: 'actions',
            header: <div className="text-center">Ações</div>,
            cell: (row: { original: T }) => (
                <div className="flex justify-center">
                    {actions(row.original)}
                </div>
            ),
            width: 'w-[80px]',
        });
    }
    // Handle column visibility - ensure all columns are visible by default
    const effectiveColumnVisibility = React.useMemo(() => {
        const visibility: Record<string, boolean> = {};
        columns.forEach((col) => {
            visibility[col.key] = columnVisibility[col.key] !== false;
        });
        if (actions) {
            visibility['actions'] = true;
        }
        return visibility;
    }, [columns, columnVisibility, actions]);

    // Helper function to render the custom table with fixed header
    const renderCustomTable = (tableData: T[], isLoading = false) => {
        const visibleColumns = dataTableColumns.filter((column) =>
            column.id === 'actions' || effectiveColumnVisibility[column.id]
        );

        return (
            <div className="w-full rounded-md border bg-background">
                {/* Fixed Header */}
                <div className="w-full border-b bg-muted">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {visibleColumns.map((column, index) => (
                                    <TableHead key={column.id} className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}>
                                        {column.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                    </Table>
                </div>

                {/* Scrollable Body */}
                <div className="w-full overflow-auto" style={{ maxHeight: `calc(${maxHeight} - 41px)` }}>
                    <Table>
                        <TableBody>
                            {tableData.length ? (
                                tableData.map((row) => {
                                    const rowId = getRowId(row);
                                    const isSelected = selectedRows.has(rowId);
                                    return (
                                        <TableRow
                                            key={rowId}
                                            data-state={isSelected ? "selected" : undefined}
                                            className={cn(
                                                "transition-colors",
                                                isSelected && "bg-muted/50",
                                                onRowClick && !isLoading && "cursor-pointer",
                                                !isSelected && onRowClick && !isLoading && "hover:bg-muted/50",
                                                !onRowClick && "hover:bg-transparent"
                                            )}
                                            onClick={(e) => {
                                                if (onRowClick && !isLoading) {
                                                    // Don't trigger row click if clicking on checkbox
                                                    const target = e.target as HTMLElement;
                                                    if (!target.closest('[data-slot="checkbox"]') && !target.closest('[data-slot="checkbox-indicator"]')) {
                                                        onRowClick(row);
                                                    }
                                                }
                                            }}
                                            onDoubleClick={(e) => {
                                                if (onRowDoubleClick && !isLoading) {
                                                    // Don't trigger double click if clicking on checkbox
                                                    const target = e.target as HTMLElement;
                                                    if (!target.closest('[data-slot="checkbox"]') && !target.closest('[data-slot="checkbox-indicator"]')) {
                                                        onRowDoubleClick(row);
                                                    }
                                                }
                                            }}
                                        >
                                            {visibleColumns.map((column, index) => (
                                                <TableCell
                                                    key={column.id}
                                                    className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}
                                                    onClick={(e) => {
                                                        if (column.id === 'actions') {
                                                            e.stopPropagation();
                                                        }
                                                    }}
                                                >
                                                    {column.cell({ original: row })}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length} className="h-24 pl-4 text-center">
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    if (loading) {
        // Return loading skeleton using the same DataTable structure
        const skeletonData = Array(5)
            .fill({})
            .map((_, index) => {
                const item: Record<string, unknown> = { id: `skeleton-${index}` };
                columns.forEach((col) => {
                    // Don't override the id column
                    if (col.key !== 'id') {
                        item[col.key] = '...';
                    }
                });
                return item as T;
            });

        if (maxHeight) {
            return renderCustomTable(skeletonData, true);
        }
        return <DataTable data={skeletonData} columns={dataTableColumns} columnVisibility={effectiveColumnVisibility} emptyMessage={emptyMessage} />;
    }

    // Use custom table with ScrollArea if maxHeight is provided
    if (maxHeight) {
        return renderCustomTable(data);
    }

    // Otherwise use the standard DataTable with custom row rendering for selection
    return (
        <div className="w-full overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                        {dataTableColumns
                            .filter((column) => column.id === 'actions' || effectiveColumnVisibility[column.id])
                            .map((column, index) => (
                                <TableHead key={column.id} className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}>
                                    {column.header}
                                </TableHead>
                            ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length ? (
                        data.map((row) => {
                            const rowId = getRowId(row);
                            const isSelected = selectedRows.has(rowId);
                            return (
                                <TableRow
                                    key={rowId}
                                    data-state={isSelected ? "selected" : undefined}
                                    className={cn(
                                        "transition-colors",
                                        isSelected && "bg-muted/50",
                                        onRowClick && "cursor-pointer",
                                        !isSelected && onRowClick && "hover:bg-muted/50",
                                        !onRowClick && "hover:bg-transparent"
                                    )}
                                    onClick={(e) => {
                                        if (onRowClick) {
                                            // Don't trigger row click if clicking on checkbox
                                            const target = e.target as HTMLElement;
                                            if (!target.closest('[data-slot="checkbox"]') && !target.closest('[data-slot="checkbox-indicator"]')) {
                                                onRowClick(row);
                                            }
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        if (onRowDoubleClick) {
                                            // Don't trigger double click if clicking on checkbox
                                            const target = e.target as HTMLElement;
                                            if (!target.closest('[data-slot="checkbox"]') && !target.closest('[data-slot="checkbox-indicator"]')) {
                                                onRowDoubleClick(row);
                                            }
                                        }
                                    }}
                                >
                                    {dataTableColumns
                                        .filter((column) => column.id === 'actions' || effectiveColumnVisibility[column.id])
                                        .map((column, index) => (
                                            <TableCell
                                                key={column.id}
                                                className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}
                                                onClick={(e) => {
                                                    if (column.id === 'actions') {
                                                        e.stopPropagation();
                                                    }
                                                }}
                                            >
                                                {column.cell({ original: row })}
                                            </TableCell>
                                        ))}
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={dataTableColumns.filter((column) => column.id === 'actions' || effectiveColumnVisibility[column.id]).length} className="h-24 pl-4 text-center">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
