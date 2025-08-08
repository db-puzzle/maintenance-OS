import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { ColumnVisibility } from '@/components/data-table';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';

import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { WorkOrder, WorkOrderStatus, Asset, Instrument, WorkOrderCategory } from '@/types/work-order';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Ordens de Serviço',
        href: '/maintenance/work-orders',
    },
];
interface Props {
    workOrders: {
        data: WorkOrder[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
        status?: string;
    };
    canCreate: boolean;
    discipline: 'maintenance' | 'quality';
}
// Status labels mapping
const statusLabels: Record<string, string> = {
    'All': 'Todos',
    'open': 'Todas Abertas',
    'requested': 'Solicitado',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado',
    'planned': 'Planejado',
    'scheduled': 'Agendado',
    'in_progress': 'Em Execução',
    'on_hold': 'Em Espera',
    'completed': 'Concluído',
    'verified': 'Verificado',
    'closed': 'Fechado',
    'cancelled': 'Cancelado',
};
export default function WorkOrderIndex({ workOrders: initialWorkOrders, filters, canCreate, discipline = 'maintenance' }: Props) {
    const entityOps = useEntityOperations<WorkOrder>({
        entityName: 'work-order',
        entityLabel: 'Ordem de Serviço',
        routes: {
            index: `${discipline}.work-orders.index`,
            show: `${discipline}.work-orders.show`,
            destroy: `${discipline}.work-orders.destroy`,
            checkDependencies: `${discipline}.work-orders.check-dependencies`,
        },
    });
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'open');
    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: `${discipline}.work-orders.index`,
        initialSort: filters.sort || 'work_order_number',
        initialDirection: filters.direction || 'desc',
        additionalParams: {
            search,
            per_page: filters.per_page,
            ...(statusFilter !== 'open' && { status: statusFilter }),
        },
    });
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('workOrdersColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            work_order_number: true,
            title: true,
            asset: discipline === 'maintenance',
            instrument: discipline === 'quality',
            work_order_category: true,
            type: true,
            priority_score: true,
            status: true,
            scheduled_start_date: true,
        };
    });
    // Use data from server
    const data = initialWorkOrders.data;
    const pagination = {
        current_page: initialWorkOrders.current_page,
        last_page: initialWorkOrders.last_page,
        per_page: initialWorkOrders.per_page,
        total: initialWorkOrders.total,
        from: initialWorkOrders.from,
        to: initialWorkOrders.to,
    };
    const columns: ColumnConfig[] = [
        {
            key: 'work_order_number',
            label: 'Número',
            sortable: true,
            width: 'w-[120px]',
            render: (value) => `#${value}`,
        },
        {
            key: 'title',
            label: 'Título',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const title = (row as unknown as WorkOrder).title || '';
                const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
                return (
                    <div className="font-medium" title={title}>
                        {truncatedTitle}
                    </div>
                );
            },
        },
        ...(discipline === 'maintenance' ? [{
            key: 'asset',
            label: 'Ativo',
            render: (_: unknown, row: Record<string, unknown>) => ((row.asset as Asset)?.tag || '-') as React.ReactNode,
        }] : [{
            key: 'instrument',
            label: 'Instrumento',
            render: (_: unknown, row: Record<string, unknown>) => ((row.instrument as Instrument)?.tag || '-') as React.ReactNode,
        }]),
        {
            key: 'work_order_category',
            label: 'Categoria',
            headerAlign: 'center',
            render: (_: unknown, row: Record<string, unknown>) => {
                // Use the category relationship if available
                if (row.work_order_category_obj) {
                    return (
                        <div className="flex justify-center">
                            <Badge
                                variant="secondary"
                                style={{ backgroundColor: (row.work_order_category_obj as WorkOrderCategory).color + '20', borderColor: (row.work_order_category_obj as WorkOrderCategory).color }}
                            >
                                {(row.work_order_category_obj as WorkOrderCategory).name}
                            </Badge>
                        </div>
                    );
                }
                // Handle category as object or string
                let categoryCode = row.work_order_category;
                if (typeof categoryCode === 'object' && categoryCode !== null) {
                    const categoryObj = categoryCode as { code?: string; name?: string };
                    categoryCode = categoryObj.code || categoryObj.name || '';
                }
                // Fallback to category code
                const categoryLabels: Record<string, string> = {
                    preventive: 'Preventiva',
                    corrective: 'Corretiva',
                    inspection: 'Inspeção',
                    project: 'Projeto',
                    calibration: 'Calibração',
                    quality_control: 'Controle Qualidade',
                    quality_audit: 'Auditoria',
                    non_conformance: 'Não Conformidade',
                };
                return <div className="text-center">{categoryLabels[categoryCode as string] || String(categoryCode) || '-'}</div>;
            },
        },
        {
            key: 'type',
            label: 'Tipo',
            headerAlign: 'center',
            render: (_: unknown, row: Record<string, unknown>) => {
                const type = row.type as { name?: string } | undefined;
                return <div className="text-center">{type?.name || '-'}</div>;
            },
        },
        {
            key: 'priority_score',
            label: 'Prioridade',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="text-center">
                    {(value || 50) as React.ReactNode}
                </div>
            ),
            width: 'w-[80px]',
        },
        {
            key: 'status',
            label: 'Status',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="flex justify-center">
                    <WorkOrderStatusBadge status={value as WorkOrderStatus} />
                </div>
            ),
            width: 'w-[150px]',
        },
        {
            key: 'scheduled_start_date',
            label: 'Data Programada',
            headerAlign: 'center',
            render: (value: unknown) => <div className="text-center">{value ? format(new Date(value as string), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</div>,
            sortable: true,
            width: 'w-[130px]',
        },
    ];
    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('workOrdersColumnsVisibility', JSON.stringify(newVisibility));
    };
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route(`${discipline}.work-orders.index`),
            { search: value, sort, direction, per_page: filters.per_page, ...(statusFilter !== 'open' && { status: statusFilter }) },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handleStatusFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        router.get(
            route(`${discipline}.work-orders.index`),
            {
                search,
                sort,
                direction,
                per_page: filters.per_page,
                ...(newStatus !== 'open' && { status: newStatus })
            },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(
            route(`${discipline}.work-orders.index`),
            { ...filters, search, sort, direction, page, ...(statusFilter !== 'open' && { status: statusFilter }) },
            { preserveState: true, preserveScroll: true }
        );
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route(`${discipline}.work-orders.index`),
            { ...filters, search, sort, direction, per_page: perPage, page: 1, ...(statusFilter !== 'open' && { status: statusFilter }) },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handleCreateClick = () => {
        router.visit(route(`${discipline}.work-orders.show`, { workOrder: 'new' }));
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={discipline === 'maintenance' ? 'Ordens de Manutenção' : 'Ordens de Qualidade'} />
            <ListLayout
                title={discipline === 'maintenance' ? 'Ordens de Manutenção' : 'Ordens de Qualidade'}
                description={discipline === 'maintenance'
                    ? 'Gerencie todas as ordens de serviço de manutenção'
                    : 'Gerencie todas as ordens de serviço de qualidade'}
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={canCreate ? handleCreateClick : undefined}
                createButtonText="Nova Ordem"
                actions={
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Status: {statusLabels[statusFilter] || statusFilter}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleStatusFilterChange}>
                                    <DropdownMenuRadioItem value="open">Todas Abertas</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="All">Todos</DropdownMenuRadioItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioItem value="requested">Solicitado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="approved">Aprovado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="rejected">Rejeitado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="planned">Planejado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="scheduled">Agendado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="in_progress">Em Execução</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="on_hold">Em Espera</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="completed">Concluído</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="verified">Verificado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="closed">Fechado</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ColumnVisibility
                            columns={columns.map((col) => ({
                                id: col.key,
                                header: col.label,
                                cell: () => null,
                                width: 'w-auto',
                            }))}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data}
                        columns={columns}
                        loading={false}
                        onRowClick={(workOrder) => router.visit(route(`${discipline}.work-orders.show`, { id: (workOrder as WorkOrder).id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                    />
                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>
            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={`Ordem #${entityOps.deletingItem?.work_order_number || ''}`}
                onConfirm={entityOps.confirmDelete}
            />
            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="ordem de serviço"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
} 