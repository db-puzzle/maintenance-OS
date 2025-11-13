import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Upload, FileText, Info } from 'lucide-react';

import { ColumnConfig } from '@/types/shared';
import { ManufacturingRoute as Routing } from '@/types/production';
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
        import?: boolean;
        export?: boolean;
    };
}
export default function RoutingTemplatesIndex({
    routings,
    filters,
    can
}: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [infoDialogOpen, setInfoDialogOpen] = useState(false);
    const [deleteRouting, setDeleteRouting] = useState<Routing | null>(null);

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
    const handleDelete = async (routing: Routing) => {
        try {
            await router.delete(window.route('production.routing.destroy', routing.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteRouting(null);
                    // Success message is handled by flash message from backend
                },
            });
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleExport = (format: 'json' | 'csv') => {
        const params = new URLSearchParams();
        params.append('format', format);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        });
        window.open(`${window.route('production.routing.export')}?${params.toString()}`, '_blank');
    };

    const handleImport = () => {
        router.visit(window.route('production.routing.import.wizard'));
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
            key: 'item_category',
            label: 'Categoria de Item',
            sortable: true,
            width: 'w-[200px]',
            render: (value: unknown, row) => {
                return row.item_category ? (
                    <div className="font-medium">{row.item_category.name}</div>
                ) : 'Todos os itens';
            }
        },
        {
            key: 'usage_count',
            label: 'Uso',
            sortable: true,
            width: 'w-[100px]',
            render: (value: unknown) => {
                const count = value as number || 0;
                return (
                    <div className="text-center">
                        <span className={count > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {count} {count === 1 ? 'vez' : 'vezes'}
                        </span>
                    </div>
                );
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
        { title: 'Home', href: '/home' },
        { title: 'Templates de Rotas', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Templates de Rotas de Produção" />
            <ListLayout
                title="Templates de Rotas de Produção"
                description="Gerencie os modelos de roteiros para uso em ordens de produção"
                searchPlaceholder="Buscar por nome, descrição ou categoria..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={can.create ? '#' : undefined}
                onCreateClick={can.create ? () => setInfoDialogOpen(true) : undefined}
                createButtonText="Novo Template de Rota"
                actions={
                    <div className="flex items-center gap-2">
                        {can?.import && (
                            <Button
                                variant="outline"
                                onClick={handleImport}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Importar
                            </Button>
                        )}
                        {can?.export && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Exportar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleExport('json')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Exportar como JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Exportar como CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                }
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
                                onDelete={() => setDeleteRouting(routing as Routing)}
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

            {/* Info Dialog */}
            <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            Como criar templates de rota
                        </DialogTitle>
                        <DialogDescription className="pt-4 space-y-3 text-base">
                            <p>
                                Os templates de rota são criados automaticamente na <strong>página de Planejamento de Ordens de Produção</strong>.
                            </p>
                            <p>
                                Para criar um novo template:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 pl-2">
                                <li>Acesse a página de Planejamento</li>
                                <li>Crie ou edite uma rota de produção</li>
                                <li>Clique no botão <strong>"Salvar Rota como Template"</strong></li>
                            </ol>
                            <p className="text-muted-foreground pt-2">
                                O template ficará disponível aqui para ser reutilizado em futuras ordens de produção.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setInfoDialogOpen(false)}
                        >
                            Entendi
                        </Button>
                        <Button
                            onClick={() => {
                                setInfoDialogOpen(false);
                                router.visit(window.route('production.planning.index'));
                            }}
                        >
                            Ir para Planejamento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Routing Dialog */}
            {deleteRouting && (
                <EntityDeleteDialog
                    open={!!deleteRouting}
                    onOpenChange={(open) => !open && setDeleteRouting(null)}
                    onConfirm={() => handleDelete(deleteRouting)}
                    entityLabel={`modelo de roteiro "${deleteRouting.name}"`}
                />
            )}
        </AppLayout>
    );
} 