import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { ColumnVisibility } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Factory, Play, Pause, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ColumnConfig, PaginationMeta } from '@/types/shared';
import { type BreadcrumbItem } from '@/types';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Production',
        href: '/production',
    },
    {
        title: 'Schedule',
        href: '/production/schedules',
    },
];

interface ManufacturingStep extends Record<string, unknown> {
    id: number;
    step_number: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    description: string | null;
    work_cell_id: number | null;
    status: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'completed' | 'skipped';
    setup_time_minutes: number;
    cycle_time_minutes: number;
    actual_start_time: string | null;
    actual_end_time: string | null;
    manufacturing_route: {
        id: number;
        name: string;
        manufacturing_order: {
            id: number;
            order_number: string;
            quantity: number;
            status: string;
            item: {
                id: number;
                item_number: string;
                name: string;
            };
        };
        item: {
            id: number;
            item_number: string;
            name: string;
        };
    };
    work_cell: {
        id: number;
        name: string;
    } | null;
}

interface WorkCell {
    id: number;
    name: string;
}

interface Props {
    schedules?: {
        data: ManufacturingStep[];
        links: any;
        meta: PaginationMeta;
    };
    filters?: {
        search?: string;
        status?: string;
        work_cell_id?: number;
        date_from?: string;
        date_to?: string;
        per_page?: number;
        sort?: string;
        direction?: 'asc' | 'desc';
    };
    workCells?: WorkCell[];
    statuses?: Record<string, string>;
}

function ProductionScheduleIndex({
    schedules = {
        data: [],
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 0,
            from: 0,
            to: 0
        } as PaginationMeta,
        links: {}
    },
    filters = {},
    workCells = [],
    statuses = {}
}: Props) {
    // Props are now guaranteed to have default values, so we can simplify this
    const safeSchedules = schedules;
    const safeWorkCells = Array.isArray(workCells) ? workCells : [];
    const safeStatuses = statuses && typeof statuses === 'object' ? statuses : {};
    // Create a clean object to avoid prototype chain issues
    const safeFilters = filters ? { ...filters } : {};

    const entityOps = useEntityOperations<ManufacturingStep>({
        entityName: 'schedule',
        entityLabel: 'Schedule',
        routes: {
            index: 'production.schedules',
            show: 'production.schedules.show',
            destroy: 'production.schedules.destroy',
            checkDependencies: 'production.schedules.check-dependencies',
        },
    });

    // Ensure filters object is properly initialized
    const normalizedFilters = {
        search: safeFilters.search || '',
        status: safeFilters.status || 'all',
        work_cell_id: safeFilters.work_cell_id || undefined,
        date_from: safeFilters.date_from || '',
        date_to: safeFilters.date_to || '',
        per_page: safeFilters.per_page || 15,
        sort: safeFilters.sort || 'step_number',
        direction: (safeFilters.direction || 'asc') as 'asc' | 'desc',
    };

    const [search, setSearch] = useState(normalizedFilters.search);
    const [status, setStatus] = useState(normalizedFilters.status);
    const [workCellId, setWorkCellId] = useState(normalizedFilters.work_cell_id ? normalizedFilters.work_cell_id.toString() : 'all');
    const [dateFrom, setDateFrom] = useState(normalizedFilters.date_from);
    const [dateTo, setDateTo] = useState(normalizedFilters.date_to);

    // Use centralized sorting hook
    const { sort: currentSort, direction: currentDirection, handleSort } = useSorting({
        routeName: 'production.schedules.index',
        initialSort: normalizedFilters.sort,
        initialDirection: normalizedFilters.direction,
        additionalParams: {
            ...(search && { search }),
            ...(status !== 'all' && { status }),
            ...(workCellId !== 'all' && { work_cell_id: parseInt(workCellId) }),
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo }),
            ...(normalizedFilters.per_page && { per_page: normalizedFilters.per_page }),
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('scheduleColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            step: true,
            order: true,
            work_cell: true,
            timing: true,
            status: true,
            schedule: true,
        };
    });

    const handleFilter = () => {
        router.get(route('production.schedules.index'), {
            search,
            status: status === 'all' ? undefined : status,
            work_cell_id: workCellId === 'all' ? undefined : workCellId,
            date_from: dateFrom,
            date_to: dateTo,
            per_page: normalizedFilters.per_page,
            sort: currentSort,
            direction: currentDirection,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('production.schedules.index'),
            {
                search: value,
                status: status === 'all' ? undefined : status,
                work_cell_id: workCellId === 'all' ? undefined : workCellId,
                date_from: dateFrom,
                date_to: dateTo,
                sort: currentSort,
                direction: currentDirection,
                per_page: normalizedFilters.per_page
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('production.schedules.index'), {
            search: search || undefined,
            status: status === 'all' ? undefined : status,
            work_cell_id: workCellId === 'all' ? undefined : parseInt(workCellId),
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            per_page: normalizedFilters.per_page,
            sort: currentSort,
            direction: currentDirection,
            page,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('production.schedules.index'), {
            search: search || undefined,
            status: status === 'all' ? undefined : status,
            work_cell_id: workCellId === 'all' ? undefined : parseInt(workCellId),
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            sort: currentSort,
            direction: currentDirection,
            per_page: perPage,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('scheduleColumnsVisibility', JSON.stringify(newVisibility));
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            queued: 'secondary',
            in_progress: 'default',
            on_hold: 'destructive',
            completed: 'outline',
            skipped: 'destructive',
        };

        const colors: Record<string, string> = {
            pending: 'text-gray-600',
            queued: 'text-blue-600',
            in_progress: 'text-yellow-600',
            on_hold: 'text-orange-600',
            completed: 'text-green-600',
            skipped: 'text-red-600',
        };

        return (
            <Badge variant={variants[status] || 'default'} className={colors[status]}>
                {safeStatuses[status] || status}
            </Badge>
        );
    };

    const getStepTypeIcon = (type: string) => {
        switch (type) {
            case 'quality_check':
                return <CheckCircle className="h-4 w-4 text-blue-500" />;
            case 'rework':
                return <XCircle className="h-4 w-4 text-orange-500" />;
            default:
                return <Factory className="h-4 w-4 text-gray-500" />;
        }
    };

    const columns: ColumnConfig[] = [
        {
            key: 'step',
            label: 'Step',
            sortable: true,
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return (
                    <div className="flex items-center space-x-2">
                        {getStepTypeIcon(step.step_type)}
                        <div>
                            <div className="font-medium">#{step.step_number} - {step.name}</div>
                            {step.description && (
                                <div className="text-sm text-muted-foreground">{step.description}</div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'order',
            label: 'Order',
            sortable: true,
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return (
                    <div>
                        <Link
                            href={route('production.orders.show', { order: step.manufacturing_route.manufacturing_order.id })}
                            className="font-medium text-primary hover:underline"
                        >
                            {step.manufacturing_route.manufacturing_order.order_number}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                            {step.manufacturing_route.manufacturing_order.item.name}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'work_cell',
            label: 'Work Cell',
            sortable: true,
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return (
                    <div>
                        {step.work_cell ? (
                            <span className="font-medium">{step.work_cell.name}</span>
                        ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'timing',
            label: 'Timing',
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return (
                    <div className="text-sm">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Setup: {step.setup_time_minutes}min</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Cycle: {step.cycle_time_minutes}min × {step.manufacturing_route.manufacturing_order.quantity}</span>
                        </div>
                        <div className="font-medium">
                            Total: {step.setup_time_minutes + (step.cycle_time_minutes * step.manufacturing_route.manufacturing_order.quantity)}min
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return getStatusBadge(step.status);
            },
        },
        {
            key: 'schedule',
            label: 'Schedule',
            sortable: true,
            render: (_, row) => {
                const step = row as ManufacturingStep;
                return (
                    <div className="text-sm">
                        {step.actual_start_time ? (
                            <>
                                <div>Started: {format(new Date(step.actual_start_time), 'PP p')}</div>
                                {step.actual_end_time && (
                                    <div>Ended: {format(new Date(step.actual_end_time), 'PP p')}</div>
                                )}
                            </>
                        ) : (
                            <span className="text-muted-foreground">Not started</span>
                        )}
                    </div>
                );
            },
        },
    ];

    const getActions = (row: Record<string, unknown>) => {
        const step = row as ManufacturingStep;
        const items = [];

        if (step.status === 'pending' || step.status === 'queued') {
            items.push({
                label: 'Start',
                icon: <Play className="h-4 w-4" />,
                onClick: () => router.post(route('production.schedules.start', { schedule: step.id })),
            });
        }

        if (step.status === 'in_progress') {
            items.push({
                label: 'Complete',
                icon: <CheckCircle className="h-4 w-4" />,
                onClick: () => router.visit(route('production.schedules.show', { schedule: step.id })),
            });
            items.push({
                label: 'Hold',
                icon: <Pause className="h-4 w-4" />,
                onClick: () => router.visit(route('production.schedules.show', { schedule: step.id })),
            });
        }

        if (step.status === 'on_hold') {
            items.push({
                label: 'Resume',
                icon: <Play className="h-4 w-4" />,
                onClick: () => router.post(route('production.schedules.resume', { schedule: step.id })),
            });
        }

        items.push({
            label: 'View Details',
            onClick: () => router.visit(route('production.schedules.show', { schedule: step.id })),
        });

        if (['pending', 'queued'].includes(step.status)) {
            items.push({
                label: 'Edit',
                onClick: () => router.visit(route('production.schedules.edit', { schedule: step.id })),
            });
        }

        return <EntityActionDropdown additionalActions={items} />;
    };

    // Use data from server
    const data = Array.isArray(safeSchedules?.data) ? safeSchedules.data : [];
    const pagination: PaginationMeta = {
        current_page: safeSchedules?.meta?.current_page ?? 1,
        last_page: safeSchedules?.meta?.last_page ?? 1,
        per_page: safeSchedules?.meta?.per_page ?? 15,
        total: safeSchedules?.meta?.total ?? 0,
        from: safeSchedules?.meta?.from ?? 0,
        to: safeSchedules?.meta?.to ?? 0,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Schedule" />

            <ListLayout
                title="Production Schedule"
                description="Manage production schedules"
                searchValue={search}
                onSearchChange={handleSearch}
                createRoute={route('production.schedules.create')}
                createButtonText="Schedule Production"
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.visit(route('production.planning.calendar'))}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            Calendar View
                        </Button>
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
                    {/* Filter Section */}
                    <div className="bg-card rounded-lg shadow-sm p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {Object.entries(safeStatuses).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={workCellId} onValueChange={setWorkCellId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All work cells" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All work cells</SelectItem>
                                    {safeWorkCells.map((cell) => (
                                        <SelectItem key={cell.id} value={cell.id.toString()}>
                                            {cell.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                placeholder="From date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <Input
                                type="date"
                                placeholder="To date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                            <Button onClick={handleFilter} className="md:col-span-2">
                                Apply Filters
                            </Button>
                        </div>
                    </div>

                    <EntityDataTable
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(row) => {
                            const step = row as unknown as ManufacturingStep;
                            router.visit(route('production.schedules.show', { schedule: step.id }));
                        }}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={getActions}
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
                entityLabel={`the schedule ${entityOps.deletingItem?.name || ''}`}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="schedule"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}

export default ProductionScheduleIndex; 