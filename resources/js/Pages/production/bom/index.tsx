import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { GitBranch, Copy, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
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
    };
}

export default function BomIndex({ boms, filters }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [deleteBom, setDeleteBom] = useState<BillOfMaterial | null>(null);
    const [loading, setLoading] = useState(false);

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

    const handleDelete = async () => {
        if (!deleteBom) return;

        try {
            await router.delete(route('production.bom.destroy', deleteBom.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteBom(null);
                },
                onError: () => {
                    console.error('Failed to delete BOM');
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
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
            render: (value: any) => value || '-'
        },
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value: any, bom: any) => (
                <div>
                    <div className="font-medium">{value}</div>
                    {bom.description && (
                        <div className="text-muted-foreground text-sm">
                            {bom.description.length > 40 ? `${bom.description.substring(0, 40)}...` : bom.description}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'version',
            label: 'Versão',
            width: 'w-[100px]',
            render: (value: any, bom: any) => {
                const currentVersion = bom.current_version?.version_number;
                return currentVersion ? `v${currentVersion}` : '-';
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value: any) => {
                const labels: Record<string, string> = {
                    'active': 'Ativa',
                    'inactive': 'Inativa',
                    'draft': 'Rascunho'
                };
                return labels[value] || value || '-';
            }
        },
        {
            key: 'versions_count',
            label: 'Versões',
            width: 'w-[100px]',
            render: (value: any, bom: any) => bom.versions_count || 0
        },
        {
            key: 'item_masters_count',
            label: 'Componentes',
            width: 'w-[120px]',
            render: (value: any, bom: any) => bom.item_masters_count || 0
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
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={loading}
                        onRowClick={(bom: any) => router.visit(route('production.bom.show', bom.id))}
                        actions={(bom: any) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(route('production.bom.edit', bom.id))}
                                onDelete={() => setDeleteBom(bom as BillOfMaterial)}
                                additionalActions={[
                                    {
                                        label: 'Ver Hierarquia',
                                        icon: <GitBranch className="h-4 w-4" />,
                                        onClick: () => router.visit(route('production.bom.hierarchy', bom.id))
                                    },
                                    {
                                        label: 'Duplicar',
                                        icon: <Copy className="h-4 w-4" />,
                                        onClick: () => handleDuplicate(bom as BillOfMaterial)
                                    },
                                    {
                                        label: 'Exportar',
                                        icon: <Download className="h-4 w-4" />,
                                        onClick: () => handleExport(bom as BillOfMaterial)
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

            <EntityDeleteDialog
                open={!!deleteBom}
                onOpenChange={(open) => !open && setDeleteBom(null)}
                entityLabel={deleteBom ? `a BOM ${deleteBom.name}` : ''}
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}

