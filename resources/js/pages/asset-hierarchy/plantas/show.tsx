import { type BreadcrumbItem } from '@/types';
import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Cog, Map } from 'lucide-react';

import MapComponent from '@/components/map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Plantas',
        href: '/asset-hierarchy/plantas',
    },
    {
        title: 'Detalhes da Planta',
        href: '#',
    },
];

interface Plant {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
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
    const handleSort = (section: 'areas' | 'sectors' | 'asset', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('asset-hierarchy.plantas.show', {
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

    const getSortIcon = (section: 'areas' | 'sectors' | 'asset', column: string) => {
        if (filters[section].sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters[section].direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    const subtitle = (
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span>{areas.total} áreas</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{totalSectors} setores</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{totalAsset} ativos</span>
            </div>
        </div>
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Gerais</CardTitle>
                        <CardDescription>Informações básicas sobre a planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Nome</Label>
                                <div className="text-muted-foreground text-sm">{plant.name}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="address">Endereço</Label>
                                <div className="text-muted-foreground text-sm">
                                    {plant.street}, {plant.number}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="city">Cidade</Label>
                                <div className="text-muted-foreground text-sm">{plant.city}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="state">Estado</Label>
                                <div className="text-muted-foreground text-sm">{plant.state}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="zip_code">CEP</Label>
                                <div className="text-muted-foreground text-sm">{plant.zip_code}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="gps_coordinates">Coordenadas GPS</Label>
                                <div className="text-muted-foreground text-sm">{plant.gps_coordinates}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
                        <MapComponent coordinates={plant.gps_coordinates} />
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'areas',
            label: 'Áreas',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Áreas</CardTitle>
                        <CardDescription>Lista de áreas vinculadas a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {areas.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('areas', 'name')}>
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('areas', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer text-center" onClick={() => handleSort('areas', 'asset_count')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Ativos
                                                    {getSortIcon('areas', 'asset_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="h-12 cursor-pointer text-center"
                                                onClick={() => handleSort('areas', 'sectors_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Setores
                                                    {getSortIcon('areas', 'sectors_count')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {areas.data.map((area) => (
                                            <TableRow
                                                key={area.id}
                                                className="hover:bg-muted/50 h-12 cursor-pointer"
                                                onClick={() => router.get(route('asset-hierarchy.areas.show', area.id))}
                                            >
                                                <TableCell className="font-medium">{area.name}</TableCell>
                                                <TableCell className="text-center">{area.asset_count}</TableCell>
                                                <TableCell className="text-center">{area.sectors_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhuma área cadastrada nesta planta.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                areas_page: areas.current_page - 1,
                                                tab: 'areas',
                                                areas_sort: filters.areas.sort,
                                                areas_direction: filters.areas.direction,
                                            })}
                                            className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: areas.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`areas-pagination-${page}`}>
                                            <PaginationLink
                                                href={route('asset-hierarchy.plantas.show', {
                                                    plant: plant.id,
                                                    areas_page: page,
                                                    tab: 'areas',
                                                    areas_sort: filters.areas.sort,
                                                    areas_direction: filters.areas.direction,
                                                })}
                                                isActive={page === areas.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                areas_page: areas.current_page + 1,
                                                tab: 'areas',
                                                areas_sort: filters.areas.sort,
                                                areas_direction: filters.areas.direction,
                                            })}
                                            className={areas.current_page === areas.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'setores',
            label: 'Setores',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Setores</CardTitle>
                        <CardDescription>Lista de setores vinculados a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sectors.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('sectors', 'name')}>
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('sectors', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('sectors', 'area')}>
                                                <div className="flex items-center gap-1">
                                                    Área
                                                    {getSortIcon('sectors', 'area')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('sectors', 'asset_count')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Ativos
                                                    {getSortIcon('sectors', 'asset_count')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sectors.data.map((sector) => (
                                            <TableRow
                                                key={sector.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                                onClick={() => router.get(route('asset-hierarchy.setores.show', sector.id))}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{sector.name}</div>
                                                    {sector.description && <div className="text-muted-foreground text-sm">{sector.description}</div>}
                                                </TableCell>
                                                <TableCell>{sector.area.name}</TableCell>
                                                <TableCell className="text-center">{sector.asset_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum setor cadastrado nesta planta.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                sectors_page: sectors.current_page - 1,
                                                tab: 'setores',
                                                sectors_sort: filters.sectors.sort,
                                                sectors_direction: filters.sectors.direction,
                                            })}
                                            className={sectors.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: sectors.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`sectors-pagination-${page}`}>
                                            <PaginationLink
                                                href={route('asset-hierarchy.plantas.show', {
                                                    plant: plant.id,
                                                    sectors_page: page,
                                                    tab: 'setores',
                                                    sectors_sort: filters.sectors.sort,
                                                    sectors_direction: filters.sectors.direction,
                                                })}
                                                isActive={page === sectors.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                sectors_page: sectors.current_page + 1,
                                                tab: 'setores',
                                                sectors_sort: filters.sectors.sort,
                                                sectors_direction: filters.sectors.direction,
                                            })}
                                            className={sectors.current_page === sectors.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Ativos</CardTitle>
                        <CardDescription>Lista de ativos vinculados a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {asset.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('asset', 'tag')}>
                                                <div className="flex items-center gap-1">
                                                    TAG
                                                    {getSortIcon('asset', 'tag')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('asset', 'type')}>
                                                <div className="flex items-center gap-1">
                                                    Tipo
                                                    {getSortIcon('asset', 'type')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('asset', 'location')}>
                                                <div className="flex items-center gap-1">
                                                    Localização
                                                    {getSortIcon('asset', 'location')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('asset', 'manufacturer')}>
                                                <div className="flex items-center gap-1">
                                                    Fabricante
                                                    {getSortIcon('asset', 'manufacturer')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('asset', 'year')}>
                                                <div className="flex items-center gap-1">
                                                    Ano
                                                    {getSortIcon('asset', 'year')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {asset.data.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-muted/50 h-12 cursor-pointer"
                                                onClick={() => router.get(route('asset-hierarchy.assets.show', item.id))}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{item.tag}</div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.asset_type?.name ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {item.area_name}
                                                    {item.sector_name && ` / ${item.sector_name}`}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.manufacturer ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.manufacturing_year ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum ativo cadastrado nesta planta.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                asset_page: asset.current_page - 1,
                                                tab: 'ativos',
                                                asset_sort: filters.asset.sort,
                                                asset_direction: filters.asset.direction,
                                            })}
                                            className={asset.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: asset.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`asset-pagination-${page}`}>
                                            <PaginationLink
                                                href={route('asset-hierarchy.plantas.show', {
                                                    plant: plant.id,
                                                    asset_page: page,
                                                    tab: 'ativos',
                                                    asset_sort: filters.asset.sort,
                                                    asset_direction: filters.asset.direction,
                                                })}
                                                isActive={page === asset.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={route('asset-hierarchy.plantas.show', {
                                                plant: plant.id,
                                                asset_page: asset.current_page + 1,
                                                tab: 'ativos',
                                                asset_sort: filters.asset.sort,
                                                asset_direction: filters.asset.direction,
                                            })}
                                            className={asset.current_page === asset.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout
                title={plant.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.plantas.edit', plant.id)}
                backRoute={route('asset-hierarchy.plantas')}
                tabs={tabs}
            />
        </AppLayout>
    );
}
