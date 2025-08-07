import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import { Plus, Package, Truck, CheckCircle, XCircle, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ColumnConfig } from '@/types/shared';
interface Shipment {
    id: string;
    shipment_number: string;
    destination: string;
    customer_name: string;
    scheduled_date: string;
    shipped_date: string | null;
    delivered_date: string | null;
    status: 'draft' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
    shipment_type: 'customer' | 'internal' | 'vendor' | 'other';
    tracking_number: string | null;
    carrier: string | null;
    items_count: number;
    photos_count: number;
    created_by: {
        id: string;
        name: string;
    };
    created_at: string;
    updated_at: string;
}
interface Props {
    shipments: {
        data: Shipment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search?: string;
        status?: string;
        shipment_type?: string;
        date_from?: string;
        date_to?: string;
        per_page?: number;
    };
    statuses: Record<string, string>;
    shipmentTypes: Record<string, string>;
    can: {
        create: boolean;
    };
}
const statusConfig = {
    draft: { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    ready: { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    in_transit: { icon: Truck, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    delivered: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};
export default function ShipmentsIndex({ shipments, filters, statuses, shipmentTypes, can }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [deleteShipment, setDeleteShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(false);
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.shipments.index'), { ...filters, search: value }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handleFilter = (key: string, value: string | null) => {
        const newFilters: Record<string, any> = { ...filters };
        if (value) {
            newFilters[key] = value;
        } else {
            delete newFilters[key];
        }
        router.get(route('production.shipments.index'), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handlePageChange = (page: number) => {
        router.get(route('production.shipments.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(route('production.shipments.index'), { ...filters, per_page: perPage }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const handleDelete = async () => {
        if (!deleteShipment) return;
        router.delete(route('production.shipments.destroy', deleteShipment.id), {
            onSuccess: () => {
                setDeleteShipment(null);
            },
        });
    };
    const columns: ColumnConfig[] = [
        {
            key: 'shipment_number',
            label: 'Shipment #',
            sortable: true,
            render: (value: unknown, shipment: Record<string, unknown>) => (
                <Link
                    href={route('production.shipments.show', shipment.id)}
                    className="font-medium text-blue-600 hover:underline"
                >
                    {value}
                </Link>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (value: unknown) => {
                const config = statusConfig[value as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                    <Badge variant="secondary" className={cn(config.bgColor, config.color)}>
                        <Icon className="mr-1 h-3 w-3" />
                        {statuses[value]}
                    </Badge>
                );
            },
        },
        {
            key: 'shipment_type',
            label: 'Type',
            sortable: true,
            render: (value: unknown) => shipmentTypes[value] || value,
        },
        {
            key: 'customer_name',
            label: 'Customer',
            sortable: true,
        },
        {
            key: 'destination',
            label: 'Destination',
            sortable: true,
        },
        {
            key: 'scheduled_date',
            label: 'Scheduled Date',
            sortable: true,
            render: (value: unknown) => format(new Date(value), 'MMM dd, yyyy'),
        },
        {
            key: 'items_count',
            label: 'Items',
            render: (value: unknown) => (
                <span className="text-sm text-muted-foreground">{value} items</span>
            ),
        },
        {
            key: 'tracking_number',
            label: 'Tracking',
            render: (value: unknown) => value || '-',
        },
    ];
    const breadcrumbs = [
        { title: 'Production', href: '/' },
        { title: 'Shipments', href: '' }
    ];
    const pagination = {
        current_page: shipments.current_page,
        last_page: shipments.last_page,
        per_page: shipments.per_page,
        total: shipments.total,
        from: shipments.from,
        to: shipments.to,
    };
    const data = shipments.data;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Shipments" />
            <ListLayout
                title="Shipments"
                description="Manage product shipments and deliveries"
                searchPlaceholder="Search shipments..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={can.create ? route('production.shipments.create') : undefined}
                createButtonText="New Shipment"
                actions={
                    <div className="flex gap-2">
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value) => handleFilter('status', value === 'all' ? null : value)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Statuses" />
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
                        <Select
                            value={filters.shipment_type || 'all'}
                            onValueChange={(value) => handleFilter('shipment_type', value === 'all' ? null : value)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {Object.entries(shipmentTypes).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={filters.date_from || ''}
                            onChange={(e) => handleFilter('date_from', e.target.value || null)}
                            placeholder="From date"
                            className="w-[180px]"
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={loading}
                        onRowClick={(shipment) => router.visit(route('production.shipments.show', (shipment as any).id))}
                        actions={(shipment) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(route('production.shipments.edit', (shipment as any).id))}
                                onDelete={() => setDeleteShipment(shipment as any)}
                                additionalActions={[
                                    {
                                        label: 'View Details',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => router.visit(route('production.shipments.show', (shipment as any).id))
                                    }
                                ]}
                            />
                        )}
                    />
                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>
            <EntityDeleteDialog
                open={!!deleteShipment}
                onOpenChange={(open) => !open && setDeleteShipment(null)}
                entityLabel={deleteShipment ? `shipment ${deleteShipment.shipment_number}` : ''}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
} 