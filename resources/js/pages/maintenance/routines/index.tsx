import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExportManager } from '@/hooks/use-export-manager';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import type { ExecutionFilters, FilterOption, PaginatedExecutions, SortOption } from '@/types/maintenance';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { Eye, FileText, Filter } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

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
        title: 'Rotinas Executadas',
        href: '/maintenance/routines',
    },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ExecutionIndex: React.FC<ExecutionIndexProps> = ({ executions, filters, filterOptions, sortOptions, currentSort }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [search, setSearch] = useState(filters.search || '');
    const { addExport, updateExport } = useExportManager();

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
            label: 'Rotina',
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
            label: 'Ativo',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => (row.assets.length > 0 ? row.assets[0].tag : row.primary_asset_tag || 'N/D'),
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
            label: 'Iniciado em',
            sortable: true,
            width: 'w-[180px]',
            render: (value) => formatDate(value),
        },
        {
            key: 'duration',
            label: 'Duração',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => (row.duration_minutes ? `${row.duration_minutes}m` : 'N/D'),
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



    const handleExportSingle = async (executionId: number) => {
        try {
            const response = await fetch(`/maintenance/routines/executions/${executionId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    format: 'pdf',
                    template: 'standard',
                    include_images: true,
                    compress_images: true,
                    include_signatures: false,
                    paper_size: 'A4',
                    delivery: {
                        method: 'download',
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.includes('Chrome')) {
                    throw new Error(
                        'Chrome/Chromium is required for PDF generation. Please install Google Chrome: brew install --cask google-chrome',
                    );
                }
                throw new Error(data.error || `Export failed: ${response.statusText}`);
            }

            // Find the execution data to get the routine name
            const execution = executions.data.find(e => e.id === executionId);
            const description = execution
                ? `Execution #${executionId} - ${execution.routine.name}`
                : `Execution #${executionId}`;

            // Add to export manager
            addExport({
                id: data.export_id,
                type: 'single',
                description,
                status: 'processing',
                progress: 0,
            });

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/maintenance/routines/exports/${data.export_id}/status`, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const statusData = await statusResponse.json();

                    // Update progress in export manager
                    if (statusData.progress_percentage) {
                        updateExport(data.export_id, {
                            progress: statusData.progress_percentage,
                        });
                    }

                    if (statusData.status === 'completed' && statusData.download_url) {
                        clearInterval(pollInterval);

                        // Update export manager with completion
                        updateExport(data.export_id, {
                            status: 'completed',
                            downloadUrl: statusData.download_url,
                            completedAt: new Date(),
                        });
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);

                        // Update export manager with failure
                        updateExport(data.export_id, {
                            status: 'failed',
                            error: 'The export process failed. Please try again.',
                        });
                    }
                } catch (error) {
                    console.error('Status polling error:', error);
                }
            }, 2000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 300000);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while exporting');
        }
    };



    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Execuções - Manutenção" />

            <ListLayout
                title="Rotinas Executadas"
                description="Visualize e gerencie todos os registros de execução de rotinas"
                searchValue={search}
                onSearchChange={handleSearch}
                createButtonText=""
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
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
                    {/* Painel de Filtros */}
                    {showFilters && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Filtros</CardTitle>
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
                                                <SelectValue placeholder="Todos os status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Todos os status</SelectItem>
                                                {filterOptions.statuses.map((status) => (
                                                    <SelectItem key={status.value} value={status.value.toString()}>
                                                        {status.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Ativo</label>
                                        <Select
                                            value={localFilters.asset_ids?.[0]?.toString() || ''}
                                            onValueChange={(value) => setLocalFilters({ ...localFilters, asset_ids: value ? [parseInt(value)] : [] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os ativos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Todos os ativos</SelectItem>
                                                {filterOptions.assets.map((asset) => (
                                                    <SelectItem key={asset.value} value={asset.value.toString()}>
                                                        {asset.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Rotina</label>
                                        <Select
                                            value={localFilters.routine_ids?.[0]?.toString() || ''}
                                            onValueChange={(value) =>
                                                setLocalFilters({ ...localFilters, routine_ids: value ? [parseInt(value)] : [] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas as rotinas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Todas as rotinas</SelectItem>
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
                                                <SelectValue placeholder="Todos os executores" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Todos os executores</SelectItem>
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
                                        Limpar Filtros
                                    </Button>
                                    <Button onClick={applyFilters}>Aplicar Filtros</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <EntityDataTable
                        data={data}
                        columns={columns}
                        loading={false}
                        onRowClick={(execution) => router.visit(`/maintenance/routines/executions/${execution.id}`)}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(execution) => (
                            <EntityActionDropdown
                                additionalActions={[
                                    {
                                        label: 'Visualizar',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => router.visit(`/maintenance/routines/executions/${execution.id}`),
                                    },
                                    {
                                        label: 'Exportar PDF',
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
