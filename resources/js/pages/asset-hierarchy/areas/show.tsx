import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Cog, MapPin } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
    },
    {
        title: 'Detalhes da Área',
        href: '#',
    },
];

interface Area {
    id: number;
    name: string;
    plant: {
        id: number;
        name: string;
    };
    asset: Asset[];
    sectors: Sector[];
    created_at: string;
    updated_at: string;
}

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
        plant: {
            id: number;
            name: string;
        };
    };
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

export default function Show({ area, sectors, asset, totalAssetCount, activeTab, filters }: Props) {
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

    const getSortIcon = (section: 'sectors' | 'asset', column: string) => {
        if (filters[section].sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters[section].direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    // Verificações de segurança para evitar erros de undefined
    if (!area || !area.plant) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <ShowLayout title="Carregando..." breadcrumbs={breadcrumbs} editRoute="#" backRoute={route('asset-hierarchy.areas')} tabs={[]}>
                    <div>Carregando informações da área...</div>
                </ShowLayout>
            </AppLayout>
        );
    }

    const subtitle = (
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{area.plant.name}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{sectors?.total || 0} setores</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{totalAssetCount || 0} ativos</span>
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
                        <CardDescription>Informações básicas sobre a área</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Nome</Label>
                                <div className="text-muted-foreground text-sm">{area.name}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="plant">Planta</Label>
                                <div className="text-muted-foreground text-sm">{area.plant.name}</div>
                            </div>
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
                        <CardDescription>Lista de setores vinculados a esta área</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sectors.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 w-[30%] cursor-pointer" onClick={() => handleSort('sectors', 'name')}>
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('sectors', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="h-12 w-[15%] cursor-pointer text-center"
                                                onClick={() => handleSort('sectors', 'asset_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Ativos
                                                    {getSortIcon('sectors', 'asset_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="h-12 w-[55%] cursor-pointer pl-8"
                                                onClick={() => handleSort('sectors', 'description')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Descrição
                                                    {getSortIcon('sectors', 'description')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sectors.data.map((sector) => (
                                            <TableRow key={sector.id} className="hover:bg-muted/50 h-12 cursor-pointer">
                                                <TableCell>
                                                    <Link
                                                        href={route('asset-hierarchy.setores.show', sector.id)}
                                                        className="hover:text-primary font-medium"
                                                    >
                                                        {sector.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span>{sector.asset_count}</span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground pl-8 text-sm">{sector.description ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum setor cadastrado nesta área.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.areas.show', {
                                                area: area.id,
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
                                                href={route('asset-hierarchy.areas.show', {
                                                    area: area.id,
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
                                            href={route('asset-hierarchy.areas.show', {
                                                area: area.id,
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
                        <CardDescription>Lista de ativos vinculados a esta área</CardDescription>
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
                                        {asset.data.map((asset) => (
                                            <TableRow key={asset.id} className="hover:bg-muted/50 h-12 cursor-pointer">
                                                <TableCell>
                                                    <Link
                                                        href={route('asset-hierarchy.assets.show', asset.id)}
                                                        className="hover:text-primary font-medium"
                                                    >
                                                        {asset.tag}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.asset_type?.name ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturer ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturing_year ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum ativo cadastrado nesta área.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.areas.show', {
                                                area: area.id,
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
                                                href={route('asset-hierarchy.areas.show', {
                                                    area: area.id,
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
                                            href={route('asset-hierarchy.areas.show', {
                                                area: area.id,
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
            <Head title={`Área ${area.name}`} />
            <ShowLayout
                title={area.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.areas.edit', area.id)}
                backRoute={route('asset-hierarchy.areas')}
                tabs={tabs}
            />
        </AppLayout>
    );
}
