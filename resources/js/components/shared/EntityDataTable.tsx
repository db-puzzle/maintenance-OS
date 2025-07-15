import { DataTable, type Column } from '@/components/data-table';
import { ColumnConfig } from '@/types/shared';
import { ArrowUpDown } from 'lucide-react';
import React from 'react';

interface EntityDataTableProps<T> {
    data: T[];
    columns: ColumnConfig[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    actions?: (row: T) => React.ReactNode;
    emptyMessage?: string;
    columnVisibility?: Record<string, boolean>;
    onSort?: (columnKey: string) => void;
}

export function EntityDataTable<T extends Record<string, unknown>>({
    data,
    columns,
    loading = false,
    onRowClick,
    actions,
    emptyMessage = 'Nenhum registro encontrado.',
    columnVisibility = {},
    onSort,
}: EntityDataTableProps<T>) {
    // Columns that should have centered headers
    const centeredHeaderColumns = ['execution_mode', 'trigger_info', 'last_execution', 'tasks_count', 'version', 'form_status'];

    // Convert ColumnConfig to DataTable Column format
    const dataTableColumns: Column<T>[] = columns.map((col) => {
        const shouldCenterHeader = centeredHeaderColumns.includes(col.key);

        return {
            id: col.key,
            header:
                col.sortable && onSort ? (
                    <div className={`flex cursor-pointer items-center gap-2 ${shouldCenterHeader ? 'justify-center' : ''}`} onClick={() => onSort(col.key)}>
                        {col.label}
                        <ArrowUpDown className="h-4 w-4" />
                    </div>
                ) : (
                    shouldCenterHeader ? (
                        <div className="text-center">{col.label}</div>
                    ) : (
                        col.label
                    )
                ),
            cell: (row: { original: T }): React.ReactNode => {
                const value = col.render ? col.render(row.original[col.key], row.original) : row.original[col.key];
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
            cell: (row: { original: T }) => actions(row.original),
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

        return <DataTable data={skeletonData} columns={dataTableColumns} columnVisibility={effectiveColumnVisibility} emptyMessage={emptyMessage} />;
    }

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
