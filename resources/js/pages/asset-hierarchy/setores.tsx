import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import CreateSectorSheet from '@/components/CreateSectorSheet';
import { Sector } from '@/types/entities/sector';
import { ColumnConfig } from '@/types/shared';
import { ColumnVisibility } from '@/components/data-table';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import { type Plant } from '@/types/asset-hierarchy';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy',
    },
    {
        title: 'Setores',
        href: '/asset-hierarchy/setores',
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
            index: 'asset-hierarchy.setores',
            show: 'asset-hierarchy.setores.show',
            destroy: 'asset-hierarchy.setores.destroy',
            checkDependencies: 'asset-hierarchy.setores.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.setores',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page
        }
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
                    <div className="font-medium">{row.name}</div>
                    {row.description && (
                        <div className="text-muted-foreground text-sm">{row.description}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'plant',
            label: 'Planta',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.area?.plant?.name || '-',
        },
        {
            key: 'area',
            label: 'Área',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.area?.name || '-',
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
        localStorage.setItem('sectorsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('asset-hierarchy.setores'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.setores'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('asset-hierarchy.setores'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true }
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
                            columns={columns.map(col => ({
                                id: col.key,
                                header: col.label,
                                cell: () => null,
                                width: 'w-auto'
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
                        onRowClick={(sector) => router.visit(route('asset-hierarchy.setores.show', { id: sector.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        sortColumn={sort}
                        sortDirection={direction}
                        actions={(sector) => (
                            <EntityActionDropdown
                                onEdit={() => entityOps.handleEdit(sector)}
                                onDelete={() => entityOps.handleDelete(sector)}
                            />
                        )}
                    />

                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
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
                entityName="setor"
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
