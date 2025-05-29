import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { router } from '@inertiajs/react';
import { Cog, Settings } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/tipos-ativo',
    },
    {
        title: 'Detalhes do Tipo de Ativo',
        href: '#',
    },
];

interface Props {
    assetType: {
        id: number;
        name: string;
        description: string;
    };
    asset: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab: string;
}

export default function Show({ assetType, asset, activeTab }: Props) {
    const subtitle = (
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Tipo de Ativo</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{asset.total} ativos</span>
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
                        <CardDescription>Informações básicas sobre o tipo de ativo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Nome</Label>
                                <div className="text-muted-foreground text-sm">{assetType.name}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="description">Descrição</Label>
                                <div className="text-muted-foreground text-sm">{assetType.description ?? '-'}</div>
                            </div>
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
                        <CardDescription>Lista de ativos deste tipo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {asset.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12">TAG</TableHead>
                                            <TableHead className="h-12">Área</TableHead>
                                            <TableHead className="h-12">Fabricante</TableHead>
                                            <TableHead className="h-12">Ano</TableHead>
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
                                                <TableCell className="text-muted-foreground text-sm">{asset.area?.name ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturer ?? '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturing_year ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-muted-foreground py-6 text-center text-sm">Nenhum ativo cadastrado deste tipo.</div>
                        )}
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('asset-hierarchy.tipos-ativo.show', {
                                                assetType: assetType.id,
                                                asset_page: asset.current_page - 1,
                                                tab: 'ativos',
                                            })}
                                            className={asset.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>

                                    {Array.from({ length: asset.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`asset-pagination-${page}`}>
                                            <PaginationLink
                                                href={route('asset-hierarchy.tipos-ativo.show', {
                                                    assetType: assetType.id,
                                                    asset_page: page,
                                                    tab: 'ativos',
                                                })}
                                                isActive={page === asset.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            href={route('asset-hierarchy.tipos-ativo.show', {
                                                assetType: assetType.id,
                                                asset_page: asset.current_page + 1,
                                                tab: 'ativos',
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
                title={assetType.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.tipos-ativo.edit', assetType.id)}
                backRoute={route('asset-hierarchy.tipos-ativo')}
                tabs={tabs}
            />
        </AppLayout>
    );
}
