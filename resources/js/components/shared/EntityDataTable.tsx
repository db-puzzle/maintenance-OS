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

export function EntityDataTable<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    onRowClick,
    actions,
    emptyMessage = 'Nenhum registro encontrado.',
    columnVisibility = {},
    onSort,
}: EntityDataTableProps<T>) {
    // Convert ColumnConfig to DataTable Column format
    const dataTableColumns: Column<T>[] = columns.map((col) => ({
        id: col.key,
        header:
            col.sortable && onSort ? (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => onSort(col.key)}>
                    {col.label}
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ) : (
                col.label
            ),
        cell: (row: { original: T }) => {
            return col.render ? col.render(row.original[col.key], row.original) : row.original[col.key];
        },
        width: col.width,
    }));

    // Add actions column if provided
    if (actions) {
        dataTableColumns.push({
            id: 'actions',
            header: 'Ações',
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
                const item: any = { id: `skeleton-${index}` };
                columns.forEach((col) => {
                    item[col.key] = '...';
                });
                return item;
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
