import React from 'react';
import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { router } from '@inertiajs/react';
import { Cog, Factory, Map } from 'lucide-react';

import SectorFormComponent from '@/components/SectorFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';

interface Props {
    sector: {
        id: number;
        name: string;
        area: {
            id: number;
            name: string;
            plant: {
                id: number;
                name: string;
            };
        };
        area_id?: number;
    };
    plants?: { id: number; name: string }[];
    asset: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab: string;
    filters: {
        asset: {
            sort: string;
            direction: string;
        };
    };
}

export default function Show({ sector, plants, asset, activeTab, filters }: Props) {
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
            title: 'Setores',
            href: '/asset-hierarchy/sectors',
        },
        {
            title: sector.name,
            href: '#',
        },
    ];

    const handleSort = (column: string) => {
        const direction = filters.asset.sort === column && filters.asset.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('asset-hierarchy.sectors.show', {
                setor: sector.id,
                tab: activeTab,
                asset_sort: column,
                asset_direction: direction,
                asset_page: 1,
            }),
            {},
            { preserveState: true },
        );
    };

    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Factory className="h-4 w-4" />
                <span>{sector.area.plant.name}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>{sector.area.name}</span>
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
                    <SectorFormComponent
                        sector={sector as unknown as Parameters<typeof SectorFormComponent>[0]['sector']}
                        plants={plants || []}
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
                        data={asset.data.map(a => ({ ...a } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: true,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <div className="font-medium">{(row as any).tag}</div>,
                            },
                            {
                                key: 'asset_type_name',
                                label: 'Tipo',
                                sortable: true,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <span className="text-muted-foreground text-sm">{(row as any).asset_type?.name ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturer_name',
                                label: 'Fabricante',
                                sortable: true,
                                width: 'w-[25%]',
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                render: (value, row) => <span className="text-muted-foreground text-sm">{(row as any).manufacturer?.name ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturing_year',
                                label: 'Ano',
                                sortable: true,
                                width: 'w-[25%]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as number ?? '-'}</span>,
                            },
                        ]}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onRowClick={(row) => router.visit(route('asset-hierarchy.assets.show', (row as any).id))}
                        onSort={(columnKey) => {
                            const columnMap: Record<string, string> = {
                                asset_type_name: 'type',
                                manufacturer_name: 'manufacturer',
                                manufacturing_year: 'year',
                            };
                            handleSort(columnMap[columnKey] || columnKey);
                        }}
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
                        onPageChange={(page) => router.get(route('asset-hierarchy.sectors.show', {
                            setor: sector.id,
                            asset_page: page,
                            tab: 'ativos',
                            asset_sort: filters.asset.sort,
                            asset_direction: filters.asset.direction,
                        }))}
                    />
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout title={sector.name} subtitle={subtitle} editRoute={route('asset-hierarchy.sectors.edit', sector.id)} tabs={tabs} />
        </AppLayout>
    );
}
