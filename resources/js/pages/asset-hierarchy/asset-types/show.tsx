import React from 'react';
import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { router } from '@inertiajs/react';
import { Cog, Settings } from 'lucide-react';
import AssetTypeFormComponent from '@/components/AssetTypeFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
interface Props {
    assetType: {
        id: number;
        name: string;
        description: string | null;
        created_at?: string;
        updated_at?: string;
    };
    asset: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}
export default function Show({ assetType, asset }: Props) {
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
            title: 'Tipos de Ativo',
            href: '/asset-hierarchy/asset-types',
        },
        {
            title: assetType.name,
            href: '#',
        },
    ];
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Tipo de Ativo</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{asset.total} ativos</span>
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <AssetTypeFormComponent
                        assetType={assetType as unknown as Parameters<typeof AssetTypeFormComponent>[0]['assetType']}
                        initialMode="view"
                        onSuccess={() => router.reload()}
                    />
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={asset.data as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: false,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <div className="font-medium">{ (row as any).tag}</div>,
                            },
                            {
                                key: 'area',
                                label: 'Área',
                                sortable: false,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <span className="text-muted-foreground text-sm">{ (row as any).area?.name ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturer',
                                label: 'Fabricante',
                                sortable: false,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <span className="text-muted-foreground text-sm">{ (row as any).manufacturer?.name ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturing_year',
                                label: 'Ano',
                                sortable: false,
                                width: 'w-[25%]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as number ?? '-'}</span>,
                            },
                        ]}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onRowClick={(row) => router.visit(route('asset-hierarchy.assets.show',  (row as any).id))}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: asset.current_page,
                            last_page: asset.last_page,
                            per_page: asset.per_page,
                            total: asset.total,
                            from: asset.current_page > 0 ? (asset.current_page - 1) * asset.per_page + 1 : null,
                            to: asset.current_page > 0 ? Math.min(asset.current_page * asset.per_page, asset.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('asset-hierarchy.asset-types.show', {
                            assetType: assetType.id,
                            asset_page: page,
                            tab: 'ativos',
                        }))}
                    />
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout title={assetType.name} subtitle={subtitle} editRoute={route('asset-hierarchy.asset-types.edit', assetType.id)} tabs={tabs} />
        </AppLayout>
    );
}
