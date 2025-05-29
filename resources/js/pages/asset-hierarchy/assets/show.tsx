import CreateRoutineButton from '@/components/CreateRoutineButton';
import RoutineList from '@/components/RoutineList';
import AssetFormComponent from '@/components/AssetFormComponent';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, usePage } from '@inertiajs/react';
import { Calendar, FileText, MessageSquare } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    asset: Asset & {
        asset_type: AssetType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
        routines?: Array<any>;
    };
    plants: Plant[];
    assetTypes: AssetType[];
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

export default function Show({ asset, plants, assetTypes }: Props) {
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
        if (routine.id && routines.find((r) => r.id === routine.id)) {
            // Atualizar rotina existente
            setRoutines(routines.map((r) => (r.id === routine.id ? routine : r)));
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
        setRoutines(routines.filter((r) => r.id !== routine.id));
    };

    const handleNewRoutineClick = () => {
        createRoutineButtonRef.current?.click();
    };

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="pt-8 p-4">
                    <AssetFormComponent
                        asset={asset}
                        plants={plants}
                        assetTypes={assetTypes}
                        initialMode="view"
                    />
                </div>
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

                            <div className="p-4 bg-background-muted">
                                <h3 className="text-base/7 font-semibold text-gray-900">Rotinas Disponíveis</h3>
                                <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
                                    Execute, crie ou edite rotinas de manutenção para este ativo.
                                </p>
                                <div className="p-4">
                                    <ul role="list" className="divide-y divide-gray-100 border-t border-b border-gray-100">
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
                        <CreateRoutineButton ref={createRoutineButtonRef} onSuccess={handleCreateSuccess} text="Nova Rotina" assetId={asset.id} />
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
                        <Link href={route('asset-hierarchy.tipos-ativo.show', asset.asset_type.id)} className="hover:underline">
                            {asset.asset_type.name}
                        </Link>
                    ) : (
                        'Tipo não definido'
                    )
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
