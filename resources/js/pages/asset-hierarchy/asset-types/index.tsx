import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
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
import { AssetType } from '@/types/entities/asset-type';
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
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/asset-types',
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
            index: 'asset-hierarchy.asset-types',
            show: 'asset-hierarchy.asset-types.show',
            destroy: 'asset-hierarchy.asset-types.destroy',
            checkDependencies: 'asset-hierarchy.asset-types.check-dependencies',
        },
    });
    const [search, setSearch] = useState(filters.search || '');
    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.asset-types',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
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
                    <div className="font-medium">{row.name as React.ReactNode}</div>
                    {row.description ? <div className="text-muted-foreground text-sm">{String(row.description)}</div> : null}
                </div>
            ),
        },
        {
            key: 'description',
            label: 'Descrição',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => (row.description || '-') as React.ReactNode,
        },
        {
            key: 'asset_count',
            label: 'Ativos',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (value || 0) as React.ReactNode,
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
        router.get(
            route('asset-hierarchy.asset-types'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(
            route('asset-hierarchy.asset-types'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.asset-types'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
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
                        data={data.map(assetType => ({ ...assetType } as Record<string, unknown>))}
                        columns={columns}
                        loading={false}
                        onRowClick={(assetType) => router.visit(route('asset-hierarchy.asset-types.show', { id: assetType.id as string | number }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(assetType) => (
                            <EntityActionDropdown onEdit={() => entityOps.handleEdit(assetType as unknown as AssetType)} onDelete={() => entityOps.handleDelete(assetType as unknown as AssetType)} />
                        )}
                    />
                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
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
