import { DataTable, type Column } from '@/components/data-table';
import { ColumnConfig } from '@/types/shared';
import { ArrowUpDown } from 'lucide-react';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EntityDataTableProps<T> {
    data: T[];
    columns: ColumnConfig<T>[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    actions?: (row: T) => React.ReactNode;
    emptyMessage?: string;
    columnVisibility?: Record<string, boolean>;
    onSort?: (columnKey: string) => void;
    maxHeight?: string;
}
export function EntityDataTable<T>({
    data,
    columns,
    loading = false,
    onRowClick,
    actions,
    emptyMessage = 'Nenhum registro encontrado.',
    columnVisibility = {},
    onSort,
    maxHeight,
}: EntityDataTableProps<T>) {
    // Columns that should have centered headers
    const centeredHeaderColumns = ['execution_mode', 'trigger_info', 'last_execution', 'tasks_count', 'version', 'form_status'];
    // Convert ColumnConfig to DataTable Column format
    const dataTableColumns: Column<T>[] = columns.map((col) => {
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
    });
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
                                tableData.map((row) => (
                                    <TableRow
                                        key={(row as { id: string | number }).id}
                                        className={onRowClick && !isLoading ? "hover:bg-muted/50 cursor-pointer transition-colors" : "hover:bg-transparent"}
                                        onClick={onRowClick && !isLoading ? () => onRowClick(row) : undefined}
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
                                ))
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

    // Otherwise use the standard DataTable
    return (
        <DataTable
            data={data}
            columns={dataTableColumns}
            columnVisibility={effectiveColumnVisibility}
            onRowClick={onRowClick}
            emptyMessage={emptyMessage}
        />
    );
}
