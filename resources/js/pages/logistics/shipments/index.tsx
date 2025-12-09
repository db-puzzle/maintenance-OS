import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Shipment } from '@/types/logistics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { ShipmentStatusBadge } from '@/components/logistics/shipment-status-badge';
import { 
    Plus, 
    Package, 
    PackageSearch, 
    Truck, 
    PackageCheck, 
    AlertTriangle,
    Calendar,
    MapPin 
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DESTINATION_TYPES, SHIPMENT_STATUSES } from '@/constants/logistics';
import { ColumnConfig } from '@/types/shared';

/**
 * Props for shipments index page.
 */
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
    filters?: {
        status?: string;
        destination_type?: string;
        search?: string;
    };
    statusCounts?: Record<string, number>;
    summaryTotal?: number;
}

/**
 * Shipments Index Page
 *
 * Lists all shipments with filtering and stats overview.
 */
export default function ShipmentsIndex({ 
    shipments, 
    filters = {}, 
    statusCounts = {},
    summaryTotal = 0 
}: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [destinationType, setDestinationType] = useState(filters.destination_type || 'all');
    const [loading] = useState(false);
    const [clickedCard, setClickedCard] = useState<string | null>(null);

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Remessas', href: '' },
    ];

    // Update filter states when props change
    React.useEffect(() => {
        setStatusFilter(filters.status || 'all');
        setDestinationType(filters.destination_type || 'all');
        setSearchValue(filters.search || '');
    }, [filters]);

    /**
     * Handle search change with debounce.
     */
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(
            route('logistics.shipments.index'),
            {
                search: value,
                status: statusFilter === 'all' ? undefined : statusFilter,
                destination_type: destinationType === 'all' ? undefined : destinationType,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['shipments', 'statusCounts', 'summaryTotal'],
            }
        );
    };

    /**
     * Handle status filter change.
     */
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        router.get(
            route('logistics.shipments.index'),
            {
                search: searchValue,
                status: value === 'all' ? undefined : value,
                destination_type: destinationType === 'all' ? undefined : destinationType,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['shipments', 'statusCounts', 'summaryTotal'],
            }
        );
    };

    /**
     * Handle destination type filter change.
     */
    const handleDestinationTypeChange = (value: string) => {
        setDestinationType(value);
        router.get(
            route('logistics.shipments.index'),
            {
                search: searchValue,
                status: statusFilter === 'all' ? undefined : statusFilter,
                destination_type: value !== 'all' ? value : undefined,
            },
            {
            preserveState: true,
                preserveScroll: true,
                only: ['shipments', 'statusCounts', 'summaryTotal'],
            }
        );
    };

    /**
     * Handle stats card click.
     */
    const handleCardClick = (filterValue: string) => {
        setClickedCard(filterValue);
        setTimeout(() => setClickedCard(null), 400);
        handleStatusFilter(filterValue);
    };

    /**
     * Table columns configuration.
     */
    const columns: ColumnConfig<Shipment>[] = [
        {
            key: 'shipment_number',
            label: 'Número da Remessa',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown, shipment: Shipment) => (
                <div className="flex items-center gap-2">
                    <Link
                        href={route('logistics.shipments.show', shipment.id) as string}
                        className="font-medium text-primary hover:underline"
                    >
                        {value as React.ReactNode}
                    </Link>
                    {shipment.is_overdue && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                </div>
            ),
        },
        {
            key: 'destination',
            label: 'Destino',
            width: 'w-[250px]',
            render: (value: unknown, shipment: Shipment) => (
                <div>
                    <p className="font-medium">{shipment.destination_name || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                        {DESTINATION_TYPES[shipment.destination_type]}
                    </p>
                </div>
            ),
        },
        {
            key: 'total_items',
            label: 'Items',
            width: 'w-[100px]',
            render: (value: unknown) => (
                <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{value as React.ReactNode}</span>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            width: 'w-[120px]',
            render: (value: unknown, shipment: Shipment) => (
                <ShipmentStatusBadge status={shipment.status} />
            ),
        },
        {
            key: 'planned_ship_date',
            label: 'Data Planejada',
            width: 'w-[140px]',
            render: (value: unknown) => (
                <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {value ? new Date(value as string).toLocaleDateString('pt-BR') : '-'}
                </div>
            ),
        },
        {
            key: 'actual_ship_date',
            label: 'Data de Envio',
            width: 'w-[140px]',
            render: (value: unknown) => (
                <div className="text-sm">
                    {value ? new Date(value as string).toLocaleDateString('pt-BR') : '-'}
                </div>
            ),
        },
        {
            key: 'tracking_number',
            label: 'Rastreamento',
            width: 'w-[150px]',
            render: (value: unknown) => (
                <div className="flex items-center gap-2 text-sm">
                    {value ? (
                        <>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{value as React.ReactNode}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            ),
        },
    ];

    /**
     * Stats cards data.
     */
    const stats = React.useMemo(() => {
        return [
            {
                title: 'Total',
                value: summaryTotal,
                icon: Package,
                color: 'text-blue-600',
                statusFilter: 'all',
            },
            {
                title: 'Planejadas',
                value: statusCounts['planned'] || 0,
                icon: PackageSearch,
                color: 'text-gray-600',
                statusFilter: 'planned',
            },
            {
                title: 'Enviadas',
                value: statusCounts['shipped'] || 0,
                icon: Truck,
                color: 'text-purple-600',
                statusFilter: 'shipped',
            },
            {
                title: 'Em Trânsito',
                value: statusCounts['in_transit'] || 0,
                icon: Truck,
                color: 'text-yellow-600',
                statusFilter: 'in_transit',
            },
            {
                title: 'Recebidas',
                value: statusCounts['received'] || 0,
                icon: PackageCheck,
                color: 'text-green-600',
                statusFilter: 'received',
            },
        ];
    }, [statusCounts, summaryTotal]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remessas" />

            <ListLayout
                title="Remessas"
                description="Gerencie envios para fabricantes externos e clientes"
                searchPlaceholder="Buscar por número da remessa ou destino..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                onCreateClick={() => router.visit(route('logistics.shipments.create'))}
                createButtonText="Nova Remessa"
                actions={
                    <div className="flex gap-2">
                        <Select value={destinationType} onValueChange={handleDestinationTypeChange}>
                            <SelectTrigger className="w-[180px] h-8">
                                    <SelectValue placeholder="Tipo de destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Destinos</SelectItem>
                                    {Object.entries(DESTINATION_TYPES).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[150px] h-8">
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                {Object.entries(SHIPMENT_STATUSES).map(([value, config]) => (
                                    <SelectItem key={value} value={value}>
                                        {config.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            </div>
                }
            >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        const isClicked = clickedCard === stat.statusFilter;
                        return (
                            <Card
                                key={index}
                                variant="compact"
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 
                                    ${isClicked ? 'ring-2 ring-ring/10 border-ring bg-input-focus animate-flash' : ''}
                                    ${statusFilter === stat.statusFilter && stat.statusFilter !== 'all' ? 'border-ring' : ''}`}
                                onClick={() => handleCardClick(stat.statusFilter)}
                            >
                                <CardContent variant="compact" className="p-4">
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
                        data={shipments.data}
                        columns={columns}
                        loading={loading}
                        onRowClick={(shipment) => router.visit(route('logistics.shipments.show', shipment.id))}
                        actions={(shipment) => (
                            <EntityActionDropdown
                                additionalActions={[
                                    {
                                        label: 'Visualizar',
                                        onClick: () => router.visit(route('logistics.shipments.show', shipment.id))
                                    },
                                ]}
                            />
                        )}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: shipments.current_page,
                            last_page: shipments.last_page,
                            per_page: shipments.per_page,
                            total: shipments.total,
                            from: shipments.from,
                            to: shipments.to
                        }}
                        onPageChange={(page) =>
                            router.get(
                                route('logistics.shipments.index'),
                                {
                                    ...filters,
                                    page,
                                    status: statusFilter === 'all' ? undefined : statusFilter,
                                    destination_type: destinationType === 'all' ? undefined : destinationType,
                                    search: searchValue,
                                },
                                {
                                    preserveScroll: true,
                                    only: ['shipments', 'statusCounts', 'summaryTotal'],
                                }
                            )
                        }
                        onPerPageChange={(perPage) =>
                            router.get(
                                route('logistics.shipments.index'),
                                {
                                    ...filters,
                                    per_page: perPage,
                                    status: statusFilter === 'all' ? undefined : statusFilter,
                                    destination_type: destinationType === 'all' ? undefined : destinationType,
                                    search: searchValue,
                                },
                                {
                                    preserveScroll: true,
                                    only: ['shipments', 'statusCounts', 'summaryTotal'],
                                }
                            )
                        }
                    />
            </div>
            </ListLayout>
        </AppLayout>
    );
}
