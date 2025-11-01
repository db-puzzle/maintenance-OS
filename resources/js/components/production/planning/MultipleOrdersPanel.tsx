import React, { useMemo } from 'react';
import { ManufacturingOrder } from '@/types/production';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { router } from '@inertiajs/react';
import {
    CheckCircle,
    XCircle
} from 'lucide-react';

declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

interface MultipleOrdersPanelProps {
    selectedOrders: ManufacturingOrder[];
    className?: string;
}

export function MultipleOrdersPanel({ selectedOrders, className }: MultipleOrdersPanelProps) {
    // Define columns for the EntityDataTable
    const columns: ColumnConfig<ManufacturingOrder>[] = useMemo(() => [
        {
            key: 'order_number',
            label: 'MO Number',
            sortable: true,
            render: (value: unknown) => (
                <span className="font-medium">{value as React.ReactNode}</span>
            ),
            width: 'w-[160px]'
        },
        {
            key: 'item',
            label: 'Item Name',
            sortable: false,
            render: (_value, row) => (
                <div className="flex flex-col">
                    {row.item ? (
                        <>
                            <span
                                className="font-medium text-primary hover:underline cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.visit(route('production.items.show', row.item!.id));
                                }}
                            >
                                {row.item.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{row.item.item_number}</span>
                        </>
                    ) : (
                        <span className="font-medium">-</span>
                    )}
                </div>
            ),
            width: 'w-[250px]'
        },
        {
            key: 'quantity',
            label: 'Quantity',
            sortable: true,
            render: (value) => (
                <div className="w-full text-center">
                    {formatNumber(value as number)}
                </div>
            ),
            headerAlign: 'center',
            width: 'w-[100px]'
        },
        {
            key: 'item_category',
            label: 'Item Category',
            sortable: false,
            render: (_value, row) => {
                const categoryName = row.item?.category?.name;

                if (!categoryName) {
                    return (
                        <span className="text-muted-foreground text-sm">
                            No category
                        </span>
                    );
                }

                return (
                    <span className="font-medium text-sm">
                        {categoryName}
                    </span>
                );
            },
            width: 'w-[180px]'
        },
        {
            key: 'can_be_sold',
            label: 'Can Be Sold',
            sortable: false,
            render: (_value, row) => (
                <div className="flex items-center justify-center">
                    {row.item?.can_be_sold ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                </div>
            ),
            headerAlign: 'center',
            width: 'w-[120px]'
        },
        {
            key: 'can_be_purchased',
            label: 'Can Be Purchased',
            sortable: false,
            render: (_value, row) => (
                <div className="flex items-center justify-center">
                    {row.item?.can_be_purchased ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                </div>
            ),
            headerAlign: 'center',
            width: 'w-[150px]'
        },
        {
            key: 'can_be_manufactured',
            label: 'Can Be Manufactured',
            sortable: false,
            render: (_value, row) => (
                <div className="flex items-center justify-center">
                    {row.item?.can_be_manufactured ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                </div>
            ),
            headerAlign: 'center',
            width: 'w-[180px]'
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (value) => {
                const status = value as string;
                const getStatusColor = (status: string) => {
                    switch (status) {
                        case 'draft':
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
                        case 'planned':
                            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
                        case 'released':
                            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
                        case 'in_progress':
                            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
                        case 'completed':
                            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
                        case 'cancelled':
                            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
                        default:
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
                    }
                };

                return (
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className={cn("text-xs", getStatusColor(status))}
                        >
                            {status}
                        </Badge>
                    </div>
                );
            },
            headerAlign: 'center',
            width: 'w-[120px]'
        }
    ], []);

    return (
        <div className={cn("h-full flex flex-col", className)}>
            {/* Data table */}
            <div className="w-full p-4">
                <EntityDataTable
                    data={selectedOrders}
                    columns={columns}
                    loading={false}
                    emptyMessage="No manufacturing orders selected."
                    maxHeight="calc(100vh - 200px)"
                />
            </div>
        </div>
    );
}