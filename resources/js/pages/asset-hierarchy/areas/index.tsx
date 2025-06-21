import CreateAreaSheet from '@/components/CreateAreaSheet';
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
import { Area } from '@/types/entities/area';
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
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
    },
];

interface Props {
    areas: {
        data: Area[];
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
    plants: {
        id: number;
        name: string;
    }[];
}

export default function Areas({ areas: initialAreas, filters, plants }: Props) {
    const entityOps = useEntityOperations<Area>({
        entityName: 'area',
        entityLabel: 'Área',
        routes: {
            index: 'asset-hierarchy.areas',
            show: 'asset-hierarchy.areas.show',
            destroy: 'asset-hierarchy.areas.destroy',
            checkDependencies: 'asset-hierarchy.areas.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.areas',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('areasColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            plant: true,
            sectors_count: true,
            asset_count: true,
        };
    });

    // Use data from server
    const data = initialAreas.data;
    const pagination = {
        current_page: initialAreas.current_page,
        last_page: initialAreas.last_page,
        per_page: initialAreas.per_page,
        total: initialAreas.total,
        from: initialAreas.from,
        to: initialAreas.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const area = row as unknown as Area;
                return (
                    <div>
                        <div className="font-medium">{area.name}</div>
                        {area.description && <div className="text-muted-foreground text-sm">{area.description}</div>}
                    </div>
                );
            },
        },
        {
            key: 'plant',
            label: 'Planta',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const area = row as unknown as Area;
                return area.plant?.name || '-';
            },
        },
        {
            key: 'sectors_count',
            label: 'Setores',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (value as number) || 0,
        },
        {
            key: 'asset_count',
            label: 'Ativos',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (value as number) || 0,
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('areasColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.areas'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.areas'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.areas'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Áreas" />

            <ListLayout
                title="Áreas"
                description="Gerencie as áreas do sistema"
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
                        onRowClick={(area) => router.visit(route('asset-hierarchy.areas.show', { id: area.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(area) => (
                            <EntityActionDropdown onEdit={() => entityOps.handleEdit(area)} onDelete={() => entityOps.handleDelete(area)} />
                        )}
                    />

                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>

            <CreateAreaSheet
                area={entityOps.editingItem || undefined}
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                mode={entityOps.editingItem ? 'edit' : 'create'}
                plants={plants}
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
                entityName="área"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
