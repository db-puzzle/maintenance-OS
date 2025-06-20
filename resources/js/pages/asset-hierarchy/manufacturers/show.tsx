import ManufacturerFormComponent from '@/components/ManufacturerFormComponent';
import EmptyCard from '@/components/ui/empty-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Package } from 'lucide-react';

interface AssetData {
    id: number;
    tag: string;
    description: string;
    serial_number: string | null;
    part_number: string | null;
    asset_type: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
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
    assets?: AssetData[];
}

interface Props {
    manufacturer: ManufacturerData;
}

export default function Show({ manufacturer }: Props) {
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
            label: 'Ativos Associados',
            content: (
                <div className="p-6">
                    {manufacturer.assets_count === 0 ? (
                        <EmptyCard
                            icon={Package}
                            title="Nenhum ativo associado"
                            description="Este fabricante ainda não possui ativos associados."
                            primaryButtonText="Ver todos os ativos"
                            primaryButtonAction={() => router.visit(route('asset-hierarchy.assets'))}
                        />
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Número Serial</TableHead>
                                        <TableHead>Part Number</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Localização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manufacturer.assets?.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">
                                                <Link href={route('asset-hierarchy.assets.show', asset.id)} className="text-primary hover:underline">
                                                    {asset.tag}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.description || '-'}</TableCell>
                                            <TableCell>{asset.serial_number || '-'}</TableCell>
                                            <TableCell>{asset.part_number || '-'}</TableCell>
                                            <TableCell>{asset.asset_type || '-'}</TableCell>
                                            <TableCell>{[asset.plant, asset.area, asset.sector].filter(Boolean).join(' > ') || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
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
                subtitle={`${manufacturer.assets_count || 0} ativo(s) associado(s)`}
                editRoute=""
                tabs={tabs}
                defaultActiveTab="informacoes"
            />
        </AppLayout>
    );
}
