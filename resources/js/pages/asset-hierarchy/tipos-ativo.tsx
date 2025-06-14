import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
import { AssetType } from '@/types/entities/asset-type';
import { ColumnConfig } from '@/types/shared';
import { ColumnVisibility } from '@/components/data-table';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy',
    },
    {
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/tipos-ativo',
    },
];

interface Props {
    assetTypes: {
        data: AssetType[];
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

export default function TiposAtivo({ assetTypes: initialAssetTypes, filters }: Props) {
    const entityOps = useEntityOperations<AssetType>({
        entityName: 'assetType',
        entityLabel: 'Tipo de Ativo',
        routes: {
            index: 'asset-hierarchy.tipos-ativo',
            show: 'asset-hierarchy.tipos-ativo.show',
            destroy: 'asset-hierarchy.tipos-ativo.destroy',
            checkDependencies: 'asset-hierarchy.tipos-ativo.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.tipos-ativo',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page
        }
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('assetTypesColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            description: true,
            asset_count: true,
        };
    });

    // Use data from server
    const data = initialAssetTypes.data;
    const pagination = {
        current_page: initialAssetTypes.current_page,
        last_page: initialAssetTypes.last_page,
        per_page: initialAssetTypes.per_page,
        total: initialAssetTypes.total,
        from: initialAssetTypes.from,
        to: initialAssetTypes.to,
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
            key: 'description',
            label: 'Descrição',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => row.description || '-',
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
        localStorage.setItem('assetTypesColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('asset-hierarchy.tipos-ativo'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.tipos-ativo'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('asset-hierarchy.tipos-ativo'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de Ativo" />

            <ListLayout
                title="Tipos de Ativo"
                description="Gerencie os tipos de ativo do sistema"
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
                        onRowClick={(assetType) => router.visit(route('asset-hierarchy.tipos-ativo.show', { id: assetType.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        sortColumn={sort}
                        sortDirection={direction}
                        actions={(assetType) => (
                            <EntityActionDropdown
                                onEdit={() => entityOps.handleEdit(assetType)}
                                onDelete={() => entityOps.handleDelete(assetType)}
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

            <CreateAssetTypeSheet
                assetType={entityOps.editingItem || undefined}
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                mode={entityOps.editingItem ? 'edit' : 'create'}
            />

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityName="tipo de ativo"
                entityLabel={entityOps.deletingItem?.name || ''}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="tipo de ativo"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
