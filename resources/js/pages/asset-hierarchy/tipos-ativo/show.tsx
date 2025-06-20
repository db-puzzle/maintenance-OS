import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { router } from '@inertiajs/react';
import { Cog, Settings } from 'lucide-react';

import AssetTypeFormComponent from '@/components/AssetTypeFormComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
            href: '/asset-hierarchy/tipos-ativo',
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
                                                <TableCell className="text-muted-foreground text-sm">{asset.manufacturer?.name ?? '-'}</TableCell>
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
            <ShowLayout title={assetType.name} subtitle={subtitle} editRoute={route('asset-hierarchy.tipos-ativo.edit', assetType.id)} tabs={tabs} />
        </AppLayout>
    );
}
