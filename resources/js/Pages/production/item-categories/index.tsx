import CreateItemCategorySheet from '@/components/production/CreateItemCategorySheet';
import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/production/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ItemCategory } from '@/types/production';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
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
        href: '/production',
    },
    {
        title: 'Categorias de Itens',
        href: '/production/categories',
    },
];
interface Props {
    categories: {
        data: ItemCategory[];
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
export default function ItemCategories({ categories: initialCategories, filters }: Props) {
    // State for editing
    const [editingItem, setEditingItem] = useState<ItemCategory | null>(null);
    const [isEditSheetOpen, setEditSheetOpen] = useState(false);
    // Use entityOps only for delete operations
    const entityOps = useEntityOperations<ItemCategory>({
        entityName: 'category',
        entityLabel: 'Categoria',
        routes: {
            index: 'production.categories',
            show: 'production.categories.show',
            destroy: 'production.categories.destroy',
            checkDependencies: 'production.categories.check-dependencies',
        },
        routeParameterName: 'category',
    });
    const [search, setSearch] = useState(filters.search || '');
    // Handle edit without AJAX
    const handleEdit = (category: ItemCategory) => {
        setEditingItem(category);
        setEditSheetOpen(true);
    };
    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'production.categories',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('itemCategoriesColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            description: true,
            items_count: true,
            is_active: true,
            created_by: true,
        };
    });
    // Use data from server
    const data = initialCategories.data;
    const pagination = {
        current_page: initialCategories.current_page,
        last_page: initialCategories.last_page,
        per_page: initialCategories.per_page,
        total: initialCategories.total,
        from: initialCategories.from,
        to: initialCategories.to,
    };
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const category = row as unknown as ItemCategory;
                return (
                    <div>
                        <div className="font-medium">{category.name}</div>
                    </div>
                );
            },
        },
        {
            key: 'description',
            label: 'Descrição',
            sortable: true,
            width: 'w-[400px]',
            render: (value, row) => {
                const category = row as unknown as ItemCategory;
                return category.description ? (
                    <div className="text-muted-foreground text-sm">{category.description}</div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            key: 'items_count',
            label: 'Itens',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (value as number) || 0,
        },
        {
            key: 'is_active',
            label: 'Ativo',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => {
                const category = row as unknown as ItemCategory;
                return category.is_active ? (
                    <div className="flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <X className="h-4 w-4 text-red-600" />
                    </div>
                );
            },
        },
        {
            key: 'created_by',
            label: 'Criado por',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const category = row as unknown as ItemCategory;
                return category.createdBy?.name || '-';
            },
        },
    ];
    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('itemCategoriesColumnsVisibility', JSON.stringify(newVisibility));
    };
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('production.categories'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(route('production.categories'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('production.categories'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorias de Itens" />
            <ListLayout
                title="Categorias de Itens"
                description="Gerencie as categorias de itens do sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={() => {
                    setEditingItem(null);
                    setEditSheetOpen(true);
                }}
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
                        onRowClick={(category) => router.visit(route('production.categories.show', { category: category.id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(category) => (
                            <EntityActionDropdown onEdit={() => handleEdit(category)} onDelete={() => entityOps.handleDelete(category)} />
                        )}
                    />
                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>
            <CreateItemCategorySheet
                category={editingItem || undefined}
                open={isEditSheetOpen}
                onOpenChange={setEditSheetOpen}
                mode={editingItem ? 'edit' : 'create'}
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
                entityName="categoria"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}