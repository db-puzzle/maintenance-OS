import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import type { ExecutionFilters, FilterOption, PaginatedExecutions, SortOption } from '@/types/maintenance';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { Download, Eye, FileText, Filter } from 'lucide-react';
import React, { useState } from 'react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

interface ExecutionIndexProps {
    executions: PaginatedExecutions;
    filters: ExecutionFilters;
    filterOptions: {
        assets: FilterOption[];
        routines: FilterOption[];
        executors: FilterOption[];
        statuses: FilterOption[];
    };
    sortOptions: SortOption[];
    currentSort: {
        column: string;
        direction: 'asc' | 'desc';
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Maintenance',
        href: '/maintenance/dashboard',
    },
    {
        title: 'Executions',
        href: '/maintenance/executions',
    },
];

const ExecutionIndex: React.FC<ExecutionIndexProps> = ({ executions, filters, filterOptions, sortOptions, currentSort }) => {
    const [selectedExecutions, setSelectedExecutions] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'maintenance.executions.index',
        initialSort: currentSort.column || 'id',
        initialDirection: currentSort.direction || 'desc',
        additionalParams: {
            ...localFilters,
            search,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('executionsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            id: true,
            routine_name: true,
            asset_tag: true,
            executor_name: true,
            status: true,
            started_at: true,
            duration: true,
        };
    });

    // Use data from server
    const data = executions.data;
    const pagination = {
        current_page: executions.current_page,
        last_page: executions.last_page,
        per_page: executions.per_page,
        total: executions.total,
        from: executions.from,
        to: executions.to,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const columns: ColumnConfig[] = [
        {
            key: 'id',
            label: 'ID',
            sortable: true,
            width: 'w-[80px]',
            render: (value) => `#${value}`,
        },
        {
            key: 'routine_name',
            label: 'Routine',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => (
                <div>
                    <div className="font-medium">{row.routine.name}</div>
                    {row.routine.description && <div className="text-muted-foreground text-sm">{row.routine.description}</div>}
                </div>
            ),
        },
        {
            key: 'asset_tag',
            label: 'Asset',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => (row.assets.length > 0 ? row.assets[0].tag : row.primary_asset_tag || 'N/A'),
        },
        {
            key: 'executor_name',
            label: 'Executor',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => row.executor.name,
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(row.status)}>{row.status.replace('_', ' ')}</Badge>
                    {row.status === 'in_progress' && <span className="text-muted-foreground text-xs">{row.progress}%</span>}
                </div>
            ),
        },
        {
            key: 'started_at',
            label: 'Started At',
            sortable: true,
            width: 'w-[180px]',
            render: (value) => formatDate(value),
        },
        {
            key: 'duration',
            label: 'Duration',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => (row.duration_minutes ? `${row.duration_minutes}m` : 'N/A'),
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('executionsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('maintenance.executions.index'),
            { ...localFilters, search: value, sort, direction },
            { preserveState: true, preserveScroll: true },
        );
    };

    const applyFilters = () => {
        router.get(
            route('maintenance.executions.index'),
            {
                ...localFilters,
                search,
                sort,
                direction,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('maintenance.executions.index'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('maintenance.executions.index'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleExportSelected = () => {
        if (selectedExecutions.length === 0) return;
        // TODO: Implement batch export functionality
        console.log('Export selected:', selectedExecutions);
    };

    const handleExportSingle = (executionId: number) => {
        // TODO: Implement single export functionality
        console.log('Export single:', executionId);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedExecutions(data.map((e) => e.id));
        } else {
            setSelectedExecutions([]);
        }
    };

    const handleSelectExecution = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedExecutions([...selectedExecutions, id]);
        } else {
            setSelectedExecutions(selectedExecutions.filter((eId) => eId !== id));
        }
    };

    // Extended table with selection checkboxes
    const columnsWithSelection: ColumnConfig[] = [
        {
            key: '_selection',
            label: '',
            width: 'w-[40px]',
            render: (value, row) => (
                <Checkbox
                    checked={selectedExecutions.includes(row.id)}
                    onCheckedChange={(checked) => handleSelectExecution(row.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        },
        ...columns,
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Executions - Maintenance" />

            <ListLayout
                title="Routine Executions"
                description="View and manage all routine execution records"
                searchValue={search}
                onSearchChange={handleSearch}
                createButtonText=""
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                        <Button variant="outline" onClick={handleExportSelected} disabled={selectedExecutions.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Selected ({selectedExecutions.length})
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
                    {/* Filters Panel */}
                    {showFilters && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Status</label>
                                        <Select
                                            value={localFilters.status?.[0] || ''}
                                            onValueChange={(value) => setLocalFilters({ ...localFilters, status: value ? [value] : [] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All statuses</SelectItem>
                                                {filterOptions.statuses.map((status) => (
                                                    <SelectItem key={status.value} value={status.value.toString()}>
                                                        {status.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Asset</label>
                                        <Select
                                            value={localFilters.asset_ids?.[0]?.toString() || ''}
                                            onValueChange={(value) => setLocalFilters({ ...localFilters, asset_ids: value ? [parseInt(value)] : [] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All assets" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All assets</SelectItem>
                                                {filterOptions.assets.map((asset) => (
                                                    <SelectItem key={asset.value} value={asset.value.toString()}>
                                                        {asset.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Routine</label>
                                        <Select
                                            value={localFilters.routine_ids?.[0]?.toString() || ''}
                                            onValueChange={(value) =>
                                                setLocalFilters({ ...localFilters, routine_ids: value ? [parseInt(value)] : [] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All routines" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All routines</SelectItem>
                                                {filterOptions.routines.map((routine) => (
                                                    <SelectItem key={routine.value} value={routine.value.toString()}>
                                                        {routine.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Executor</label>
                                        <Select
                                            value={localFilters.executor_ids?.[0]?.toString() || ''}
                                            onValueChange={(value) =>
                                                setLocalFilters({ ...localFilters, executor_ids: value ? [parseInt(value)] : [] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All executors" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All executors</SelectItem>
                                                {filterOptions.executors.map((executor) => (
                                                    <SelectItem key={executor.value} value={executor.value.toString()}>
                                                        {executor.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setLocalFilters({});
                                            router.get(
                                                route('maintenance.executions.index'),
                                                {},
                                                {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                },
                                            );
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                    <Button onClick={applyFilters}>Apply Filters</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <EntityDataTable
                        data={data}
                        columns={columnsWithSelection}
                        loading={false}
                        onRowClick={(execution) => router.visit(route('maintenance.executions.show', { id: execution.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(execution) => (
                            <EntityActionDropdown
                                additionalActions={[
                                    {
                                        label: 'View',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => router.visit(route('maintenance.executions.show', { id: execution.id })),
                                    },
                                    {
                                        label: 'Export',
                                        icon: <FileText className="h-4 w-4" />,
                                        onClick: () => handleExportSingle(execution.id),
                                    },
                                ]}
                            />
                        )}
                    />

                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>
        </AppLayout>
    );
};

export default ExecutionIndex;
