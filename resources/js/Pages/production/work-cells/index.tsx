import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { WorkCell } from '@/types/production';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

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
];

interface Props {
    workCells: {
        data: WorkCell[];
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
        cell_type?: string;
        is_active?: string;
    };
    plants: {
        id: number;
        name: string;
    }[];
    shifts: {
        id: number;
        name: string;
    }[];
    manufacturers: {
        id: number;
        name: string;
    }[];
}

export default function WorkCells({ workCells: initialWorkCells, filters, plants, shifts, manufacturers }: Props) {
    const entityOps = useEntityOperations<WorkCell>({
        entityName: 'work-cell',
        entityLabel: 'Célula de Trabalho',
        routes: {
            index: 'production.work-cells',
            show: 'production.work-cells.show',
            destroy: 'production.work-cells.destroy',
            checkDependencies: 'production.work-cells.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'production.work-cells',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
            cell_type: filters.cell_type,
            is_active: filters.is_active,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('workCellsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            cell_type: true,
            location: true,
            shift: true,
            capacity: true,
            routing_steps_count: true,
            is_active: true,
        };
    });

    // Use data from server
    const data = initialWorkCells.data;
    const pagination = {
        current_page: initialWorkCells.current_page,
        last_page: initialWorkCells.last_page,
        per_page: initialWorkCells.per_page,
        total: initialWorkCells.total,
        from: initialWorkCells.from,
        to: initialWorkCells.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[250px]',
            render: (value, row) => {
                const workCell = row as unknown as WorkCell;
                return (
                    <div>
                        <div className="font-medium">{workCell.name}</div>
                        {workCell.description && <div className="text-muted-foreground text-sm">{workCell.description}</div>}
                    </div>
                );
            },
        },
        {
            key: 'cell_type',
            label: 'Tipo',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => {
                return (
                    <Badge variant={value === 'internal' ? 'default' : 'secondary'}>
                        {value === 'internal' ? 'Interna' : 'Externa'}
                    </Badge>
                );
            },
        },
        {
            key: 'location',
            label: 'Localização',
            sortable: false,
            width: 'w-[200px]',
            render: (value, row) => {
                const workCell = row as unknown as WorkCell;
                if (workCell.cell_type === 'external' && workCell.manufacturer) {
                    return <span className="text-muted-foreground">{workCell.manufacturer.name} (Externo)</span>;
                }
                const parts = [];
                if (workCell.plant) parts.push(workCell.plant.name);
                if (workCell.area) parts.push(workCell.area.name);
                if (workCell.sector) parts.push(workCell.sector.name);
                return parts.length > 0 ? parts.join(' / ') : '-';
            },
        },
        {
            key: 'shift',
            label: 'Turno',
            sortable: true,
            width: 'w-[120px]',
            render: (value, row) => {
                const workCell = row as unknown as WorkCell;
                return workCell.shift?.name || '-';
            },
        },
        {
            key: 'capacity',
            label: 'Capacidade',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => {
                const workCell = row as unknown as WorkCell;
                return (
                    <div className="text-sm">
                        <div>{workCell.available_hours_per_day}h/dia</div>
                        <div className="text-muted-foreground">Eficiência: {workCell.efficiency_percentage}%</div>
                    </div>
                );
            },
        },
        {
            key: 'routing_steps_count',
            label: 'Etapas',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (value as number) || 0,
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => {
                return (
                    <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Ativa' : 'Inativa'}
                    </Badge>
                );
            },
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('workCellsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('production.work-cells'),
            {
                search: value,
                sort,
                direction,
                per_page: filters.per_page,
                cell_type: filters.cell_type,
                is_active: filters.is_active,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('production.work-cells'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('production.work-cells'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Células de Trabalho" />

            <ListLayout
                title="Células de Trabalho"
                description="Gerencie as células de trabalho do sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={() => entityOps.setEditSheetOpen(true)}
                createButtonText="Adicionar"
                actions={
                    <div className="flex items-center gap-2">
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
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(row) => {
                            const workCell = row as unknown as WorkCell;
                            router.visit(route('production.work-cells.show', { work_cell: workCell.id }));
                        }}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(row) => {
                            const workCell = row as unknown as WorkCell;
                            return (
                                <EntityActionDropdown
                                    onEdit={() => entityOps.handleEdit(workCell)}
                                    onDelete={() => entityOps.handleDelete(workCell)}
                                />
                            );
                        }}
                    />

                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>

            <CreateWorkCellSheet
                workCell={entityOps.editingItem || undefined}
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                mode={entityOps.editingItem ? 'edit' : 'create'}
                plants={plants}
                shifts={shifts}
                manufacturers={manufacturers}
            />

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={entityOps.deletingItem?.name || ''}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="célula de trabalho"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}