import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type Plant } from '@/types/asset-hierarchy';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Cog, MapPin } from 'lucide-react';
import AreaFormComponent from '@/components/AreaFormComponent';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
interface Sector {
    id: number;
    name: string;
    description: string | null;
    asset_count: number;
}
interface Props {
    area: {
        id: number;
        name: string;
        factory_id?: number;
        parent_area_id?: number;
        created_at?: string;
        updated_at?: string;
        plant: {
            id: number;
            name: string;
        };
    };
    plants?: Plant[];
    sectors: {
        data: Sector[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    asset: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    totalAssetCount: number;
    activeTab: string;
    filters: {
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
export default function Show({ area, plants, sectors, asset, totalAssetCount, activeTab, filters }: Props) {
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
            title: 'Áreas',
            href: '/asset-hierarchy/areas',
        },
        {
            title: area.name,
            href: '#',
        },
    ];
    const handleSort = (section: 'sectors' | 'asset', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('asset-hierarchy.areas.show', {
                area: area.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1,
            }),
            {},
            { preserveState: true },
        );
    };
    // Verificações de segurança para evitar erros de undefined
    if (!area || !area.plant) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <ShowLayout title="Carregando..." editRoute="#" tabs={[]}>
                    <div>Carregando informações da área...</div>
                </ShowLayout>
            </AppLayout>
        );
    }
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{area.plant.name}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{sectors?.total || 0} setores</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{totalAssetCount || 0} ativos</span>
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <AreaFormComponent
                        area={area as Area & { plant: Plant }}
                        plants={plants || []}
                        initialMode="view"
                        onSuccess={() => router.reload()}
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
                        data={sectors.data.map(sector => ({ ...sector } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'name',
                                label: 'Nome',
                                sortable: true,
                                width: 'w-[30%]',
                                render: (value, row) => (
                                    <Link
                                        href={route('asset-hierarchy.sectors.show', { id: (row as Record<string, unknown>).id })}
                                        className="hover:text-primary font-medium"
                                    >
                                        {(row as Record<string, unknown>).name as string}
                                    </Link>
                                ),
                            },
                            {
                                key: 'asset_count',
                                label: 'Ativos',
                                sortable: true,
                                width: 'w-[15%]',
                                render: (value) => <div className="text-center">{value as number}</div>,
                            },
                            {
                                key: 'description',
                                label: 'Descrição',
                                sortable: true,
                                width: 'w-[55%]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as string ?? '-'}</span>,
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
                        onPageChange={(page) => router.get(route('asset-hierarchy.areas.show', {
                            area: area.id,
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
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={asset.data.map(a => ({ ...a } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: true,
                                width: 'w-[25%]',
                                render: (value, row) => (
                                    <Link
                                        href={route('asset-hierarchy.assets.show', { id: (row as Record<string, unknown>).id })}
                                        className="hover:text-primary font-medium"
                                    >
                                        {(row as Record<string, unknown>).tag as string}
                                    </Link>
                                ),
                            },
                            {
                                key: 'asset_type_name',
                                label: 'Tipo',
                                sortable: true,
                                width: 'w-[25%]',
                                render: (value, row) => <span className="text-muted-foreground text-sm">{((row as Record<string, unknown>).asset_type as Record<string, unknown> | undefined)?.name as string ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturer_name',
                                label: 'Fabricante',
                                sortable: true,
                                width: 'w-[25%]',
                                render: (value, row) => <span className="text-muted-foreground text-sm">{((row as Record<string, unknown>).manufacturer as Record<string, unknown> | undefined)?.name as string ?? '-'}</span>,
                            },
                            {
                                key: 'manufacturing_year',
                                label: 'Ano',
                                sortable: true,
                                width: 'w-[25%]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as number ?? '-'}</span>,
                            },
                        ]}
                        onRowClick={(row) => router.visit(route('asset-hierarchy.assets.show', { id: (row as Record<string, unknown>).id }))}
                        onSort={(columnKey) => {
                            const columnMap: Record<string, string> = {
                                asset_type_name: 'type',
                                manufacturer_name: 'manufacturer',
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
                        onPageChange={(page) => router.get(route('asset-hierarchy.areas.show', {
                            area: area.id,
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
            <Head title={`Área ${area.name}`} />
            <ShowLayout title={area.name} subtitle={subtitle} editRoute={route('asset-hierarchy.areas.edit', area.id)} tabs={tabs} />
        </AppLayout>
    );
}
