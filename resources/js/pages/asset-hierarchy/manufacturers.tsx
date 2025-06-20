import CreateManufacturerSheet from '@/components/CreateManufacturerSheet';
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
import { Manufacturer } from '@/types/entities/manufacturer';
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
        title: 'Fabricantes',
        href: '/asset-hierarchy/manufacturers',
    },
];

interface Props {
    manufacturers: {
        data: Manufacturer[];
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

export default function Manufacturers({ manufacturers: initialManufacturers, filters }: Props) {
    const entityOps = useEntityOperations<Manufacturer>({
        entityName: 'manufacturer',
        entityLabel: 'Fabricante',
        routes: {
            index: 'asset-hierarchy.manufacturers',
            show: 'asset-hierarchy.manufacturers.show',
            destroy: 'asset-hierarchy.manufacturers.destroy',
            checkDependencies: 'asset-hierarchy.manufacturers.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.manufacturers',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('manufacturersColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            country: true,
            contact: true,
            asset_count: true,
        };
    });

    // Use data from server
    const data = initialManufacturers.data;
    const pagination = {
        current_page: initialManufacturers.current_page,
        last_page: initialManufacturers.last_page,
        per_page: initialManufacturers.per_page,
        total: initialManufacturers.total,
        from: initialManufacturers.from,
        to: initialManufacturers.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => row.name,
        },
        {
            key: 'country',
            label: 'País',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => row.country || '-',
        },
        {
            key: 'contact',
            label: 'Contato',
            sortable: false,
            width: 'w-[300px]',
            render: (value, row) => {
                const contacts = [];
                if (row.email) contacts.push(row.email);
                if (row.phone) contacts.push(row.phone);
                return contacts.length > 0 ? contacts.join(' | ') : '-';
            },
        },
        {
            key: 'asset_count',
            label: 'Ativos',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => {
                const count = value || 0;
                return count > 0 ? `${count} ativo(s)` : 'Nenhum ativo';
            },
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('manufacturersColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.manufacturers'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('asset-hierarchy.manufacturers'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.manufacturers'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fabricantes" />

            <ListLayout
                title="Fabricantes"
                description="Gerencie os fabricantes de ativos"
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
                        onRowClick={(manufacturer) => router.visit(route('asset-hierarchy.manufacturers.show', { id: manufacturer.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        sortColumn={sort}
                        sortDirection={direction}
                        actions={(manufacturer) => (
                            <EntityActionDropdown
                                onEdit={() => entityOps.handleEdit(manufacturer)}
                                onDelete={() => entityOps.handleDelete(manufacturer)}
                            />
                        )}
                    />

                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>

            <CreateManufacturerSheet
                manufacturer={entityOps.editingItem || undefined}
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                mode={entityOps.editingItem ? 'edit' : 'create'}
            />

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityName="fabricante"
                entityLabel={entityOps.deletingItem?.name || ''}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="fabricante"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}
