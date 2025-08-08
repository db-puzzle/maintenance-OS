import React from 'react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MapComponent from '@/components/map';
import PlantFormComponent from '@/components/PlantFormComponent';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, Cog, Map } from 'lucide-react';
interface Plant {
    id: number;
    name: string;
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    gps_coordinates?: string;
}
interface Area {
    id: number;
    name: string;
    plant_id: number;
    asset_count: number;
    sectors_count: number;
}
interface Props {
    plant: Plant;
    areas: {
        data: Area[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    sectors: {
        data: {
            id: number;
            name: string;
            description: string | null;
            asset_count: number;
            area: {
                id: number;
                name: string;
            };
        }[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    asset: {
        data: {
            id: number;
            tag: string;
            asset_type: {
                id: number;
                name: string;
            } | null;
            manufacturer: string | null;
            manufacturing_year: number | null;
            area_name: string;
            sector_name: string | null;
        }[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    totalSectors: number;
    totalAsset: number;
    activeTab: string;
    filters: {
        areas: {
            sort: string;
            direction: string;
        };
        sectors: {
            sort: string;
            direction: string;
        };
        asset: {
            sort: string;
            direction: string;
        };
    };
}
export default function ShowPlant({ plant, areas, sectors, asset, totalSectors, totalAsset, activeTab, filters }: Props) {
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
            title: 'Plantas',
            href: '/asset-hierarchy/plants',
        },
        {
            title: plant.name,
            href: '#',
        },
    ];
    const handleEditSuccess = () => {
        // Reload the page to refresh the data
        router.reload();
    };
    const handleSort = (section: 'areas' | 'sectors' | 'asset', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('asset-hierarchy.plants.show', {
                plant: plant.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1,
            }),
            {},
            { preserveState: true },
        );
    };
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>{areas.total} áreas</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{totalSectors} setores</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{totalAsset} ativos</span>
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <PlantFormComponent plant={plant} initialMode="view" onSuccess={handleEditSuccess} />
                </div>
            ),
        },
        {
            id: 'mapa',
            label: 'Mapa',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Localização</CardTitle>
                        <CardDescription>Mapa com a localização da planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MapComponent coordinates={plant.gps_coordinates || null} />
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'areas',
            label: 'Áreas',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={areas.data.map(area => ({ ...area } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'name',
                                label: 'Nome',
                                sortable: true,
                                width: 'w-[300px]',
                                render: (value, row) => <div className="font-medium">{(row as Record<string, unknown>).name as React.ReactNode}</div>,
                            },
                            {
                                key: 'asset_count',
                                label: 'Ativos',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <div className="text-center">{value as number || 0}</div>,
                            },
                            {
                                key: 'sectors_count',
                                label: 'Setores',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <div className="text-center">{value as number || 0}</div>,
                            },
                        ]}
                        onRowClick={(row) => router.visit(route('asset-hierarchy.areas.show', { id: (row as Record<string, unknown>).id }))}
                        onSort={(columnKey) => handleSort('areas', columnKey)}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: areas.current_page,
                            last_page: areas.last_page,
                            per_page: areas.per_page,
                            total: areas.total,
                            from: areas.current_page > 0 ? (areas.current_page - 1) * areas.per_page + 1 : null,
                            to: areas.current_page > 0 ? Math.min(areas.current_page * areas.per_page, areas.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('asset-hierarchy.plants.show', {
                            plant: plant.id,
                            areas_page: page,
                            tab: 'areas',
                            areas_sort: filters.areas.sort,
                            areas_direction: filters.areas.direction,
                        }))}
                    />
                </div>
            ),
        },
        {
            id: 'setores',
            label: 'Setores',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={sectors.data as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'name',
                                label: 'Nome',
                                sortable: true,
                                width: 'w-[300px]',
                                render: (value, row) => {
                                    const sector = row as { name: string; description?: string };
                                    return (
                                        <div>
                                            <div className="font-medium">{sector.name}</div>
                                            {sector.description && <div className="text-muted-foreground text-sm">{sector.description}</div>}
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'area',
                                label: 'Área',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value, row) => {
                                     
                                    const sector = row as { area?: { name?: string } };
                                    return sector.area?.name || '-';
                                },
                            },
                            {
                                key: 'asset_count',
                                label: 'Ativos',
                                sortable: true,
                                width: 'w-[100px]',
                                render: (value) => <div className="text-center">{value as number || 0}</div>,
                            },
                        ]}
                        onRowClick={(row) => router.visit(route('asset-hierarchy.sectors.show', { id: (row as Record<string, unknown>).id }))}
                        onSort={(columnKey) => handleSort('sectors', columnKey)}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: sectors.current_page,
                            last_page: sectors.last_page,
                            per_page: sectors.per_page,
                            total: sectors.total,
                            from: sectors.current_page > 0 ? (sectors.current_page - 1) * sectors.per_page + 1 : null,
                            to: sectors.current_page > 0 ? Math.min(sectors.current_page * sectors.per_page, sectors.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('asset-hierarchy.plants.show', {
                            plant: plant.id,
                            sectors_page: page,
                            tab: 'setores',
                            sectors_sort: filters.sectors.sort,
                            sectors_direction: filters.sectors.direction,
                        }))}
                    />
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <div className="mt-4 space-y-4">
                    <EntityDataTable
                        data={asset.data as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: true,
                                width: 'w-[300px]',
                                 
                                render: (value, row) => <div className="font-medium">{(row as { tag?: string }).tag}</div>,
                            },
                            {
                                key: 'asset_type_name',
                                label: 'Tipo',
                                sortable: true,
                                width: 'w-[200px]',
                                 
                                render: (value, row) => <span className="text-muted-foreground text-sm">{(row as { asset_type?: { name?: string } }).asset_type?.name ?? '-'}</span>,
                            },
                            {
                                key: 'location',
                                label: 'Localização',
                                sortable: true,
                                width: 'w-[250px]',
                                render: (value, row) => {
                                     
                                    const item = row as { area_name?: string; sector_name?: string };
                                    return (
                                        <span className="text-muted-foreground text-sm">
                                            {item.area_name}
                                            {item.sector_name && ` / ${item.sector_name}`}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'manufacturer',
                                label: 'Fabricante',
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
                        onRowClick={(row) => router.visit(route('asset-hierarchy.assets.show', { id: (row as Record<string, unknown>).id }))}
                        onSort={(columnKey) => {
                            const columnMap: Record<string, string> = {
                                asset_type_name: 'type',
                                location: 'location',
                                manufacturing_year: 'year',
                            };
                            handleSort('asset', columnMap[columnKey] || columnKey);
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
                        onPageChange={(page) => router.get(route('asset-hierarchy.plants.show', {
                            plant: plant.id,
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
            <Head title={`Planta ${plant.name}`} />
            <ShowLayout title={plant.name} subtitle={subtitle} editRoute="" tabs={tabs} />
        </AppLayout>
    );
}
