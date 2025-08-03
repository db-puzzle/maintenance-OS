import { type BreadcrumbItem } from '@/types';
import { type ItemCategory } from '@/types/production';
import { Head, Link, router } from '@inertiajs/react';
import { Package, User, Calendar, Check, X } from 'lucide-react';
import ItemCategoryFormComponent from '@/components/production/ItemCategoryFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/production/show-layout';
interface Item {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    unit?: {
        id: number;
        name: string;
        abbreviation: string;
    };
}
interface Props {
    category: ItemCategory & {
        createdBy?: {
            id: number;
            name: string;
        };
    };
    items: {
        data: Item[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab: string;
    filters: {
        items: {
            sort: string;
            direction: string;
        };
    };
}
export default function Show({ category, items, activeTab, filters }: Props) {
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
        {
            title: category.name,
            href: '#',
        },
    ];
    const handleSort = (column: string) => {
        const direction = filters.items.sort === column && filters.items.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('production.categories.show', {
                category: category.id,
                tab: activeTab,
                items_sort: column,
                items_direction: direction,
                items_page: 1,
            }),
            {},
            { preserveState: true },
        );
    };
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>{items?.total || 0} itens</span>
            </span>
            {category.createdBy && (
                <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{category.createdBy.name}</span>
                    </span>
                </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(category.created_at).toLocaleDateString('pt-BR')}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                {category.is_active ? (
                    <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Ativa</span>
                    </>
                ) : (
                    <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">Inativa</span>
                    </>
                )}
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <ItemCategoryFormComponent
                        category={category}
                        initialMode="view"
                        onSuccess={() => router.reload()}
                    />
                </div>
            ),
        },
        {
            id: 'itens',
            label: 'Itens',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={items.data as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'code',
                                label: 'Código',
                                sortable: true,
                                width: 'w-[15%]',
                                render: (value, row) => (
                                    <Link
                                        href={route('production.items.show', (row as Record<string, unknown>).id)}
                                        className="hover:text-primary font-medium"
                                    >
                                        {(row as Record<string, unknown>).code as string}
                                    </Link>
                                ),
                            },
                            {
                                key: 'name',
                                label: 'Nome',
                                sortable: true,
                                width: 'w-[35%]',
                                render: (value, row) => (
                                    <div>
                                        <div className="font-medium">{(row as Record<string, unknown>).name as string}</div>
                                        {(row as Record<string, unknown>).description && (
                                            <div className="text-muted-foreground text-sm">{(row as Record<string, unknown>).description as string}</div>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'unit',
                                label: 'Unidade',
                                sortable: true,
                                width: 'w-[15%]',
                                render: (value, row) => {
                                    const unit = ((row as Record<string, unknown>).unit as Record<string, unknown> | undefined);
                                    return unit ? (
                                        <span className="text-muted-foreground text-sm">
                                            {unit.name as string} ({unit.abbreviation as string})
                                        </span>
                                    ) : '-';
                                },
                            },
                            {
                                key: 'is_active',
                                label: 'Status',
                                sortable: true,
                                width: 'w-[15%]',
                                render: (value) => (
                                    <div className="flex items-center justify-center">
                                        {value ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <X className="h-4 w-4 text-red-600" />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        onRowClick={(row) => router.visit(route('production.items.show', (row as Record<string, unknown>).id))}
                        onSort={handleSort}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: items.current_page,
                            last_page: items.last_page,
                            per_page: items.per_page,
                            total: items.total,
                            from: items.current_page > 0 ? (items.current_page - 1) * items.per_page + 1 : null,
                            to: items.current_page > 0 ? Math.min(items.current_page * items.per_page, items.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('production.categories.show', {
                            category: category.id,
                            items_page: page,
                            tab: 'itens',
                            items_sort: filters.items.sort,
                            items_direction: filters.items.direction,
                        }))}
                    />
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Categoria ${category.name}`} />
            <ShowLayout
                title={category.name}
                subtitle={subtitle}
                editRoute="#"
                tabs={tabs}
                defaultActiveTab={activeTab}
            />
        </AppLayout>
    );
}