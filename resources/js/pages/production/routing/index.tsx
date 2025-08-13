import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';

import { ColumnConfig } from '@/types/shared';
import { ManufacturingRoute as Routing } from '@/types/production';
import { toast } from 'sonner';
interface Props {
    routings: {
        data: Routing[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    filters: {
        search?: string;
        per_page?: number;
    };
    can: {
        create?: boolean;
    };
}
export default function RoutingIndex({ routings, filters, can }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(
            window.route('production.routing.index'),
            { ...filters, search: value, page: 1 },
            { preserveState: true, replace: true }
        );
    };
    const handlePageChange = (page: number) => {
        router.get(
            window.route('production.routing.index'),
            { ...filters, page },
            { preserveState: true, replace: true }
        );
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            window.route('production.routing.index'),
            { ...filters, per_page: perPage, page: 1 },
            { preserveState: true, replace: true }
        );
    };
    const handleDelete = (routing: Routing) => {
        if (confirm(`Tem certeza que deseja excluir o roteiro ${routing.name}?`)) {
            router.delete(window.route('production.routing.destroy', routing.id), {
                onSuccess: () => {
                    toast.success('Roteiro excluído com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao excluir roteiro');
                }
            });
        }
    };
    const columns: ColumnConfig<Routing>[] = [
        {
            key: 'name',
            label: 'Nome do Roteiro',
            sortable: true,
            width: 'w-[300px]',
            render: (value: unknown, row) => {
                return (
                    <div>
                        <div className="font-medium">{row.name}</div>
                        {row.description && (
                            <div className="text-muted-foreground text-sm">
                                {row.description.length > 40 ? `${row.description.substring(0, 40)}...` : row.description}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'manufacturing_order',
            label: 'Ordem de Produção',
            sortable: true,
            width: 'w-[200px]',
            render: (value: unknown, row) => {
                return row.manufacturing_order ? (
                    <Link
                        href={window.window.route('production.orders.show', row.manufacturing_order.id)}
                        className="text-primary hover:underline"
                    >
                        {row.manufacturing_order.order_number}
                    </Link>
                ) : '-';
            }
        },
        {
            key: 'item',
            label: 'Item',
            sortable: true,
            width: 'w-[250px]',
            render: (value: unknown, row) => {
                return row.item ? (
                    <div>
                        <div className="font-medium">{row.item.item_number}</div>
                        <div className="text-muted-foreground text-sm">
                            {row.item.name?.length > 40
                                ? `${row.item.name.substring(0, 40)}...`
                                : row.item.name || '-'}
                        </div>
                    </div>
                ) : '-';
            }
        },
        {
            key: 'steps_count',
            label: 'Etapas',
            sortable: true,
            width: 'w-[100px]',
            render: (value: unknown) => {
                return value as number ?? 0;
            }
        },
        {
            key: 'description',
            label: 'Descrição',
            sortable: true,
            width: 'w-[300px]',
            render: (value: unknown, row) => {
                return row.description ? (
                    row.description.length > 50
                        ? `${row.description.substring(0, 50)}...`
                        : row.description
                ) : '-';
            }
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            width: 'w-[100px]',
            render: (value: unknown) => {
                return value ? 'Ativo' : 'Inativo';
            }
        }
    ];
    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Roteiros', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roteiros de Produção" />
            <ListLayout
                title="Roteiros de Produção"
                description="Gerencie os roteiros de fabricação e processos"
                searchPlaceholder="Buscar por número, nome ou item..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={can.create ? window.route('production.routing.create') : undefined}
                createButtonText="Novo Roteiro"
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={routings.data || []}
                        columns={columns}
                        loading={false}
                        onRowClick={(routing) => router.visit(window.route('production.routing.show', (routing as Routing).id))}
                        actions={(routing) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(window.route('production.routing.edit', (routing as Routing).id))}
                                onDelete={() => handleDelete(routing as Routing)}
                            />
                        )}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: routings.current_page || 1,
                            last_page: routings.last_page || 1,
                            per_page: routings.per_page || 10,
                            total: routings.total || 0,
                            from: routings.from || 0,
                            to: routings.to || 0
                        }}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>
        </AppLayout>
    );
} 