import CreateRoutineButton from '@/components/CreateRoutineButton';
import RoutineList from '@/components/RoutineList';
import AssetFormComponent from '@/components/AssetFormComponent';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { CalendarClock, FileText, MessageSquare, Clock, Calendar } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import ItemSelect from '@/components/ItemSelect';
import CreateShiftSheet from '@/components/CreateShiftSheet';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftTableView from '@/components/ShiftTableView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import AssetRuntimeInput from '@/components/AssetRuntimeInput';
import ShiftSelectionCard, { ShiftSelectionCardRef } from '@/components/ShiftSelectionCard';

interface Shift {
    id: number;
    name: string;
    plant?: {
        id: number;
        name: string;
    };
    schedules: Array<{
        weekday: string;
        shifts: Array<{
            start_time: string;
            end_time: string;
            active: boolean;
            breaks: Array<{
                start_time: string;
                end_time: string;
            }>;
        }>;
    }>;
}

interface Manufacturer {
    id: number;
    name: string;
    website?: string;
    email?: string;
    phone?: string;
    country?: string;
    notes?: string;
}

interface Props {
    asset?: Asset & {
        asset_type: AssetType;
        manufacturer?: Manufacturer;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
        routines?: Array<any>;
        shift_id?: number;
        runtime_data?: {
            current_hours: number;
            last_measurement?: {
                hours: number;
                datetime: string;
                user_name?: string;
            };
            user_timezone?: string;
        };
    };
    plants: Plant[];
    assetTypes: AssetType[];
    manufacturers: Manufacturer[];
    isCreating?: boolean;
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

export default function Show({ asset, plants, assetTypes, manufacturers, isCreating = false }: Props) {
    const { url } = usePage();

    // Extrai o parâmetro tab da URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const tabFromUrl = urlParams.get('tab');

    // Determina qual planta mostrar
    const plantToShow = asset?.plant || asset?.area?.plant;

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<Array<any>>(asset?.routines || []);

    // Estados para turnos
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState<string>(asset?.shift_id?.toString() || '');
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const createShiftSheetRef = useRef<HTMLButtonElement>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

    // Estado para modo de edição dos turnos
    const [isEditingShift, setIsEditingShift] = useState(false);
    const [tempSelectedShiftId, setTempSelectedShiftId] = useState<string>('');

    // Referência para o CreateRoutineButton
    const createRoutineButtonRef = useRef<HTMLButtonElement>(null);
    const shiftSelectionRef = useRef<ShiftSelectionCardRef>(null);

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

    const handleAssetCreated = () => {
        // This will be called after successful asset creation
        // The AssetFormComponent will handle the redirect
    };

    // Carregar turnos disponíveis
    useEffect(() => {
        if (!isCreating && asset && plantToShow) {
            loadShifts();
        }
    }, [asset, isCreating, plantToShow?.id]);

    // Carregar detalhes do turno selecionado
    useEffect(() => {
        const shiftIdToLoad = isEditingShift ? tempSelectedShiftId : selectedShiftId;
        if (shiftIdToLoad && shifts.length > 0) {
            const shift = shifts.find(s => s.id.toString() === shiftIdToLoad);
            if (shift) {
                loadShiftDetails(shift.id);
            }
        } else if (!shiftIdToLoad) {
            setSelectedShift(null);
        }
    }, [selectedShiftId, tempSelectedShiftId, isEditingShift, shifts]);

    const loadShifts = async () => {
        setLoadingShifts(true);
        try {
            // Only send plant_id if it exists
            const params: any = {
                format: 'json'
            };

            if (plantToShow?.id) {
                params.plant_id = plantToShow.id;
            }

            const response = await axios.get(route('asset-hierarchy.shifts'), {
                params,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const shiftsData = response.data.shifts || [];
            setShifts(shiftsData);

            if (shiftsData.length === 0) {
                if (!plantToShow?.id) {
                    toast.warning('Nenhum turno encontrado. O ativo precisa estar associado a uma planta para visualizar turnos.');
                } else {
                    toast.info('Nenhum turno cadastrado para esta planta.');
                }
            }
        } catch (error: any) {
            console.error('Error loading shifts:', error);
            toast.error('Erro ao carregar turnos');
        } finally {
            setLoadingShifts(false);
        }
    };

    const loadShiftDetails = async (shiftId: number) => {
        try {
            const response = await axios.get(route('asset-hierarchy.shifts.show', shiftId), {
                params: { format: 'json' }
            });
            setSelectedShift(response.data.shift);
        } catch (error: any) {
            console.error('Error loading shift details:', error);
        }
    };

    const handleShiftChange = async (shiftId: string) => {
        if (isEditingShift) {
            // Durante edição, apenas atualizar o estado temporário
            setTempSelectedShiftId(shiftId);
        } else {
            // Modo antigo para compatibilidade (não deveria ser usado)
            setSelectedShiftId(shiftId);
        }
    };

    const handleEditShift = () => {
        setIsEditingShift(true);
        setTempSelectedShiftId(selectedShiftId);
    };

    const handleCancelShiftEdit = () => {
        setIsEditingShift(false);
        setTempSelectedShiftId('');
    };

    const handleSaveShift = async () => {
        if (asset && tempSelectedShiftId !== selectedShiftId) {
            try {
                await axios.patch(route('asset-hierarchy.assets.update', asset.id), {
                    shift_id: tempSelectedShiftId || null
                });
                setSelectedShiftId(tempSelectedShiftId);
                toast.success('Turno associado ao ativo');

                // Reload the page to refresh runtime data
                router.reload();
            } catch (error) {
                console.error('Error updating asset shift:', error);
                toast.error('Erro ao associar turno');
                return;
            }
        }
        setIsEditingShift(false);
        setTempSelectedShiftId('');
    };

    const handleShiftCreated = async (newShift: Shift) => {
        // Add the new shift to the list
        setShifts([...shifts, newShift]);

        if (isEditingShift) {
            // Se estamos em modo de edição, apenas selecionar temporariamente
            setTempSelectedShiftId(newShift.id.toString());
        } else {
            // Se não estamos editando, aplicar diretamente
            const newShiftId = newShift.id.toString();
            setSelectedShiftId(newShiftId);

            // Save the shift association to the asset
            if (asset) {
                try {
                    await axios.patch(route('asset-hierarchy.assets.update', asset.id), {
                        shift_id: newShiftId
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        }
                    });
                    toast.success('Turno criado e associado ao ativo');
                } catch (error) {
                    console.error('Error associating shift with asset:', error);
                    toast.error('Erro ao associar turno ao ativo');
                }
            }
        }
    };

    const handleShiftUpdated = (updatedShift: Shift) => {
        // Update the shift in the list
        setShifts(shifts.map(shift =>
            shift.id === updatedShift.id ? updatedShift : shift
        ));

        // Update the selected shift details if it's the currently selected one
        if (selectedShift && selectedShift.id === updatedShift.id) {
            setSelectedShift(updatedShift);
        }

        // If we're in edit mode and this is the temp selected shift, update it
        if (isEditingShift && tempSelectedShiftId === updatedShift.id.toString()) {
            // Exit edit mode
            setIsEditingShift(false);
            setTempSelectedShiftId('');

            // Reload the page to refresh runtime data (automatic runtime report)
            router.reload();
        }
    };

    const handleCreateShiftClick = () => {
        createShiftSheetRef.current?.click();
    };

    const handleAddShiftClick = () => {
        // Trigger the same action as "Adicionar Turno" button in ShiftSelectionCard
        shiftSelectionRef.current?.triggerEditWithFocus();
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
                        manufacturers={manufacturers}
                        initialMode={isCreating ? "edit" : "view"}
                        onSuccess={isCreating ? handleAssetCreated : undefined}
                    />
                </div>
            ),
        },
        ...(isCreating ? [] : [
            {
                id: 'shifts-runtime',
                label: 'Turnos & Horas',
                content: (
                    <div className="p-4 space-y-6">
                        {!plantToShow ? (
                            <div className="rounded-md bg-yellow-50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">
                                            Ativo sem planta associada
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>Para visualizar e gerenciar turnos, o ativo precisa estar associado a uma planta (diretamente ou através de uma área).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                                    {/* First Column - Placeholder */}
                                    <div className="h-full">
                                        <AssetRuntimeInput
                                            assetId={asset?.id}
                                            runtimeData={asset?.runtime_data}
                                            onRuntimeUpdated={(data) => {
                                                // Handle runtime update if needed
                                                console.log('Runtime updated:', data);
                                            }}
                                        />
                                    </div>

                                    {/* Second Column - Shift Configuration */}
                                    <div className="h-full">
                                        <ShiftSelectionCard
                                            ref={shiftSelectionRef}
                                            shifts={shifts}
                                            selectedShiftId={selectedShiftId}
                                            tempSelectedShiftId={tempSelectedShiftId}
                                            isEditingShift={isEditingShift}
                                            loadingShifts={loadingShifts}
                                            plantToShow={plantToShow}
                                            onEditShift={handleEditShift}
                                            onCancelShiftEdit={handleCancelShiftEdit}
                                            onSaveShift={handleSaveShift}
                                            onShiftChange={handleShiftChange}
                                            onCreateClick={handleCreateShiftClick}
                                            onShiftUpdated={handleShiftUpdated}
                                        />
                                    </div>
                                </div>

                                {selectedShift ? (
                                    <div className="space-y-4">
                                        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'table')}>
                                            <TabsList className="flex w-[200px]">
                                                <TabsTrigger value="calendar" className="flex items-center gap-2 flex-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Calendário
                                                </TabsTrigger>
                                                <TabsTrigger value="table" className="flex items-center gap-2 flex-1">
                                                    <Table className="h-4 w-4" />
                                                    Tabela
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="calendar" className="mt-4">
                                                <ShiftCalendarView schedules={selectedShift.schedules} showAllDays={true} />
                                            </TabsContent>
                                            <TabsContent value="table" className="mt-4">
                                                <ShiftTableView schedules={selectedShift.schedules} />
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                ) : (
                                    <EmptyCard
                                        icon={Clock}
                                        title="Nenhum turno selecionado"
                                        description="Selecione ou configure um turno de operação para visualizar os horários de trabalho do ativo."
                                        primaryButtonText="Adicionar Turno"
                                        primaryButtonAction={handleAddShiftClick}
                                    />
                                )}
                            </>
                        )}

                        {/* CreateShiftSheet oculto para ser acionado programaticamente */}
                        <div style={{ display: 'none' }}>
                            <CreateShiftSheet
                                ref={createShiftSheetRef}
                                showTrigger
                                onSuccess={handleShiftCreated}
                            />
                        </div>
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
                                    icon={CalendarClock}
                                    title="Nenhuma rotina"
                                    description="Crie rotinas de manutenção e inspeção para este ativo"
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
                                                    assetId={asset?.id}
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
                                            assetId={asset?.id}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CreateRoutineButton oculto para ser acionado programaticamente */}
                        <div style={{ display: 'none' }}>
                            <CreateRoutineButton ref={createRoutineButtonRef} onSuccess={handleCreateSuccess} text="Nova Rotina" assetId={asset?.id} />
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
        ]),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Novo Ativo' : `Ativo ${asset?.tag}`} />

            <ShowLayout
                title={isCreating ? 'Novo Ativo' : (asset?.tag || 'Ativo')}
                subtitle={
                    isCreating ? (
                        'Criação de novo ativo'
                    ) : asset?.asset_type ? (
                        <Link href={route('asset-hierarchy.tipos-ativo.show', asset.asset_type.id)} className="hover:underline">
                            {asset.asset_type.name}
                        </Link>
                    ) : (
                        'Sem tipo definido'
                    )
                }
                breadcrumbs={breadcrumbs}
                editRoute={isCreating ? '' : (asset ? route('asset-hierarchy.assets.edit', asset.id) : '')}
                backRoute={route('asset-hierarchy.assets')}
                tabs={tabs}
                defaultActiveTab={tabFromUrl || undefined}
            />
        </AppLayout>
    );
}
