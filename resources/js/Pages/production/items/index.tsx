import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Package, History, GitBranch } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import CreateItemSheet from '@/components/CreateItemSheet';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import AppLayout from '@/layouts/app-layout';
import { ColumnConfig } from '@/types/shared';
import { Item } from '@/types/production';
import { Link } from '@inertiajs/react';

interface Props {
    items: {
        data: Item[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
}

const itemTypeLabels: Record<string, string> = {
    manufactured: 'Manufaturado',
    purchased: 'Comprado',
    'manufactured-purchased': 'Manufaturado/Comprado'
};

export default function ItemsIndex({ items, filters }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [deleteItem, setDeleteItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(false);
    const [editItem, setEditItem] = useState<Item | null>(null);

    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.items.index'), { search: value }, {
            preserveState: true,
            preserveScroll: true,
            only: ['items']
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('production.items.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('production.items.index'), { ...filters, per_page: perPage }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    // Use data from server
    const data = items.data;
    const pagination = {
        current_page: items.current_page,
        last_page: items.last_page,
        per_page: items.per_page,
        total: items.total,
        from: items.from,
        to: items.to,
    };

    const handleDelete = async () => {
        if (!deleteItem) return;

        try {
            await router.delete(route('production.items.destroy', deleteItem.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteItem(null);
                },
                onError: () => {
                    console.error('Failed to delete item');
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleEditSuccess = () => {
        setEditItem(null);
        router.reload({ only: ['items'] });
    };

    const columns: ColumnConfig[] = [
        {
            key: 'item_number',
            label: 'Número',
            sortable: true,
            width: 'w-[150px]',
            render: (value: any) => value || '-'
        },
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value: any, item: any) => (
                <div>
                    <div className="font-medium">{value}</div>
                    {item.category && (
                        <div className="text-muted-foreground text-sm">
                            {item.category.length > 40 ? `${item.category.substring(0, 40)}...` : item.category}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'item_type',
            label: 'Tipo',
            sortable: true,
            width: 'w-[150px]',
            render: (value: any) => itemTypeLabels[value as string] || value || '-'
        },
        {
            key: 'capabilities',
            label: 'Capacidades',
            width: 'w-[200px]',
            render: (value: any, item: any) => {
                const capabilities = [];
                if (item.can_be_sold) capabilities.push('Vendável');
                if (item.can_be_manufactured) capabilities.push('Manufaturável');
                if (item.can_be_purchased) capabilities.push('Comprável');
                return capabilities.length > 0 ? capabilities.join(', ') : '-';
            }
        },
        {
            key: 'current_bom',
            label: 'BOM Atual',
            width: 'w-[150px]',
            render: (value: any, item: any) => (
                item.current_bom && item.can_be_manufactured ? (
                    <Link
                        href={route('production.bom.show', item.current_bom_id)}
                        className="text-primary hover:underline"
                    >
                        {item.current_bom.bom_number}
                    </Link>
                ) : (
                    '-'
                )
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value: any) => {
                const labels: Record<string, string> = {
                    'active': 'Ativo',
                    'inactive': 'Inativo',
                    'prototype': 'Protótipo',
                    'discontinued': 'Descontinuado'
                };
                return labels[value] || value || '-';
            }
        }
    ];

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Itens', href: '' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Itens"
                description="Gerencie o catálogo de itens de manufatura, compra e venda"
                searchPlaceholder="Buscar por número ou nome do item..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={route('production.items.create')}
                createButtonText="Novo Item"
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={loading}
                        onRowClick={(item) => router.visit(route('production.items.show', (item as any).id))}
                        actions={(item) => (
                            <EntityActionDropdown
                                onEdit={() => setEditItem(item as any)}
                                onDelete={() => setDeleteItem(item as any)}
                                additionalActions={[
                                    ...((item as any).can_be_manufactured ? [
                                        {
                                            label: 'Gerenciar BOM',
                                            icon: <Package className="h-4 w-4" />,
                                            onClick: () => router.visit(route('production.items.bom', (item as any).id))
                                        },
                                        {
                                            label: 'Histórico de BOM',
                                            icon: <History className="h-4 w-4" />,
                                            onClick: () => router.visit(route('production.items.bom-history', (item as any).id))
                                        }
                                    ] : []),
                                    {
                                        label: 'Onde é Usado',
                                        icon: <GitBranch className="h-4 w-4" />,
                                        onClick: () => router.visit(route('production.items.where-used', (item as any).id))
                                    }
                                ]}
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

            {editItem && (
                <CreateItemSheet
                    item={editItem}
                    open={!!editItem}
                    onOpenChange={(open) => !open && setEditItem(null)}
                    mode="edit"
                    onSuccess={handleEditSuccess}
                />
            )}

            <EntityDeleteDialog
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                entityLabel={deleteItem ? `o item ${deleteItem.name}` : ''}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}

