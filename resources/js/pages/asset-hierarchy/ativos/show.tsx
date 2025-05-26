import { type BreadcrumbItem } from '@/types';
import { type Asset, type AssetType, type Area, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, MessageSquare, Calendar, FileText } from 'lucide-react';
import { EmptySection1 } from '@/components/ui/empty-section-1';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';

interface Props {
    asset: Asset & {
        asset_type: AssetType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ativos',
        href: '/asset-hierarchy/ativos',
    },
    {
        title: 'Detalhes',
        href: '#',
    },
];

export default function Show({ asset }: Props) {
    // Determina qual planta mostrar
    const plantToShow = asset.plant || asset.area?.plant;

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <Card>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                            {/* Coluna 1: Foto */}
                            <div className="flex flex-col h-full justify-center">
                                <div className={`flex-1 relative rounded-lg overflow-hidden ${!asset.photo_path ? 'bg-muted' : ''} min-h-[238px] max-h-[238px]`}>
                                    {asset.photo_path ? (
                                        <img
                                            src={`/storage/${asset.photo_path}`}
                                            alt={`Foto do ativo ${asset.tag}`}
                                            className="w-full h-full object-contain scale-120"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Camera className="w-12 h-12" />
                                            <span className="text-sm">Sem foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Grid de Informações 2x3 */}
                            <div className="lg:col-span-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Linha 1 */}
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Número Serial</Label>
                                            <div className="text-base text-muted-foreground">{asset.serial_number ?? '-'}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Fabricante</Label>
                                            <div className="text-base text-muted-foreground">{asset.manufacturer ?? '-'}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Ano de Fabricação</Label>
                                            <div className="text-base text-muted-foreground">{asset.manufacturing_year ?? '-'}</div>
                                        </div>
                                    </div>

                                    <Separator className="col-span-3 my-4" />

                                    {/* Linha 2 */}
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Planta</Label>
                                            <div className="text-base">
                                                {plantToShow ? (
                                                    <Link
                                                        href={route('asset-hierarchy.plantas.show', plantToShow.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {plantToShow.name}
                                                    </Link>
                                                ) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Área</Label>
                                            <div className="text-base">
                                                {asset.area ? (
                                                    <Link
                                                        href={route('asset-hierarchy.areas.show', asset.area.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {asset.area.name}
                                                    </Link>
                                                ) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Setor</Label>
                                            <div className="text-base">
                                                {asset.sector ? (
                                                    <Link
                                                        href={route('asset-hierarchy.setores.show', asset.sector.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {asset.sector.name}
                                                    </Link>
                                                ) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'solicitacoes',
            label: 'Solicitações de Usuário',
            content: (
                <Card>
                    <CardContent>
                        <EmptySection1 
                            title="Nenhuma solicitação registrada"
                            description="Registre solicitações de usuários para este ativo"
                            icon={MessageSquare}
                            primaryButtonText="Nova solicitação"
                            secondaryButtonText="Ver histórico"
                            primaryButtonLink="#"
                            secondaryButtonLink="#"
                            showDashedBorder={false}
                        />
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'planos',
            label: 'Planos de Manutenção',
            content: (
                <Card>
                    <CardContent>
                        <EmptySection1 
                            title="Nenhum plano de manutenção"
                            description="Crie planos de manutenção para este ativo"
                            icon={Calendar}
                            primaryButtonText="Novo plano"
                            secondaryButtonText="Ver cronograma"
                            primaryButtonLink="#"
                            secondaryButtonLink="#"
                            showDashedBorder={false}
                        />
                    </CardContent>
                </Card>
            ),
        },
        {
            id: 'log',
            label: 'Central de Logs',
            content: (
                <Card>
                    <CardContent>
                        <EmptySection1 
                            title="Nenhum registro de log"
                            description="Registre operações e manutenções realizadas neste ativo"
                            icon={FileText}
                            primaryButtonText="Novo registro"
                            secondaryButtonText="Ver histórico"
                            primaryButtonLink="#"
                            secondaryButtonLink="#"
                            showDashedBorder={false}
                        />
                    </CardContent>
                </Card>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ativo ${asset.tag}`} />

            <ShowLayout
                title={asset.tag}
                subtitle={
                    asset.asset_type ? (
                        <Link
                            href={route('asset-hierarchy.tipos-ativo.show', asset.asset_type.id)}
                            className="hover:underline"
                        >
                            {asset.asset_type.name}
                        </Link>
                    ) : 'Tipo não definido'
                }
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.ativos.edit', asset.id)}
                backRoute={route('asset-hierarchy.ativos')}
                tabs={tabs}
            />
        </AppLayout>
    );
} 