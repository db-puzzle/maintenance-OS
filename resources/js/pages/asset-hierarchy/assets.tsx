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
import { type Asset } from '@/types/asset-hierarchy';
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
        title: 'Ativos',
        href: '/asset-hierarchy/assets',
    },
];

interface Props {
    asset: {
        data: Asset[];
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

export default function Assets({ asset: initialAssets, filters }: Props) {
    const entityOps = useEntityOperations<Asset>({
        entityName: 'asset',
        entityLabel: 'Ativo',
        routes: {
            index: 'asset-hierarchy.assets',
            show: 'asset-hierarchy.assets.show',
            destroy: 'asset-hierarchy.assets.destroy',
            checkDependencies: 'asset-hierarchy.assets.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.assets',
        initialSort: filters.sort || 'tag',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('assetColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            tag: true,
            asset_type: true,
            serial_number: true,
            part_number: true,
            plant: true,
            area: true,
            sector: true,
            shift: true,
            manufacturer: true,
            manufacturing_year: true,
            routines_count: true,
        };
    });

    // Use data from server
    const data = initialAssets.data;
    const pagination = {
        current_page: initialAssets.current_page,
        last_page: initialAssets.last_page,
        per_page: initialAssets.per_page,
        total: initialAssets.total,
        from: initialAssets.from,
        to: initialAssets.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'tag',
            label: 'TAG',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => (
                <div>
                    <div className="font-medium">{row.tag}</div>
                    {row.description && (
                        <div className="text-muted-foreground text-sm">
                            {row.description.length > 40 ? `${row.description.substring(0, 40)}...` : row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'serial_number',
            label: 'Número Serial',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.serial_number ?? '-',
        },
        {
            key: 'part_number',
            label: 'Part Number',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.part_number ?? '-',
        },
        {
            key: 'routines_count',
            label: 'Rotinas',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => row.routines_count ?? 0,
        },
        {
            key: 'asset_type',
            label: 'Tipo',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.asset_type?.name ?? '-',
        },
        {
            key: 'plant',
            label: 'Planta',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.plant?.name ?? row.area?.plant?.name ?? row.sector?.area?.plant?.name ?? '-',
        },
        {
            key: 'area',
            label: 'Área',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.area?.name ?? row.sector?.area?.name ?? '-',
        },
        {
            key: 'sector',
            label: 'Setor',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.sector?.name ?? '-',
        },
        {
            key: 'shift',
            label: 'Turno',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => row.shift?.name ?? '-',
        },
        {
            key: 'manufacturer',
            label: 'Fabricante',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const manufacturer = row.manufacturer;
                if (typeof manufacturer === 'object' && manufacturer !== null) {
                    return manufacturer.name;
                }
                return manufacturer ?? '-';
            },
        },
        {
            key: 'manufacturing_year',
            label: 'Ano',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => row.manufacturing_year ?? '-',
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('assetColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.assets'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(route('asset-hierarchy.assets'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.assets'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ativos" />

            <ListLayout
                title="Ativos"
                description="Gerencie os ativos do sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                createRoute={route('asset-hierarchy.assets.create')}
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
                        onRowClick={(asset) => router.visit(route('asset-hierarchy.assets.show', { asset: asset.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        sortColumn={sort}
                        sortDirection={direction}
                        actions={(asset) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'informacoes' }))}
                                onDelete={() => entityOps.handleDelete(asset)}
                            />
                        )}
                    />

                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityName="ativo"
                entityLabel={entityOps.deletingItem?.tag || ''}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="ativo"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
