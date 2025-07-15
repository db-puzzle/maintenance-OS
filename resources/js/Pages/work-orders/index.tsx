import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Plus, Wrench, Play, AlertCircle, CheckCircle, Calendar as CalendarIcon, ChevronDown, Search, Eye, FileText, CheckSquare, Gauge } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import DashboardLayout from '@/layouts/dashboards/dashboard-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

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
        trend?: {
            direction: 'up' | 'down' | 'stable';
            percentage: number;
        };
    };
    dailyTrend?: Array<{
        date: string;
        completed: number;
        overdue: number;
    }>;
    canCreate: boolean;
    discipline: 'maintenance' | 'quality';
}

const chartConfig = {
    completed: {
        label: 'Concluídas',
        color: 'hsl(var(--chart-1))',
    },
    overdue: {
        label: 'Atrasadas',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

export default function WorkOrderIndex({ workOrders, stats, dailyTrend = [], canCreate, discipline = 'maintenance' }: Props) {
    const [date, setDate] = useState<DateRange | undefined>(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const dateFrom = urlParams.get('date_from');
        const dateTo = urlParams.get('date_to');

        if (dateFrom && dateTo) {
            return {
                from: new Date(dateFrom),
                to: new Date(dateTo),
            };
        }

        return {
            from: new Date(new Date().setDate(new Date().getDate() - 30)),
            to: new Date(),
        };
    });

    const [statusFilter, setStatusFilter] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('status') || 'All';
    });

    const [priorityFilter, setPriorityFilter] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('priority') || 'All';
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search') || '';
    });

    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Column configuration
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
            render: (value) => value as React.ReactNode,
        },
        ...(discipline === 'maintenance' ? [{
            key: 'asset',
            label: 'Ativo',
            render: (_: any, row: any) => (row.asset?.tag || '-') as React.ReactNode,
        }] : [{
            key: 'instrument',
            label: 'Instrumento',
            render: (_: any, row: any) => (row.instrument?.tag || '-') as React.ReactNode,
        }]),
        {
            key: 'work_order_category',
            label: 'Categoria',
            render: (value: any) => {
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
                return categoryLabels[value] || value;
            },
        },
        {
            key: 'type',
            label: 'Tipo',
            render: (_: any, row: any) => (row.type?.name || '-') as React.ReactNode,
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

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);

        if (newDate?.from && newDate?.to) {
            const params = new URLSearchParams(window.location.search);
            params.set('date_from', newDate.from.toISOString().split('T')[0]);
            params.set('date_to', newDate.to.toISOString().split('T')[0]);

            if (statusFilter !== 'All') {
                params.set('status', statusFilter.toLowerCase());
            }
            if (priorityFilter !== 'All') {
                params.set('priority', priorityFilter.toLowerCase());
            }
            if (searchQuery) {
                params.set('search', searchQuery);
            }

            router.visit(`/maintenance/work-orders?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handleStatusFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);

        const params = new URLSearchParams();

        if (date?.from && date?.to) {
            params.set('date_from', date.from.toISOString().split('T')[0]);
            params.set('date_to', date.to.toISOString().split('T')[0]);
        }

        if (newStatus !== 'All') {
            params.set('status', newStatus.toLowerCase());
        }

        if (priorityFilter !== 'All') {
            params.set('priority', priorityFilter.toLowerCase());
        }

        if (searchQuery) {
            params.set('search', searchQuery);
        }

        router.visit(`/maintenance/work-orders?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePriorityFilterChange = (newPriority: string) => {
        setPriorityFilter(newPriority);

        const params = new URLSearchParams();

        if (date?.from && date?.to) {
            params.set('date_from', date.from.toISOString().split('T')[0]);
            params.set('date_to', date.to.toISOString().split('T')[0]);
        }

        if (statusFilter !== 'All') {
            params.set('status', statusFilter.toLowerCase());
        }

        if (newPriority !== 'All') {
            params.set('priority', newPriority.toLowerCase());
        }

        if (searchQuery) {
            params.set('search', searchQuery);
        }

        router.visit(`/maintenance/work-orders?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchChange = (newSearch: string) => {
        setSearchQuery(newSearch);

        setTimeout(() => {
            const params = new URLSearchParams();

            if (date?.from && date?.to) {
                params.set('date_from', date.from.toISOString().split('T')[0]);
                params.set('date_to', date.to.toISOString().split('T')[0]);
            }

            if (statusFilter !== 'All') {
                params.set('status', statusFilter.toLowerCase());
            }

            if (priorityFilter !== 'All') {
                params.set('priority', priorityFilter.toLowerCase());
            }

            if (newSearch.trim()) {
                params.set('search', newSearch.trim());
            }

            router.visit(`/maintenance/work-orders?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }, 500);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set('page', page.toString());

        router.get(route('maintenance.work-orders.index'), Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (columnKey: string) => {
        console.log('Sort:', columnKey);
    };

    const handleExportSingle = (workOrderId: number) => {
        console.log('Export single:', workOrderId);
    };

    // Transform dailyTrend data for the chart
    const chartData = dailyTrend?.map((day) => ({
        date: day.date,
        completed: Number(day.completed || 0),
        overdue: Number(day.overdue || 0),
    })) || [];

    // Calculate total from stats
    const totalOrders = stats.open + stats.in_progress + stats.completed_this_month;
    const completionRate = totalOrders > 0 ? ((stats.completed_this_month / totalOrders) * 100).toFixed(1) : '0';

    const dashboardContent = (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            {/* Date Range and Filters */}
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-2">
                    <div className={cn('grid gap-2')}>
                        <Popover>
                            <PopoverTrigger asChild className="max-w-[300px]">
                                <Button
                                    id="date"
                                    variant={'outline'}
                                    className={cn('w-full max-w-[300px] justify-start text-left font-normal md:w-[300px]', !date && 'text-muted-foreground')}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                <span className="hidden sm:inline">
                                                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                                </span>
                                                <span className="sm:hidden">
                                                    {format(date.from, 'MMM dd')} - {format(date.to, 'MMM dd')}
                                                </span>
                                            </>
                                        ) : (
                                            format(date.from, 'LLL dd, y')
                                        )
                                    ) : (
                                        <span>Selecione um período</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex flex-col">
                                    <div className="flex gap-2 p-3 border-b">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const range = {
                                                    from: new Date(new Date().setDate(new Date().getDate() - 30)),
                                                    to: new Date()
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Últimos 30 Dias
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const range = {
                                                    from: new Date(new Date().setDate(new Date().getDate() - 7)),
                                                    to: new Date()
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Últimos 7 Dias
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const lastMonth = subMonths(new Date(), 1);
                                                const range = {
                                                    from: startOfMonth(lastMonth),
                                                    to: endOfMonth(lastMonth)
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Mês Passado
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const lastWeek = subWeeks(new Date(), 1);
                                                const range = {
                                                    from: startOfWeek(lastWeek, { weekStartsOn: 0 }),
                                                    to: endOfWeek(lastWeek, { weekStartsOn: 0 })
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Semana Passada
                                        </Button>
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={handleDateChange}
                                        numberOfMonths={2}
                                        className="rounded-md border-0"
                                        weekStartsOn={0}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="flex gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Status: {statusFilter === 'All' ? 'Todos' : statusFilter}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleStatusFilterChange}>
                                <DropdownMenuRadioItem value="All">Todos</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Open">Aberta</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="In_progress">Em Execução</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Completed">Concluída</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Cancelled">Cancelada</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Prioridade: {priorityFilter === 'All' ? 'Todas' : priorityFilter}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Filtrar por Prioridade</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={priorityFilter} onValueChange={handlePriorityFilterChange}>
                                <DropdownMenuRadioItem value="All">Todas</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Low">Baixa</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Medium">Média</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="High">Alta</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Critical">Crítica</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-6">
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Ordens Abertas
                        <Wrench className="h-4 w-4 text-blue-600" />
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.open.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Em Execução
                        <Play className="h-4 w-4 text-yellow-600" />
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.in_progress.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Atrasadas
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.overdue.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Concluídas (Mês)
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.completed_this_month.toLocaleString()}</p>
                </div>
            </div>

            {/* Chart */}
            {chartData && chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] max-h-[280px] w-full sm:h-[280px]">
                    <AreaChart
                        data={chartData}
                        margin={{
                            left: isMobile ? 0 : 12,
                            right: isMobile ? 0 : 12,
                            top: 10,
                            bottom: 0
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={isMobile ? 'preserveStartEnd' : 0}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return isMobile
                                    ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })
                                    : date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={isMobile ? 0 : 40}
                            hide={isMobile}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <defs>
                            <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillOverdue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-overdue)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-overdue)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <Area
                            dataKey="completed"
                            type="natural"
                            fill="url(#fillCompleted)"
                            fillOpacity={0.4}
                            stroke="var(--color-completed)"
                            stackId="a"
                        />
                        <Area
                            dataKey="overdue"
                            type="natural"
                            fill="url(#fillOverdue)"
                            fillOpacity={0.4}
                            stroke="var(--color-overdue)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[200px] w-full items-center justify-center rounded-lg border bg-muted/10 sm:h-[280px]">
                    <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
                </div>
            )}

            <Separator />

            {/* Work Orders Table */}
            <div className="space-y-4">
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Buscar ordens de serviço..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table container with responsive wrapper */}
                {workOrders.data && workOrders.data.length > 0 ? (
                    <div className="relative overflow-hidden">
                        <div className="overflow-auto">
                            <div className="min-w-[1000px]">
                                <EntityDataTable
                                    data={workOrders.data}
                                    columns={columns}
                                    loading={false}
                                    onRowClick={(row) => router.visit(route('maintenance.work-orders.show', row.id))}
                                    onSort={handleSort}
                                    actions={(workOrder) => (
                                        <EntityActionDropdown
                                            additionalActions={[
                                                {
                                                    label: 'Visualizar',
                                                    icon: <Eye className="h-4 w-4" />,
                                                    onClick: () => router.visit(route('maintenance.work-orders.show', workOrder.id)),
                                                },
                                                {
                                                    label: 'Exportar',
                                                    icon: <FileText className="h-4 w-4" />,
                                                    onClick: () => handleExportSingle(workOrder.id as number),
                                                },
                                            ]}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-[200px] w-full items-center justify-center rounded-lg border bg-muted/10">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-2">Nenhuma ordem de serviço encontrada</p>
                            <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie uma nova ordem</p>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {workOrders.meta && workOrders.meta.last_page > 1 && (
                    <EntityPagination
                        pagination={workOrders.meta}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={discipline === 'maintenance' ? 'Ordens de Manutenção' : 'Ordens de Qualidade'} />

            <DashboardLayout
                title={discipline === 'maintenance' ? 'Ordens de Manutenção' : 'Ordens de Qualidade'}
                subtitle={discipline === 'maintenance'
                    ? 'Gerencie todas as ordens de serviço de manutenção'
                    : 'Gerencie todas as ordens de serviço de qualidade'}
                editRoute="/maintenance/work-orders"
                tabs={[]}
                showEditButton={false}
                actionButtons={
                    canCreate && (
                        <Button onClick={() => router.visit(route(`${discipline}.work-orders.create`))}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Ordem
                        </Button>
                    )
                }
            >
                {dashboardContent}
            </DashboardLayout>
        </AppLayout>
    );
} 