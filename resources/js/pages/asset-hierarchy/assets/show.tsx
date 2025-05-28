import { type BreadcrumbItem } from '@/types';
import { type Asset, type AssetType, type Area, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, MessageSquare, Calendar, FileText } from 'lucide-react';
import EmptyCard from '@/components/ui/empty-card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { useState, useRef } from 'react';
import RoutineList from '@/components/RoutineList';
import CreateRoutineButton from '@/components/CreateRoutineButton';
import { toast } from 'sonner';

interface Props {
    asset: Asset & {
        asset_type: AssetType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
        routines?: Array<any>;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ativos',
        href: '/asset-hierarchy/assets',
    },
    {
        title: 'Detalhes do Ativo',
        href: '#',
    },
];

export default function Show({ asset }: Props) {
    const { url } = usePage();

    // Extrai o parâmetro tab da URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const tabFromUrl = urlParams.get('tab');

    // Determina qual planta mostrar
    const plantToShow = asset.plant || asset.area?.plant;

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<Array<any>>(asset.routines || []);

    // Referência para o CreateRoutineButton
    const createRoutineButtonRef = useRef<HTMLButtonElement>(null);

    // Handlers para rotinas
    const handleSaveRoutine = (routine: any) => {
        if (routine.id && routines.find(r => r.id === routine.id)) {
            // Atualizar rotina existente
            setRoutines(routines.map(r => r.id === routine.id ? routine : r));
            toast.success('Rotina atualizada com sucesso!');
        } else {
            // Para novas rotinas, apenas adicionar ao estado (a criação já foi feita pelo EditRoutineSheet)
            setRoutines([...routines, routine]);
            toast.success('Rotina criada com sucesso!');
        }
    };

    const handleCreateSuccess = (routine: any) => {
        // Só adicionar ao estado, sem fazer nova chamada HTTP
        setRoutines([...routines, routine]);
        toast.success('Rotina criada com sucesso!');
    };

    const handleDeleteRoutine = (routine: any) => {
        // Remover a rotina da listagem
        setRoutines(routines.filter(r => r.id !== routine.id));
    };

    const handleNewRoutineClick = () => {
        createRoutineButtonRef.current?.click();
    };

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
            id: 'rotinas',
            label: 'Rotinas',
            content: (
                <div className="space-y-4">
                    {routines.length === 0 ? (
                        <div className="p-4">
                            <EmptyCard
                                icon={Calendar}
                                title="Nenhuma rotina de manutenção"
                                description="Crie rotinas de manutenção para este ativo"
                                primaryButtonText="Nova rotina"
                                primaryButtonAction={handleNewRoutineClick}
                                secondaryButtonText="Ver cronograma"
                                secondaryButtonAction={() => {
                                    // Navegar para cronograma ou implementar funcionalidade futura
                                }}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Lista de rotinas existentes */}

                            <div className="p-4">
                                <h3 className="text-base/7 font-semibold text-gray-900">Rotinas Disponíveis</h3>
                                <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">Execute, crie ou edite rotinas de manutenção para este ativo.</p>
                                <div className="p-4">
                                    <ul role="list" className="divide-y divide-gray-100 border-t border-b border-gray-100" >
                                        {routines.map((routine) => (
                                            <RoutineList
                                                key={routine.id}
                                                routine={routine}
                                                onSave={handleSaveRoutine}
                                                onDelete={handleDeleteRoutine}
                                                assetId={asset.id}
                                            />
                                        ))}
                                    </ul>
                                </div>

                                {/* Botão para adicionar nova rotina quando já existem rotinas */}
                                <div className="flex justify-center py-4">
                                    <CreateRoutineButton
                                        onSuccess={handleCreateSuccess}
                                        text="Adicionar Nova Rotina"
                                        variant="outline"
                                        assetId={asset.id}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* CreateRoutineButton oculto para ser acionado programaticamente */}
                    <div style={{ display: 'none' }}>
                        <CreateRoutineButton
                            ref={createRoutineButtonRef}
                            onSuccess={handleCreateSuccess}
                            text="Nova Rotina"
                            assetId={asset.id}
                        />
                    </div>
                </div>
            ),
        },
        {
            id: 'chamados',
            label: 'Chamados de Usuário',
            content: (
                <div className="p-4">
                    <EmptyCard
                        icon={MessageSquare}
                        title="Nenhum chamado registrado"
                        description="Registre chamados para este ativo"
                        primaryButtonText="Novo chamado"
                        primaryButtonAction={() => { }}
                        secondaryButtonText="Ver histórico"
                        secondaryButtonAction={() => { }}
                    />
                </div>
            ),
        },
        {
            id: 'ordem-serviço',
            label: 'Ordens de Manutenção',
            content: (
                <div className="p-4">
                    <EmptyCard
                        icon={FileText}
                        title="Nenhuma ordem de serviço"
                        description="Registre ordens de serviço para este ativo"
                        primaryButtonText="Nova ordem de serviço"
                        primaryButtonAction={() => { }}
                        secondaryButtonText="Ver histórico"
                        secondaryButtonAction={() => { }}
                    />
                </div>
            ),
        },
        {
            id: 'arquivos',
            label: 'Arquivos',
            content: (
                <div className="p-4">
                    <EmptyCard
                        icon={FileText}
                        title="Nenhum arquivo"
                        description="Registre arquivos para este ativo"
                        primaryButtonText="Novo arquivo"
                        primaryButtonAction={() => { }}
                        secondaryButtonText="Ver histórico"
                        secondaryButtonAction={() => { }}
                    />
                </div>
            ),
        },
        {
            id: 'historico',
            label: 'Histórico',
            content: (
                <div className="p-4">
                    <EmptyCard
                        icon={MessageSquare}
                        title="Nenhum histórico registrado"
                        description="Quando houver algum histórico para este ativo, ele será exibido aqui."
                        primaryButtonText="Ver detalhes"
                        primaryButtonAction={() => {
                            // Implementar ação para ver detalhes do histórico ou navegar
                        }}
                    />
                </div>
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
                editRoute={route('asset-hierarchy.assets.edit', asset.id)}
                backRoute={route('asset-hierarchy.assets')}
                tabs={tabs}
                defaultActiveTab={tabFromUrl || undefined}
            />
        </AppLayout>
    );
} 