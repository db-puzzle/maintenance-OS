import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Cog, Factory, Map } from 'lucide-react';

import SectorFormComponent from '@/components/SectorFormComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    plants?: any[];
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
            href: '/asset-hierarchy/setores',
        },
        {
            title: sector.name,
            href: '#',
        },
    ];

    const handleSort = (column: string) => {
        const direction = filters.asset.sort === column && filters.asset.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('asset-hierarchy.setores.show', {
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

    const getSortIcon = (column: string) => {
        if (filters.asset.sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters.asset.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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
                    <SectorFormComponent sector={sector as any} plants={plants || []} initialMode="view" onSuccess={() => router.reload()} />
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Ativos</CardTitle>
                        <CardDescription>Lista de ativos vinculados a este setor</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {asset.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('tag')}>
                                                <div className="flex items-center gap-1">
                                                    TAG
                                                    {getSortIcon('tag')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('type')}>
                                                <div className="flex items-center gap-1">
                                                    Tipo
                                                    {getSortIcon('type')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('manufacturer')}>
                                                <div className="flex items-center gap-1">
                                                    Fabricante
                                                    {getSortIcon('manufacturer')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 cursor-pointer" onClick={() => handleSort('year')}>
                                                <div className="flex items-center gap-1">
                                                    Ano
                                                    {getSortIcon('year')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {asset.data.map((asset) => (
                                            <TableRow
                                                key={asset.id}
                                                className="hover:bg-muted/50 h-12 cursor-pointer"
                                                onClick={() => router.get(route('asset-hierarchy.assets.show', asset.id))}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{asset.tag}</div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.asset_type?.name ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturer?.name ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturing_year ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum ativo cadastrado neste setor.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.setores.show', {
                                                setor: sector.id,
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
                                                href={route('asset-hierarchy.setores.show', {
                                                    setor: sector.id,
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
                                            href={route('asset-hierarchy.setores.show', {
                                                setor: sector.id,
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
            <ShowLayout title={sector.name} subtitle={subtitle} editRoute={route('asset-hierarchy.setores.edit', sector.id)} tabs={tabs} />
        </AppLayout>
    );
}
