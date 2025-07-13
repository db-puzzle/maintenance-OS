import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Wrench, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

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
        data: any[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number;
            to: number;
        };
    };
    stats: {
        open: number;
        in_progress: number;
        overdue: number;
        completed_this_month: number;
    };
    canCreate: boolean;
}

export default function WorkOrderIndex({ workOrders, stats, canCreate }: Props) {
    // KPI Cards
    const kpiCards = [
        {
            title: 'Ordens Abertas',
            value: stats.open,
            icon: Wrench,
            color: 'blue',
        },
        {
            title: 'Em Execução',
            value: stats.in_progress,
            icon: Play,
            color: 'yellow',
        },
        {
            title: 'Atrasadas',
            value: stats.overdue,
            icon: AlertCircle,
            color: 'red',
        },
        {
            title: 'Concluídas (Mês)',
            value: stats.completed_this_month,
            icon: CheckCircle,
            color: 'green',
        },
    ];

    // Table columns
    const columns = [
        {
            key: 'work_order_number',
            label: 'Número',
            sortable: true,
            width: 'w-[120px]',
        },
        {
            key: 'title',
            label: 'Título',
            sortable: true,
        },
        {
            key: 'asset',
            label: 'Ativo',
            render: (_: any, row: any) => row.asset?.tag || '-',
        },
        {
            key: 'type',
            label: 'Tipo',
            render: (_: any, row: any) => row.type?.name || '-',
        },
        {
            key: 'priority',
            label: 'Prioridade',
            render: (value: any) => <WorkOrderPriorityIndicator priority={value} showLabel={false} />,
            width: 'w-[80px]',
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: any) => <WorkOrderStatusBadge status={value} />,
            width: 'w-[150px]',
        },
        {
            key: 'scheduled_start_date',
            label: 'Data Programada',
            render: (value: any) => value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : '-',
            sortable: true,
            width: 'w-[130px]',
        },
    ];

    const handlePageChange = (page: number) => {
        router.get(route('work-orders.index'), { page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ordens de Serviço" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
                        <p className="text-muted-foreground">
                            Gerencie todas as ordens de serviço de manutenção
                        </p>
                    </div>
                    {canCreate && (
                        <Button onClick={() => router.visit(route('work-orders.create'))}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Ordem
                        </Button>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kpiCards.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <Card key={kpi.title}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {kpi.title}
                                    </CardTitle>
                                    <Icon className={cn(
                                        "h-4 w-4",
                                        kpi.color === 'blue' && 'text-blue-600',
                                        kpi.color === 'yellow' && 'text-yellow-600',
                                        kpi.color === 'red' && 'text-red-600',
                                        kpi.color === 'green' && 'text-green-600'
                                    )} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{kpi.value}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Data Table */}
                <EntityDataTable
                    data={workOrders.data}
                    columns={columns}
                    onRowClick={(row) => router.visit(route('work-orders.show', row.id))}
                    emptyMessage="Nenhuma ordem de serviço encontrada."
                />

                {/* Pagination */}
                {workOrders.meta.last_page > 1 && (
                    <EntityPagination
                        pagination={workOrders.meta}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </AppLayout>
    );
} 