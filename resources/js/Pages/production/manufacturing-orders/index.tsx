import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    Factory,
    Package,
    GitBranch,
    Calendar,
    AlertCircle,
    Workflow
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import CreateManufacturingOrderDialog from '@/components/production/CreateManufacturingOrderDialog';
import { ColumnConfig } from '@/types/shared';
import { ManufacturingOrder, Item, BillOfMaterial, RouteTemplate } from '@/types/production';
interface Props {
    orders: {
        data: ManufacturingOrder[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    statuses: Record<string, string>;
    filters: {
        status?: string;
        search?: string;
        parent_id?: string;
    };
    items?: Item[];
    billsOfMaterial?: BillOfMaterial[];
    routeTemplates?: RouteTemplate[];
    sourceTypes?: Record<string, string>;
}
export default function ManufacturingOrders({
    orders,
    statuses,
    filters,
    items = [],
    billsOfMaterial = [],
    routeTemplates = [],
    sourceTypes = {}
}: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [statusFilter] = useState(filters.status || '');
    const [parentFilter] = useState(filters.parent_id || '');
    const [loading] = useState(false);
    const [deleteOrder, setDeleteOrder] = useState<ManufacturingOrder | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.orders.index'), {
            ...filters,
            search: value
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders']
        });
    };
    const handleStatusFilter = (value: string) => {
        router.get(route('production.orders.index'), {
            ...filters,
            status: value === 'all' ? undefined : value,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handleParentFilter = (value: string) => {
        router.get(route('production.orders.index'), {
            ...filters,
            parent_id: value === 'all' ? undefined : value,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handleDelete = async () => {
        if (!deleteOrder) return;
        try {
            await router.delete(route('production.orders.destroy', deleteOrder.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteOrder(null);
                },
                onError: () => {
                    console.error('Failed to delete order');
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
        }
    };
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'draft':
                return 'secondary';
            case 'planned':
                return 'outline';
            case 'released':
            case 'in_progress':
            case 'completed':
                return 'default';
            case 'cancelled':
                return 'destructive';
            default:
                return 'secondary';
        }
    };
    const getPriorityColor = (priority: number) => {
        if (priority >= 80) return 'text-red-600';
        if (priority >= 60) return 'text-orange-600';
        if (priority >= 40) return 'text-yellow-600';
        return 'text-gray-600';
    };
    const columns: ColumnConfig[] = [
        {
            key: 'order_number',
            label: 'Order Number',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown, order: Record<string, unknown>) => (
                <div className="flex items-center gap-2">
                    <Link
                        href={route('production.orders.show', order.id)}
                        className="font-medium text-primary hover:underline"
                    >
                        {value as React.ReactNode}
                    </Link>
                    {order.parent_id ? (
                        <Badge variant="outline" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            Child
                        </Badge>
                    ) : null}
                    {(order.child_orders_count as number) > 0 && (
                        <Badge variant="outline" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {order.child_orders_count as React.ReactNode}
                        </Badge>
                    )}
                    {order.manufacturing_route ? (
                        <Badge variant="outline" className="text-xs">
                            <Workflow className="h-3 w-3" />
                        </Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'item',
            label: 'Item',
            width: 'w-[250px]',
            render: (value: unknown, order: Record<string, unknown>) => (
                <div>
                    <p className="font-medium">{(order.item as unknown)?.item_number || '-'}</p>
                    <p className="text-sm text-muted-foreground">{(order.item as unknown)?.name || '-'}</p>
                </div>
            ),
        },
        {
            key: 'quantity',
            label: 'Quantity',
            width: 'w-[120px]',
            render: (value: unknown, order: Record<string, unknown>) => (
                <div>
                    <p className="font-medium">
                        {order.quantity as React.ReactNode} {order.unit_of_measure as React.ReactNode}
                    </p>
                    {(order.quantity_completed as number) > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {order.quantity_completed as React.ReactNode} completed
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            width: 'w-[120px]',
            render: (value: unknown) => (
                <Badge variant={getStatusBadgeVariant(value as string)}>
                    {statuses[value as string] || String(value)}
                </Badge>
            ),
        },
        {
            key: 'priority',
            label: 'Priority',
            width: 'w-[80px]',
            render: (value: unknown) => (
                <span className={`font-medium ${getPriorityColor(value as number)}`}>
                    {value as React.ReactNode}
                </span>
            ),
        },
        {
            key: 'requested_date',
            label: 'Requested',
            width: 'w-[120px]',
            render: (value: unknown) => (
                <div className="text-sm">
                    {value ? new Date(value as string | number | Date).toLocaleDateString() : '-'}
                </div>
            ),
        },
        {
            key: 'progress',
            label: 'Progress',
            width: 'w-[120px]',
            render: (value: unknown, order: Record<string, unknown>) => {
                const progress = (order.quantity as number) > 0
                    ? Math.round(((order.quantity_completed as number) / (order.quantity as number)) * 100)
                    : 0;
                return (
                    <div className="w-24">
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                );
            },
        },
    ];
    const stats = React.useMemo(() => {
        const statusCounts = orders.data.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return [
            {
                title: 'Total Orders',
                value: orders.total,
                icon: Factory,
                color: 'text-blue-600',
            },
            {
                title: 'In Progress',
                value: statusCounts['in_progress'] || 0,
                icon: Package,
                color: 'text-green-600',
            },
            {
                title: 'Released',
                value: statusCounts['released'] || 0,
                icon: Calendar,
                color: 'text-yellow-600',
            },
            {
                title: 'Draft',
                value: statusCounts['draft'] || 0,
                icon: AlertCircle,
                color: 'text-gray-600',
            },
        ];
    }, [orders]);
    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Manufacturing Orders', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Manufacturing Orders"
                description="Manage production orders and track their progress"
                searchPlaceholder="Search by order number or item..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                onCreateClick={() => setShowCreateDialog(true)}
                createButtonText="Create Order"
                actions={
                    <div className="flex gap-2">
                        <Select value={parentFilter || 'all'} onValueChange={handleParentFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Orders</SelectItem>
                                <SelectItem value="root">Parent Orders Only</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {Object.entries(statuses).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
            >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                {stat.title}
                                            </p>
                                            <p className="text-2xl font-bold mt-1">
                                                {stat.value}
                                            </p>
                                        </div>
                                        <Icon className={`h-8 w-8 ${stat.color} opacity-20`} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                {/* Data Table */}
                <div className="space-y-4">
                    <EntityDataTable
                        data={orders.data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={loading}
                        onRowClick={(order) => router.visit(route('production.orders.show', (order as Item).id))}
                        actions={(order) => (
                            <EntityActionDropdown
                                onEdit={
                                    ['draft', 'planned'].includes((order as ManufacturingOrder).status)
                                        ? () => router.visit(route('production.orders.edit', (order as Item).id))
                                        : undefined
                                }
                                onDelete={
                                    (order as ManufacturingOrder).status === 'draft'
                                        ? () => setDeleteOrder(order as unknown as ManufacturingOrder)
                                        : undefined
                                }
                                additionalActions={[
                                    {
                                        label: 'View',
                                        onClick: () => router.visit(route('production.orders.show', (order as Item).id))
                                    },
                                    ...(((order as ManufacturingOrder).status === 'draft' || (order as ManufacturingOrder).status === 'planned') && (order as ManufacturingOrder).manufacturing_route ? [{
                                        label: 'Release',
                                        onClick: () => router.post(route('production.orders.release', (order as Item).id))
                                    }] : [])
                                    // View Children action temporarily disabled - route not implemented yet
                                ]}
                            />
                        )}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: orders.current_page,
                            last_page: orders.last_page,
                            per_page: orders.per_page,
                            total: orders.total,
                            from: orders.from,
                            to: orders.to
                        }}
                        onPageChange={(page) => router.get(route('production.orders.index'), { ...filters, page })}
                        onPerPageChange={(perPage) => router.get(route('production.orders.index'), { ...filters, per_page: perPage })}
                    />
                </div>
            </ListLayout>
            {/* Create Order Dialog */}
            <CreateManufacturingOrderDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                items={items}
                billsOfMaterial={billsOfMaterial}
                routeTemplates={routeTemplates}
                sourceTypes={sourceTypes}
            />
            {/* Delete Dialog */}
            <EntityDeleteDialog
                open={!!deleteOrder}
                onOpenChange={(open) => !open && setDeleteOrder(null)}
                entityLabel={deleteOrder ? `order ${deleteOrder.order_number}` : ''}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
} 