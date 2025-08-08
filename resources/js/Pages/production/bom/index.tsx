import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { GitBranch, Copy, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import AppLayout from '@/layouts/app-layout';
import { ColumnConfig } from '@/types/shared';
import { BillOfMaterial } from '@/types/production';

interface Props {
    boms: {
        data: BillOfMaterial[];
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
        sort?: string;
        direction?: 'asc' | 'desc';
    };
}

export default function BomIndex({ boms, filters }: Props) {
    const { props: { auth } } = usePage<{ auth: { permissions: string[] } }>();
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [deleteBom, setDeleteBom] = useState<BillOfMaterial | null>(null);
    const [deletingBom, setDeletingBom] = useState<number | null>(null);
    const [cloneBom, setCloneBom] = useState<BillOfMaterial | null>(null);
    
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.bom.index'), { search: value }, {
            preserveState: true,
            preserveScroll: true,
            only: ['boms']
        });
    };
    
    const handlePageChange = (page: number) => {
        router.get(route('production.bom.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    
    const handlePerPageChange = (perPage: number) => {
        router.get(route('production.bom.index'), { ...filters, per_page: perPage }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    
    const handleSort = (column: string) => {
        router.get(route('production.bom.index'), { 
            ...filters, 
            sort: column,
            direction: filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc'
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    
    // Use data from server
    const data = boms.data;
    const pagination = {
        current_page: boms.current_page,
        last_page: boms.last_page,
        per_page: boms.per_page,
        total: boms.total,
        from: boms.from,
        to: boms.to,
    };
    
    const handleDelete = async (bom: BillOfMaterial) => {
        setDeletingBom(bom.id);
        try {
            await router.delete(route('production.bom.destroy', bom.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteBom(null);
                    setDeletingBom(null);
                },
                onError: () => {
                    console.error('Failed to delete BOM');
                    setDeletingBom(null);
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
            setDeletingBom(null);
        }
    };
    
    const handleDuplicate = (bom: BillOfMaterial) => {
        router.post(route('production.bom.duplicate', bom.id), {}, {
            preserveScroll: true
        });
    };
    
    const handleExport = (bom: BillOfMaterial) => {
        window.open(route('production.bom.export', bom.id), '_blank');
    };
    
    const columns: ColumnConfig[] = [
        {
            key: 'bom_number',
            label: 'Número',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown) => <>{value || '-'}</>
        },
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value: unknown, row: Record<string, unknown>) => (
                <div>
                    <div className="font-medium">{value as React.ReactNode}</div>
                    {row.description ? (
                        <div className="text-muted-foreground text-sm">
                            {(row.description as string).length > 40 ? `${(row.description as string).substring(0, 40)}...` : row.description as React.ReactNode}
                        </div>
                    ) : null}
                </div>
            )
        },
        {
            key: 'version',
            label: 'Versão',
            width: 'w-[100px]',
            render: (value: unknown, row: Record<string, unknown>) => {
                const bomRow = row as unknown as BillOfMaterial;
                const currentVersion = bomRow.current_version?.version_number;
                return currentVersion ? `v${currentVersion}` : '-';
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value: unknown) => {
                const labels: Record<string, string> = {
                    'active': 'Ativa',
                    'inactive': 'Inativa',
                    'draft': 'Rascunho'
                };
                return <>{labels[value as string] || value || '-'}</>;
            }
        },
        {
            key: 'versions_count',
            label: 'Versões',
            width: 'w-[100px]',
            render: (value: unknown, row: Record<string, unknown>) => <>{(row as unknown as BillOfMaterial).versions_count || 0}</>
        },
        {
            key: 'item_masters_count',
            label: 'Componentes',
            width: 'w-[120px]',
            render: (value: unknown, row: Record<string, unknown>) => <>{(row as any).item_masters_count || 0}</>
        }
    ];
    
    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'BOMs', href: '' }
    ];
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Bills of Materials"
                description="Gerencie estruturas de produtos e montagens"
                searchPlaceholder="Buscar por número ou nome..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={route('production.bom.create')}
                createButtonText="Nova BOM"
                actions={
                    <Button variant="outline" onClick={() => router.visit(route('production.bom.import.wizard'))}>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar
                    </Button>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data as unknown as Array<Record<string, unknown>>}
                        columns={columns}
                        loading={false}
                        emptyMessage="Nenhuma Lista de Materiais encontrada."
                        onRowClick={(bom) => router.visit(route('production.bom.show', (bom as unknown as BillOfMaterial).id))}
                        onSort={handleSort}
                        actions={(bom) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(route('production.bom.show', (bom as unknown as BillOfMaterial).id))}
                                onDelete={() => setDeleteBom(bom as unknown as BillOfMaterial)}
                                additionalActions={[
                                    {
                                        label: 'Clonar',
                                        icon: <Copy className="h-4 w-4" />,
                                        onClick: () => handleDuplicate(bom as unknown as BillOfMaterial)
                                    },
                                    {
                                        label: 'Exportar',
                                        icon: <Download className="h-4 w-4" />,
                                        onClick: () => handleExport(bom as unknown as BillOfMaterial)
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
            
            {deleteBom && (
                <EntityDeleteDialog
                    open={!!deleteBom}
                    onOpenChange={(open) => !open && setDeleteBom(null)}
                    onConfirm={() => handleDelete(deleteBom)}
                    title="Excluir Lista de Materiais"
                    description={`Tem certeza que deseja excluir a Lista de Materiais "${deleteBom.bom_number}"?`}
                />
            )}
        </AppLayout>
    );
}
