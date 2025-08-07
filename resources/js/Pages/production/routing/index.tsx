import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Button } from '@/components/ui/button';
import { ColumnConfig } from '@/types/shared';
import { toast } from 'sonner';
interface Props {
    routings: any;
    filters: any;
    can: any;
}
export default function RoutingIndex({ routings, filters, can }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(
            route('production.routing.index'),
            { ...filters, search: value, page: 1 },
            { preserveState: true, replace: true }
        );
    };
    const handlePageChange = (page: number) => {
        router.get(
            route('production.routing.index'),
            { ...filters, page },
            { preserveState: true, replace: true }
        );
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('production.routing.index'),
            { ...filters, per_page: perPage, page: 1 },
            { preserveState: true, replace: true }
        );
    };
    const handleDelete = (routing: any) => {
        if (confirm(`Tem certeza que deseja excluir o roteiro ${routing.name}?`)) {
            router.delete(route('production.routing.destroy', routing.id), {
                onSuccess: () => {
                    toast.success('Roteiro excluído com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao excluir roteiro');
                }
            });
        }
    };
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome do Roteiro',
            sortable: true,
            width: 'w-[300px]',
            render: (value: unknown, row: Record<string, unknown>) => {
                const routing = row as any;
                return (
                    <div>
                        <div className="font-medium">{routing.name}</div>
                        {routing.description && (
                            <div className="text-muted-foreground text-sm">
                                {routing.description.length > 40 ? `${routing.description.substring(0, 40)}...` : routing.description}
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
            render: (value: unknown, row: Record<string, unknown>) => {
                const routing = row as any;
                return routing.manufacturing_order ? (
                    <Link
                        href={route('production.orders.show', routing.manufacturing_order.id)}
                        className="text-primary hover:underline"
                    >
                        {routing.manufacturing_order.order_number}
                    </Link>
                ) : '-';
            }
        },
        {
            key: 'item',
            label: 'Item',
            sortable: true,
            width: 'w-[250px]',
            render: (value: unknown, row: Record<string, unknown>) => {
                const routing = row as any;
                return routing.item ? (
                    <div>
                        <div className="font-medium">{routing.item.item_number}</div>
                        <div className="text-muted-foreground text-sm">
                            {routing.item.name?.length > 40
                                ? `${routing.item.name.substring(0, 40)}...`
                                : routing.item.name || '-'}
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
            render: (value: unknown, row: Record<string, unknown>) => {
                const routing = row as any;
                return routing.description ? (
                    routing.description.length > 50
                        ? `${routing.description.substring(0, 50)}...`
                        : routing.description
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
                createRoute={can.create ? route('production.routing.create') : undefined}
                createButtonText="Novo Roteiro"
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={(routings.data || []) as any}
                        columns={columns}
                        loading={false}
                        onRowClick={(routing: any) => router.visit(route('production.routing.show', routing.id))}
                        actions={(routing: any) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(route('production.routing.edit', routing.id))}
                                onDelete={() => handleDelete(routing)}
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