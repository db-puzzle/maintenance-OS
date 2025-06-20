import CreatePlantSheet from '@/components/CreatePlantSheet';
import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { Plant } from '@/types/entities/plant';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
    {
        title: 'Plantas',
        href: '/asset-hierarchy/plantas',
    },
];

interface Props {
    plants: {
        data: Plant[];
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
    };
}

export default function Plantas({ plants: initialPlants, filters }: Props) {
    const entityOps = useEntityOperations<Plant>({
        entityName: 'plant',
        entityLabel: 'Planta',
        routes: {
            index: 'asset-hierarchy.plantas',
            show: 'asset-hierarchy.plantas.show',
            destroy: 'asset-hierarchy.plantas.destroy',
            checkDependencies: 'asset-hierarchy.plantas.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.plantas',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('plantsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            areas_count: true,
            sectors_count: true,
            asset_count: true,
        };
    });

    // Use data from server
    const data = initialPlants.data;
    const pagination = {
        current_page: initialPlants.current_page,
        last_page: initialPlants.last_page,
        per_page: initialPlants.per_page,
        total: initialPlants.total,
        from: initialPlants.from,
        to: initialPlants.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => (
                <div>
                    <div className="font-medium">{row.name}</div>
                    {row.description && <div className="text-muted-foreground text-sm">{row.description}</div>}
                </div>
            ),
        },
        {
            key: 'areas_count',
            label: 'Áreas',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => value || 0,
        },
        {
            key: 'sectors_count',
            label: 'Setores',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => value || 0,
        },
        {
            key: 'asset_count',
            label: 'Ativos',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => value || 0,
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('plantsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.plantas'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.plantas'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.plantas'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Plantas" />

            <ListLayout
                title="Plantas"
                description="Gerencie as plantas do sistema"
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
                        data={data}
                        columns={columns}
                        loading={false}
                        onRowClick={(plant) => router.visit(route('asset-hierarchy.plantas.show', { id: plant.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(plant) => (
                            <EntityActionDropdown onEdit={() => entityOps.handleEdit(plant)} onDelete={() => entityOps.handleDelete(plant)} />
                        )}
                    />

                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>

            <CreatePlantSheet
                plant={entityOps.editingItem || undefined}
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                mode="edit"
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
                entityName="planta"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
