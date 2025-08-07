import { type BreadcrumbItem } from '@/types';
import { type WorkCell, type ManufacturingStep, type ProductionSchedule } from '@/types/production';
import { Head, Link, router } from '@inertiajs/react';
import { Factory, Clock, Calendar, Gauge } from 'lucide-react';

import WorkCellFormComponent from '@/components/production/WorkCellFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';

interface Props {
    workCell: WorkCell & {
        plant?: { id: number; name: string };
        area?: { id: number; name: string };
        sector?: { id: number; name: string };
        shift?: { id: number; name: string };
        manufacturer?: { id: number; name: string };
    };
    plants: { id: number; name: string }[];
    areas: { id: number; name: string }[];
    sectors: { id: number; name: string }[];
    shifts: { id: number; name: string }[];
    manufacturers: { id: number; name: string }[];
    routingSteps: {
        data: ManufacturingStep[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    productionSchedules: {
        data: ProductionSchedule[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    utilization: number;
    activeTab: string;
    filters: {
        steps: {
            sort: string;
            direction: string;
        };
        schedules: {
            sort: string;
            direction: string;
        };
    };
}

export default function Show({
    workCell,
    plants,
    areas,
    sectors,
    shifts,
    manufacturers,
    routingSteps,
    productionSchedules,
    utilization,
    activeTab,
    filters
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Produção',
            href: '#',
        },
        {
            title: 'Células de Trabalho',
            href: '/production/work-cells',
        },
        {
            title: workCell.name,
            href: '#',
        },
    ];

    const handleSort = (section: 'steps' | 'schedules', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('production.work-cells.show', {
                work_cell: workCell.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1,
            }),
            {},
            { preserveState: true },
        );
    };

    // Verificações de segurança para evitar erros de undefined
    if (!workCell) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <ShowLayout title="Carregando..." editRoute="" tabs={[]}>
                    <div>Carregando informações da célula de trabalho...</div>
                </ShowLayout>
            </AppLayout>
        );
    }

    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Factory className="h-4 w-4" />
                <span>{workCell.cell_type === 'internal' ? 'Interna' : 'Externa'}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{workCell.available_hours_per_day}h/dia</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                <span>{workCell.efficiency_percentage}% eficiência</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{utilization}% utilização</span>
            </span>
        </span>
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <WorkCellFormComponent
                        workCell={workCell}
                        plants={plants}
                        areas={areas}
                        sectors={sectors}
                        shifts={shifts}
                        manufacturers={manufacturers}
                        initialMode="view"
                        onSuccess={() => router.reload()}
                    />
                </div>
            ),
        },
        {
            id: 'etapas',
            label: 'Etapas de Roteiro',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={routingSteps.data.map(step => ({ ...step } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'step_number',
                                label: 'Etapa',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <span className="font-medium">#{value as number}</span>,
                            },
                            {
                                key: 'name',
                                label: 'Nome',
                                sortable: true,
                                width: 'w-[300px]',
                                render: (value) => <span className="font-medium">{value as string}</span>,
                            },
                            {
                                key: 'description',
                                label: 'Descrição',
                                sortable: true,
                                width: 'w-[250px]',
                                render: (value) => <span className="text-sm">{value as string || '-'}</span>,
                            },
                            {
                                key: 'cycle_time_minutes',
                                label: 'Tempo de Ciclo',
                                sortable: true,
                                width: 'w-[150px]',
                                render: (value) => <span className="text-sm">{value as number} min</span>,
                            },
                            {
                                key: 'setup_time_minutes',
                                label: 'Tempo de Setup',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <span className="text-sm">{value as number || 0} min</span>,
                            },
                        ]}
                        onSort={(columnKey) => handleSort('steps', columnKey)}
                    />

                    <EntityPagination
                        pagination={{
                            current_page: routingSteps.current_page,
                            last_page: routingSteps.last_page,
                            per_page: routingSteps.per_page,
                            total: routingSteps.total,
                            from: routingSteps.current_page > 0 ? (routingSteps.current_page - 1) * routingSteps.per_page + 1 : null,
                            to: routingSteps.current_page > 0 ? Math.min(routingSteps.current_page * routingSteps.per_page, routingSteps.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('production.work-cells.show', {
                            work_cell: workCell.id,
                            steps_page: page,
                            tab: 'etapas',
                            steps_sort: filters.steps.sort,
                            steps_direction: filters.steps.direction,
                        }))}
                    />
                </div>
            ),
        },
        {
            id: 'agendamentos',
            label: 'Agendamentos',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={productionSchedules.data.map(schedule => ({ ...schedule } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'order',
                                label: 'Ordem de Produção',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value, row) => {
                                    const schedule = row as any;
                                    if (schedule.manufacturing_order) {
                                        return (
                                            <Link
                                                href={route('production.manufacturing-orders.show', schedule.manufacturing_order.id)}
                                                className="hover:text-primary font-medium"
                                            >
                                                {schedule.manufacturing_order.order_number}
                                            </Link>
                                        );
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'manufacturing_step',
                                label: 'Etapa',
                                sortable: false,
                                width: 'w-[250px]',
                                render: (value, row) => {
                                    const schedule = row as any;
                                    if (schedule.manufacturing_step) {
                                        return (
                                            <div>
                                                <div>Etapa #{schedule.manufacturing_step.step_number}</div>
                                                <div className="text-muted-foreground text-sm">
                                                    {schedule.manufacturing_step?.operation_description || ''}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'scheduled_start',
                                label: 'Início Agendado',
                                sortable: true,
                                width: 'w-[180px]',
                                render: (value) => {
                                    if (value) {
                                        const date = new Date(value as string);
                                        return date.toLocaleString('pt-BR');
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'scheduled_end',
                                label: 'Fim Agendado',
                                sortable: true,
                                width: 'w-[180px]',
                                render: (value) => {
                                    if (value) {
                                        const date = new Date(value as string);
                                        return date.toLocaleString('pt-BR');
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'status',
                                label: 'Status',
                                sortable: true,
                                width: 'w-[120px]',
                                render: (value) => {
                                    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                                        'scheduled': { label: 'Agendado', variant: 'outline' },
                                        'ready': { label: 'Pronto', variant: 'secondary' },
                                        'in_progress': { label: 'Em Andamento', variant: 'default' },
                                        'completed': { label: 'Concluído', variant: 'default' },
                                        'cancelled': { label: 'Cancelado', variant: 'destructive' },
                                    };
                                    const status = statusMap[value as string] || { label: value as string, variant: 'outline' as const };
                                    return <Badge variant={status.variant}>{status.label}</Badge>;
                                },
                            },
                        ]}
                        onSort={(columnKey) => handleSort('schedules', columnKey)}
                    />

                    <EntityPagination
                        pagination={{
                            current_page: productionSchedules.current_page,
                            last_page: productionSchedules.last_page,
                            per_page: productionSchedules.per_page,
                            total: productionSchedules.total,
                            from: productionSchedules.current_page > 0 ? (productionSchedules.current_page - 1) * productionSchedules.per_page + 1 : null,
                            to: productionSchedules.current_page > 0 ? Math.min(productionSchedules.current_page * productionSchedules.per_page, productionSchedules.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('production.work-cells.show', {
                            work_cell: workCell.id,
                            schedules_page: page,
                            tab: 'agendamentos',
                            schedules_sort: filters.schedules.sort,
                            schedules_direction: filters.schedules.direction,
                        }))}
                    />
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Célula de Trabalho ${workCell.name}`} />
            <ShowLayout
                title={workCell.name}
                subtitle={subtitle}
                editRoute={route('production.work-cells.edit', workCell.id)}
                tabs={tabs}
            />
        </AppLayout>
    );
}