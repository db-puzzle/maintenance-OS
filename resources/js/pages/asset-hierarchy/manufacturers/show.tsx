import React from 'react';
import ManufacturerFormComponent from '@/components/ManufacturerFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
interface AssetData {
    id: number;
    tag: string;
    description: string;
    serial_number: string | null;
    part_number: string | null;
    asset_type: string | null | { id: number; name: string };
    plant: string | null | { id: number; name: string };
    area: string | null | { id: number; name: string };
    sector: string | null | { id: number; name: string };
    manufacturer: string | null;
    manufacturing_year: number | null;
    area_name?: string;
    sector_name?: string | null;
}
interface ManufacturerData {
    id: number;
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    notes?: string | null;
    assets_count?: number;
    assets?: AssetData[]; // For backward compatibility
}
interface Props {
    manufacturer: ManufacturerData;
    assets?: {
        data: AssetData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab?: string;
    filters?: {
        assets: {
            sort: string;
            direction: string;
        };
    };
}
export default function Show({ manufacturer, assets, activeTab = 'informacoes', filters = { assets: { sort: 'tag', direction: 'asc' } } }: Props) {
    // Handle backward compatibility - if assets is not provided, use the old structure
    const assetsData = assets || {
        data: manufacturer.assets || [],
        current_page: 1,
        last_page: 1,
        per_page: manufacturer.assets?.length || 0,
        total: manufacturer.assets?.length || 0,
    };
    // Helper function to extract name from string or object
    const getNameFromValue = (value: string | null | { id: number; name: string }): string => {
        if (!value) return '-';
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && 'name' in value) return value.name;
        return '-';
    };
    const handleSort = (column: string) => {
        const direction = filters.assets.sort === column && filters.assets.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('asset-hierarchy.manufacturers.show', {
                manufacturer: manufacturer.id,
                tab: activeTab,
                assets_sort: column,
                assets_direction: direction,
                assets_page: 1,
            }),
            {},
            { preserveState: true },
        );
    };
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
            title: 'Fabricantes',
            href: '/asset-hierarchy/manufacturers',
        },
        {
            title: manufacturer.name,
            href: '#',
        },
    ];
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <ManufacturerFormComponent manufacturer={manufacturer} initialMode="view" onSuccess={() => router.reload()} />
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <div className="mt-4 space-y-4">
                    <EntityDataTable
                        data={assetsData.data.map(asset => ({
                            ...asset,
                            // Ensure backward compatibility - transform old structure to new
                            asset_type: typeof asset.asset_type === 'object' ? asset.asset_type : { name: asset.asset_type },
                            area_name: asset.area_name || getNameFromValue(asset.area),
                            sector_name: asset.sector_name || getNameFromValue(asset.sector),
                        })) as unknown as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: true,
                                width: 'w-[300px]',
                                 
                                render: (value, row) => <div className="font-medium">{(row as AssetData).tag}</div>,
                            },
                            {
                                key: 'asset_type_name',
                                label: 'Tipo',
                                sortable: true,
                                width: 'w-[200px]',
                                 
                                render: (value, row) => <span className="text-muted-foreground text-sm">{(row as AssetData).description || '-'}</span>,
                            },
                            {
                                key: 'location',
                                label: 'Localização',
                                sortable: true,
                                width: 'w-[250px]',
                                render: (value, row) => {
                                     
                                    const item = row as AssetData;
                                    return (
                                        <span className="text-muted-foreground text-sm">
                                            {item.area_name}
                                            {item.sector_name && ` / ${item.sector_name}`}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'serial_number',
                                label: 'Número Serial',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as string ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturing_year',
                                label: 'Ano',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as number ?? '-'}</span>,
                            },
                        ]}
                         
                        onRowClick={(row) => router.get(route('asset-hierarchy.assets.show',  (row as unknown).id))}
                        onSort={(columnKey) => {
                            const columnMap: Record<string, string> = {
                                asset_type_name: 'type',
                                location: 'location',
                                manufacturing_year: 'year',
                            };
                            handleSort(columnMap[columnKey] || columnKey);
                        }}
                    />
                    {assetsData.last_page > 1 && (
                        <EntityPagination
                            pagination={{
                                current_page: assetsData.current_page,
                                last_page: assetsData.last_page,
                                per_page: assetsData.per_page,
                                total: assetsData.total,
                                from: assetsData.current_page > 0 ? (assetsData.current_page - 1) * assetsData.per_page + 1 : null,
                                to: assetsData.current_page > 0 ? Math.min(assetsData.current_page * assetsData.per_page, assetsData.total) : null,
                            }}
                            onPageChange={(page) => router.get(route('asset-hierarchy.manufacturers.show', {
                                manufacturer: manufacturer.id,
                                assets_page: page,
                                tab: 'ativos',
                                assets_sort: filters.assets.sort,
                                assets_direction: filters.assets.direction,
                            }))}
                        />
                    )}
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Fabricante ${manufacturer.name}`} />
            <ShowLayout
                title={manufacturer.name}
                subtitle={`${assetsData.total || 0} ativo(s) associado(s)`}
                editRoute=""
                tabs={tabs}
                defaultActiveTab={activeTab}
            />
        </AppLayout>
    );
}
