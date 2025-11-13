import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/production/list-layout';
import { Shipment } from '@/types/logistics';
import { Button } from '@/components/ui/button';
import { ShipmentStatusBadge } from '@/components/logistics/shipment-status-badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { ColumnVisibility } from '@/components/data-table';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { Plus, Package, Download, Truck, AlertTriangle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Logística',
        href: '/logistics/shipments',
    },
    {
        title: 'Remessas',
        href: '/logistics/shipments',
    },
];

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
        destination_type?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        per_page?: number;
    };
    can?: {
        create?: boolean;
        view?: boolean;
        update?: boolean;
        delete?: boolean;
    };
}

/**
 * Shipments Index Page
 *
 * Displays all shipments with filtering, sorting, and pagination.
 * Main dashboard for the logistics module.
 */
export default function ShipmentsIndex({ shipments: initialShipments, filters, can }: Props) {
    const entityOps = useEntityOperations<Shipment>({
        entityName: 'shipment',
        entityLabel: 'Remessa',
        routes: {
            index: 'logistics.shipments.index',
            show: 'logistics.shipments.show',
            destroy: 'logistics.shipments.destroy',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'logistics.shipments.index',
        initialSort: filters.sort || 'created_at',
        initialDirection: filters.direction || 'desc',
        additionalParams: {
            search,
            per_page: filters.per_page || 20,
            ...(filters.status && { status: filters.status }),
            ...(filters.destination_type && { destination_type: filters.destination_type }),
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        shipment_number: true,
        destination: true,
        status: true,
        items: true,
        ship_date: true,
        tracking: true,
        actions: true,
    });

    // Use data from server
    const data = initialShipments.data;
    const pagination = {
        current_page: initialShipments.current_page,
        last_page: initialShipments.last_page,
        per_page: initialShipments.per_page,
        total: initialShipments.total,
        from: initialShipments.from,
        to: initialShipments.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'shipment_number',
            label: 'Número',
            sortable: true,
            width: 'w-[180px]',
            render: (value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div>
                        <div className="font-medium">{shipment.shipment_number}</div>
                        <div className="text-xs text-muted-foreground">
                            {new Date(shipment.created_at).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'destination',
            label: 'Destino',
            sortable: false,
            width: 'w-[200px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                const destName = shipment.destination_name ||
                    (shipment.destination && 'name' in shipment.destination
                        ? String(shipment.destination.name)
                        : '-');
                return (
                    <div>
                        <div className="font-medium">{destName}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {shipment.destination_type}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[140px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div className="flex items-center gap-2">
                        {shipment.is_overdue && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <ShipmentStatusBadge status={shipment.status} />
                    </div>
                );
            },
        },
        {
            key: 'items',
            label: 'Itens',
            sortable: false,
            width: 'w-[100px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{shipment.total_items}</span>
                    </div>
                );
            },
        },
        {
            key: 'ship_date',
            label: 'Data de Envio',
            sortable: true,
            width: 'w-[140px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div className="text-sm">
                        {shipment.actual_ship_date ? (
                            <div>
                                <div>{new Date(shipment.actual_ship_date).toLocaleDateString('pt-BR')}</div>
                                <div className="text-xs text-muted-foreground">Real</div>
                            </div>
                        ) : shipment.planned_ship_date ? (
                            <div>
                                <div>{new Date(shipment.planned_ship_date).toLocaleDateString('pt-BR')}</div>
                                <div className="text-xs text-muted-foreground">Planejada</div>
                            </div>
                        ) : (
                            '-'
                        )}
                    </div>
                );
            },
        },
        {
            key: 'tracking',
            label: 'Rastreamento',
            sortable: false,
            width: 'w-[180px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div className="text-sm">
                        {shipment.tracking_number ? (
                            <div>
                                <div className="font-medium">{shipment.tracking_number}</div>
                                {shipment.carrier_name && (
                                    <div className="text-xs text-muted-foreground">{shipment.carrier_name}</div>
                                )}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            width: 'w-[80px]',
            render: (_value, row) => {
                const shipment = row as unknown as Shipment;
                return (
                    <div className="flex justify-end">
                        <EntityActionDropdown
                            onDelete={
                                can?.delete !== false && shipment.status === 'planned'
                                    ? () => entityOps.handleDelete(shipment)
                                    : undefined
                            }
                            additionalActions={[
                                {
                                    label: 'Ver Detalhes',
                                    onClick: () => router.visit(route('logistics.shipments.show', shipment.id)),
                                },
                                ...(shipment.packing_list_path
                                    ? [
                                        {
                                            label: 'Baixar Lista',
                                            onClick: () =>
                                                window.open(
                                                    route('logistics.shipments.packing-list', shipment.id),
                                                    '_blank'
                                                ),
                                        },
                                    ]
                                    : []),
                            ]}
                        />
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remessas" />

            <ListLayout
                title="Remessas"
                description="Gerencie remessas de materiais para fabricantes externos, clientes e armazéns"
                searchValue={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    router.get(
                        route('logistics.shipments.index'),
                        {
                            search: value,
                            sort,
                            direction,
                            per_page: filters.per_page || 20,
                        },
                        { preserveState: true }
                    );
                }}
                onCreateClick={
                    can?.create !== false
                        ? () => router.visit(route('logistics.shipments.create'))
                        : undefined
                }
                createButtonText="Nova Remessa"
                actions={
                    <ColumnVisibility
                        columns={columns.map((col) => ({
                            id: col.key,
                            header: col.label,
                            cell: () => null,
                            width: 'w-auto',
                        }))}
                        columnVisibility={columnVisibility}
                        onColumnVisibilityChange={(columnId: string, value: boolean) => {
                            const newVisibility = { ...columnVisibility, [columnId]: value };
                            setColumnVisibility(newVisibility);
                            if (typeof window !== 'undefined') {
                                localStorage.setItem(
                                    'shipmentsColumnsVisibility',
                                    JSON.stringify(newVisibility)
                                );
                            }
                        }}
                    />
                }
            >
                <EntityDataTable
                    columns={columns}
                    data={data}
                    onSort={handleSort}
                    columnVisibility={columnVisibility}
                    emptyMessage={
                        search
                            ? 'Nenhuma remessa encontrada. Tente ajustar sua busca.'
                            : 'Nenhuma remessa cadastrada. Crie sua primeira remessa para começar.'
                    }
                />

                <EntityPagination
                    pagination={pagination}
                    onPageChange={(page) => {
                        router.get(
                            route('logistics.shipments.index'),
                            {
                                search,
                                sort,
                                direction,
                                per_page: filters.per_page || 20,
                                page,
                            },
                            { preserveState: true }
                        );
                    }}
                />
            </ListLayout>
        </AppLayout>
    );
}
