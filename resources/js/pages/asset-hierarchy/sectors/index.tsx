import React from 'react';
import CreateSectorSheet from '@/components/CreateSectorSheet';
import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { type Plant } from '@/types/asset-hierarchy';
import { Sector } from '@/types/entities/sector';
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
        title: 'Setores',
        href: '/asset-hierarchy/sectors',
    },
];
interface Props {
    sectors: {
        data: Sector[];
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
    plants: Plant[];
}
export default function SectorIndex({ sectors: initialSectors, filters, plants }: Props) {
    const entityOps = useEntityOperations<Sector>({
        entityName: 'sector',
        entityLabel: 'Setor',
        routes: {
            index: 'asset-hierarchy.sectors',
            show: 'asset-hierarchy.sectors.show',
            destroy: 'asset-hierarchy.sectors.destroy',
            checkDependencies: 'asset-hierarchy.sectors.check-dependencies',
        },
    });
    const [search, setSearch] = useState(filters.search || '');
    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.sectors',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('sectorsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            plant: true,
            area: true,
            asset_count: true,
        };
    });
    // Use data from server
    const data = initialSectors.data;
    const pagination = {
        current_page: initialSectors.current_page,
        last_page: initialSectors.last_page,
        per_page: initialSectors.per_page,
        total: initialSectors.total,
        from: initialSectors.from,
        to: initialSectors.to,
    };
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => (
                <div>
                    <div className="font-medium">{row.name as React.ReactNode}</div>
                    {row.description ? <div className="text-muted-foreground text-sm">{String(row.description)}</div> : null}
                </div>
            ),
        },
        {
            key: 'plant',
            label: 'Planta',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => <>{((row.area as Record<string, unknown>)?.plant as Record<string, unknown>)?.name || '-'}</>,
        },
        {
            key: 'area',
            label: 'Área',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => ((row.area as Record<string, unknown>)?.name || '-') as React.ReactNode,
        },
        {
            key: 'asset_count',
            label: 'Ativos',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => <>{value || 0}</>,
        },
    ];
    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('sectorsColumnsVisibility', JSON.stringify(newVisibility));
    };
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.sectors'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.sectors'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.sectors'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Setores" />
            <ListLayout
                title="Setores"
                description="Gerencie os setores do sistema"
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
                        data={data.map(sector => ({ ...sector } as Record<string, unknown>))}
                        columns={columns}
                        loading={false}
                        onRowClick={(sector) => router.visit(route('asset-hierarchy.sectors.show', { id: sector.id as string | number }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(sector) => (
                            <EntityActionDropdown onEdit={() => entityOps.handleEdit(sector as unknown as Sector)} onDelete={() => entityOps.handleDelete(sector as unknown as Sector)} />
                        )}
                    />
                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>
            <CreateSectorSheet
                sector={entityOps.editingItem || undefined}
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
                entityName="setor"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
