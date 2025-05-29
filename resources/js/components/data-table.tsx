import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDownIcon, ColumnsIcon } from 'lucide-react';
import * as React from 'react';

export interface Column<T> {
    id: string;
    header: React.ReactNode;
    cell: (row: { original: T }) => React.ReactNode;
    width?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    columnVisibility: Record<string, boolean>;
    onColumnVisibilityChange: (columnId: string, value: boolean) => void;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
}

export function DataTable<T>({
    data,
    columns,
    columnVisibility,
    onColumnVisibilityChange,
    onRowClick,
    emptyMessage = 'Nenhum registro encontrado.',
}: DataTableProps<T>) {
    // Memoize the filtered columns to prevent unnecessary re-renders
    const visibleColumns = React.useMemo(() => {
        return columns.filter((column) => column.id === 'actions' || columnVisibility[column.id]);
    }, [columns, columnVisibility]);

    return (
        <div className="w-full overflow-hidden rounded-lg border shadow-none">
            <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                        {visibleColumns.map((column, index) => (
                            <TableHead key={column.id} className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}>
                                {column.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length ? (
                        data.map((row) => (
                            <TableRow
                                key={(row as any).id}
                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => onRowClick?.(row)}
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
    );
}

interface ColumnVisibilityProps {
    columns: { id: string; header: React.ReactNode }[];
    columnVisibility: Record<string, boolean>;
    onColumnVisibilityChange: (columnId: string, value: boolean) => void;
}

export function ColumnVisibility({ columns, columnVisibility, onColumnVisibilityChange }: ColumnVisibilityProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <ColumnsIcon className="mr-2 h-4 w-4" />
                    <span className="hidden lg:inline">Customizar Colunas</span>
                    <span className="lg:hidden">Colunas</span>
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {columns
                    .filter((column) => column.id !== 'actions')
                    .map((column) => (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={columnVisibility[column.id]}
                            onCheckedChange={(value) => {
                                onColumnVisibilityChange(column.id, value);
                            }}
                        >
                            {column.header}
                        </DropdownMenuCheckboxItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
