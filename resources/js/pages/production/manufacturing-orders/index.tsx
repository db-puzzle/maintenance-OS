import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    Factory,
    Package,
    GitBranch,
    Calendar,
    DraftingCompass,
    Workflow,
    ClipboardList
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import CreateManufacturingOrderDialog from '@/components/production/CreateManufacturingOrderDialog';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { ImageDisplayToggleButton } from '@/components/ImageDisplayToggleButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    statusCounts?: Record<string, number>;
    summaryTotal?: number;
}
export default function ManufacturingOrders({
    orders,
    statuses,
    filters,
    items = [],
    billsOfMaterial = [],
    routeTemplates = [],
    sourceTypes = {},
    statusCounts = {},
    summaryTotal = 0
}: Props) {
    const page = usePage();
    const { url } = page;

    // Check if 'create' parameter is in URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const shouldOpenCreate = urlParams.get('create') === '1';

    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [parentFilter, setParentFilter] = useState(filters.parent_id || 'root');
    const [loading] = useState(false);
    const [deleteOrder, setDeleteOrder] = useState<ManufacturingOrder | null>(null);
    const [cancelOrder, setCancelOrder] = useState<ManufacturingOrder | null>(null);
    const [cancelConfirmation, setCancelConfirmation] = useState('');
    const [holdOrder, setHoldOrder] = useState<ManufacturingOrder | null>(null);
    const [holdReason, setHoldReason] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(shouldOpenCreate);
    const [showImages, setShowImages] = useState(false);
    const [clickedCard, setClickedCard] = useState<string | null>(null);

    // Update filter states when props change
    React.useEffect(() => {
        setStatusFilter(filters.status || '');
        setParentFilter(filters.parent_id || 'root');
        setSearchValue(filters.search || '');
    }, [filters]);

    // Apply default parent filter on mount if not already set
    React.useEffect(() => {
        if (!filters.parent_id) {
            router.get(route('production.orders.index'), {
                search: searchValue,
                status: statusFilter === 'all' ? undefined : statusFilter,
                parent_id: 'root'
            }, {
                preserveState: true,
                preserveScroll: true,
                only: ['orders', 'statusCounts', 'summaryTotal'],
                replace: true
            });
        }
    }, [filters.parent_id, searchValue, statusFilter]);

    // Clean up URL parameter when dialog is closed
    React.useEffect(() => {
        if (!showCreateDialog && shouldOpenCreate) {
            // Remove 'create' parameter from URL
            const newUrlParams = new URLSearchParams(window.location.search);
            newUrlParams.delete('create');
            const newUrl = newUrlParams.toString()
                ? `${window.location.pathname}?${newUrlParams.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [showCreateDialog, shouldOpenCreate]);
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.orders.index'), {
            search: value,
            status: statusFilter === 'all' ? undefined : statusFilter,
            parent_id: parentFilter === 'all' ? undefined : parentFilter
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders', 'statusCounts', 'summaryTotal']
        });
    };
    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
        router.get(route('production.orders.index'), {
            search: searchValue,
            status: value === 'all' ? undefined : value,
            parent_id: parentFilter === 'all' ? undefined : parentFilter
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders', 'statusCounts', 'summaryTotal']
        });
    };
    const handleParentFilter = (value: string) => {
        setParentFilter(value);
        router.get(route('production.orders.index'), {
            search: searchValue,
            status: statusFilter === 'all' ? undefined : statusFilter,
            parent_id: value === 'all' ? undefined : value
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders', 'statusCounts', 'summaryTotal']
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

    const handleCancel = async () => {
        if (!cancelOrder) return;
        try {
            await router.post(route('production.orders.cancel', cancelOrder.id), {
                reason: 'Cancelled by user'
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelOrder(null);
                    setCancelConfirmation('');
                },
                onError: () => {
                    console.error('Failed to cancel order');
                }
            });
        } catch (error) {
            console.error('Cancel error:', error);
        }
    };

    const handleHold = async () => {
        if (!holdOrder) return;
        try {
            await router.post(route('production.orders.hold', holdOrder.id), {
                reason: holdReason || undefined
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setHoldOrder(null);
                    setHoldReason('');
                },
                onError: () => {
                    console.error('Failed to hold order');
                }
            });
        } catch (error) {
            console.error('Hold error:', error);
        }
    };

    const handleCardClick = (filterValue: string) => {
        // Set the clicked card to trigger animation
        setClickedCard(filterValue);

        // Remove the animation class after animation completes
        setTimeout(() => {
            setClickedCard(null);
        }, 400);

        // Update the status filter
        handleStatusFilter(filterValue);
    };
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'draft':
                return 'secondary';
            case 'planned':
            case 'scheduled':
                return 'outline';
            case 'released':
            case 'in_progress':
            case 'completed':
                return 'default';
            case 'on_hold':
                return 'secondary';
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
    const columns: ColumnConfig<ManufacturingOrder>[] = [
        ...(showImages ? [{
            key: 'image',
            label: 'Image',
            width: 'w-[70px]',
            render: (value: unknown, order: ManufacturingOrder) => {
                const mo = order;
                return (
                    <ItemImagePreview
                        primaryImageUrl={mo.item?.primary_image_thumbnail_url || mo.item?.primary_image_url}
                        imageCount={mo.item?.media?.length || 0}
                        className="w-12 h-12 cursor-pointer"
                        onClick={(e) => {
                            e?.stopPropagation();
                            if (mo.item?.id) {
                                router.visit(route('production.items.show', mo.item.id));
                            }
                        }}
                    />
                );
            },
        }] : []),
        {
            key: 'order_number',
            label: 'Order Number',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown, order: ManufacturingOrder) => (
                <div className="flex items-center gap-2">
                    <Link
                        href={route('production.orders.show', order.id) as string}
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
            render: (value: unknown, order: ManufacturingOrder) => {
                const mo = order;
                return (
                    <div>
                        <p className="font-medium">{mo.item?.item_number || '-'}</p>
                        <p className="text-sm text-muted-foreground">{mo.item?.name || '-'}</p>
                    </div>
                );
            },
        },
        {
            key: 'quantity',
            label: 'Quantity',
            width: 'w-[120px]',
            render: (value: unknown, order: ManufacturingOrder) => (
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
            key: 'completed',
            label: 'Completed',
            width: 'w-[120px]',
            render: (value: unknown, order: ManufacturingOrder) => (
                <div className="text-sm">
                    <span className="font-medium">
                        {order.quantity_completed as React.ReactNode}
                    </span>
                    <span className="text-muted-foreground">
                        {' / '}{order.quantity as React.ReactNode} {order.unit_of_measure as React.ReactNode}
                    </span>
                </div>
            ),
        },
        {
            key: 'progress',
            label: 'Progress',
            width: 'w-[140px]',
            render: (value: unknown, order: ManufacturingOrder) => {
                const smartProgress = order.smart_progress_percentage ?? 0;
                const simpleProgress = (order.quantity as number) > 0
                    ? Math.round(((order.quantity_completed as number) / (order.quantity as number)) * 100)
                    : 0;

                const hasChildren = (order.child_orders_count as number) > 0;
                const hasRoute = order.has_route || order.manufacturing_route;
                const showSmartProgress = hasChildren || hasRoute;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{Math.round(smartProgress)}%</span>
                            {showSmartProgress && smartProgress !== simpleProgress && (
                                <span className="text-xs text-muted-foreground">
                                    ({simpleProgress}% output)
                                </span>
                            )}
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${smartProgress}%` }}
                            />
                        </div>
                        {order.progress_calculated_at && (
                            <div className="text-xs text-muted-foreground">
                                Updated {new Date(order.progress_calculated_at).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                );
            },
        },
    ];
    const stats = React.useMemo(() => {
        // Use statusCounts from backend which are based only on search filter
        return [
            {
                title: 'Total Searched',
                value: summaryTotal,
                icon: Factory,
                color: 'text-blue-600',
                statusFilter: 'all',
            },
            {
                title: 'Draft',
                value: statusCounts['draft'] || 0,
                icon: DraftingCompass,
                color: 'text-gray-600',
                statusFilter: 'draft',
            },
            {
                title: 'Planned',
                value: statusCounts['planned'] || 0,
                icon: ClipboardList,
                color: 'text-purple-600',
                statusFilter: 'planned',
            },
            {
                title: 'Released',
                value: statusCounts['released'] || 0,
                icon: Calendar,
                color: 'text-yellow-600',
                statusFilter: 'released',
            },
            {
                title: 'In Progress',
                value: statusCounts['in_progress'] || 0,
                icon: Package,
                color: 'text-green-600',
                statusFilter: 'in_progress',
            },
        ];
    }, [statusCounts, summaryTotal]);
    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Ordens de Manufatura', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Ordens de Manufatura"
                description="Gerencie ordens de produção e acompanhe o progresso"
                searchPlaceholder="Buscar por número da ordem ou item..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                onCreateClick={() => setShowCreateDialog(true)}
                createButtonText="Criar Ordem"
                actions={
                    <div className="flex gap-2">
                        <ImageDisplayToggleButton
                            showImages={showImages}
                            onToggle={setShowImages}
                        />
                        <Toggle
                            variant="outline"
                            size="sm"
                            pressed={parentFilter === 'root'}
                            onPressedChange={(pressed) => handleParentFilter(pressed ? 'root' : 'all')}
                            className="w-[150px] flex items-center justify-between data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90"
                            aria-label="Toggle parent filter"
                        >
                            <GitBranch className="ml-1 h-4 w-4" />
                            <span className="flex-1 ml-1 text-left">{parentFilter === 'root' ? 'Somente Raiz' : 'Todas as MOs'}</span>
                        </Toggle>
                        <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[150px] h-8">
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
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
                        data={orders.data}
                        columns={columns}
                        loading={loading}
                        onRowClick={(order) => router.visit(route('production.orders.show', order.id))}
                        actions={(order) => (
                            <EntityActionDropdown
                                onDelete={
                                    order.status === 'draft'
                                        ? () => setDeleteOrder(order)
                                        : undefined
                                }
                                additionalActions={[
                                    {
                                        label: 'Visualizar',
                                        onClick: () => router.visit(route('production.orders.show', order.id))
                                    },
                                    // Plan action - for draft or planned orders
                                    ...(order.status === 'draft' || order.status === 'planned' ? [{
                                        label: 'Planejar',
                                        onClick: () => router.visit(route('production.planning.index', { selectedMO: order.id }))
                                    }] : []),
                                    // Schedule action - for planned orders
                                    ...(order.status === 'planned' ? [{
                                        label: 'Agendar',
                                        onClick: () => router.post(route('production.orders.schedule', order.id))
                                    }] : []),
                                    // Hold - for in progress orders
                                    ...(order.status === 'in_progress' ? [{
                                        label: 'Pausar',
                                        onClick: () => setHoldOrder(order)
                                    }] : []),
                                    // Resume - for on hold orders
                                    ...(order.status === 'on_hold' ? [{
                                        label: 'Retomar',
                                        onClick: () => router.post(route('production.orders.resume', order.id))
                                    }] : []),
                                    // Cancel - for non-draft, non-completed, non-cancelled orders
                                    ...(!['draft', 'completed', 'cancelled'].includes(order.status) ? [{
                                        label: 'Cancelar',
                                        onClick: () => setCancelOrder(order)
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
                        onPageChange={(page) => router.get(route('production.orders.index'), {
                            ...filters,
                            page,
                            status: statusFilter === 'all' ? undefined : statusFilter,
                            parent_id: parentFilter === 'all' ? undefined : parentFilter,
                            search: searchValue
                        }, {
                            preserveScroll: true,
                            only: ['orders', 'statusCounts', 'summaryTotal']
                        })}
                        onPerPageChange={(perPage) => router.get(route('production.orders.index'), {
                            ...filters,
                            per_page: perPage,
                            status: statusFilter === 'all' ? undefined : statusFilter,
                            parent_id: parentFilter === 'all' ? undefined : parentFilter,
                            search: searchValue
                        }, {
                            preserveScroll: true,
                            only: ['orders', 'statusCounts', 'summaryTotal']
                        })}
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
                entityLabel={deleteOrder ? `ordem ${deleteOrder.order_number}` : ''}
                onConfirm={handleDelete}
                confirmationValue={deleteOrder?.order_number || ''}
                confirmationLabel={deleteOrder ? `Digite o número da ordem (${deleteOrder.order_number}) para confirmar` : ''}
            />

            {/* Cancel Order Dialog */}
            <Dialog open={!!cancelOrder} onOpenChange={(open) => {
                if (!open) {
                    setCancelOrder(null);
                    setCancelConfirmation('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Ordem de Manufatura</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja cancelar a ordem {cancelOrder?.order_number}? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cancel-confirmation">
                                Digite o número da ordem ({cancelOrder?.order_number}) para confirmar
                            </Label>
                            <Input
                                id="cancel-confirmation"
                                value={cancelConfirmation}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelConfirmation(e.target.value)}
                                placeholder={`Digite ${cancelOrder?.order_number}`}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCancelOrder(null);
                                setCancelConfirmation('');
                            }}
                        >
                            Não, Manter Ordem
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={cancelConfirmation !== cancelOrder?.order_number}
                        >
                            Sim, Cancelar Ordem
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hold Order Dialog */}
            <Dialog open={!!holdOrder} onOpenChange={(open) => {
                if (!open) {
                    setHoldOrder(null);
                    setHoldReason('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pausar Ordem de Manufatura</DialogTitle>
                        <DialogDescription>
                            Colocar a ordem {holdOrder?.order_number} em pausa. Você pode opcionalmente fornecer um motivo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="hold-reason">Motivo (opcional)</Label>
                            <Input
                                id="hold-reason"
                                value={holdReason}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoldReason(e.target.value)}
                                placeholder="Digite o motivo da pausa..."
                                className="w-full"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setHoldOrder(null);
                                setHoldReason('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleHold}
                        >
                            Pausar Ordem
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 