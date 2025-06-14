import CreateRoutineButton from '@/components/CreateRoutineButton';
import RoutineList from '@/components/RoutineList';
import AssetFormComponent from '@/components/AssetFormComponent';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { CalendarClock, FileText, MessageSquare, Clock, Calendar, Eye } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import InlineRoutineForm from '@/components/InlineRoutineForm';
import InlineRoutineFormEditor from '@/components/InlineRoutineFormEditor';

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
    newRoutineId?: number;
}

export default function Show({ asset, plants, assetTypes, manufacturers, isCreating = false, newRoutineId }: Props) {
    const { url, props } = usePage<any>();

    // Extrai o parâmetro tab da URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const tabFromUrl = urlParams.get('tab');

    // Define breadcrumbs with dynamic asset tag
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset?.tag || 'Novo Ativo',
            href: '#',
        },
    ];

    // Check for flash data
    const flash = props.flash || {};

    // Determina qual planta mostrar
    const plantToShow = asset?.plant || asset?.area?.plant;

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<Array<any>>(asset?.routines || []);

    // Update routines when asset prop changes
    useEffect(() => {
        if (asset?.routines) {
            setRoutines(asset.routines);
        }
    }, [asset?.routines]);

    // Estado para controlar qual rotina está sendo editada
    const [editingRoutineFormId, setEditingRoutineFormId] = useState<number | null>(null);

    // Estado para controlar o modo comprimido
    const [isCompressed, setIsCompressed] = useState(false);

    // Estado para busca de rotinas
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para controlar o salvamento do formulário
    const [isSavingForm, setIsSavingForm] = useState(false);

    // Estado para controlar o preenchimento da rotina
    const [fillingRoutineId, setFillingRoutineId] = useState<number | null>(null);

    // Estado para controlar o carregamento do formulário
    const [loadingFormEditor, setLoadingFormEditor] = useState(false);

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

    // Filtrar rotinas baseado no termo de busca
    const filteredRoutines = routines.filter(routine =>
        routine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routine.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        // Add the new routine to the state
        if (routine && routine.id) {
            setRoutines([...routines, routine]);
        }
        // The backend will redirect to the routines tab with the new routine ID
        // The redirect will trigger the useEffect to open the form editor
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

    // Check for new routine from flash data
    useEffect(() => {
        if (newRoutineId && tabFromUrl === 'rotinas') {
            // Small delay to ensure the UI is ready
            setTimeout(() => {
                handleEditRoutineForm(newRoutineId);
            }, 100);
        }
    }, [newRoutineId, tabFromUrl]);



    // Carregar turnos disponíveis
    useEffect(() => {
        if (!isCreating && asset) {
            loadShifts();
        }
    }, [asset, isCreating]);

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
            const response = await axios.get(route('asset-hierarchy.shifts'), {
                params: {
                    format: 'json'
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const shiftsData = response.data.shifts || [];
            setShifts(shiftsData);

            if (shiftsData.length === 0) {
                toast.info('Nenhum turno cadastrado.');
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

    const handleEditRoutineForm = async (routineId: number) => {
        // First, fetch the complete routine data with form
        setLoadingFormEditor(true);
        try {
            const response = await axios.get(route('maintenance.routines.form-data', routineId));
            const routineWithForm = response.data.routine;

            // Update the routine in the state with the fetched data
            setRoutines(routines.map(r =>
                r.id === routineId ? { ...r, ...routineWithForm } : r
            ));

            // Then set the editing state
            setEditingRoutineFormId(routineId);
            // Ativar modo comprimido ao editar formulário
            setIsCompressed(true);
        } catch (error) {
            console.error('Error fetching routine form data:', error);
            toast.error('Erro ao carregar dados do formulário');
        } finally {
            setLoadingFormEditor(false);
        }
    };

    const handleFillRoutineForm = (routineId: number) => {
        setFillingRoutineId(routineId);
        setIsCompressed(true);
    };

    const handleCloseFormEditor = () => {
        setEditingRoutineFormId(null);
        // Desativar modo comprimido ao fechar editor
        setIsCompressed(false);
        // Reset saving state
        setIsSavingForm(false);
    };

    const handleCloseFormFiller = () => {
        setFillingRoutineId(null);
        setIsCompressed(false);
    };

    const handleFormSaved = (formData: any) => {
        // Atualizar a rotina com o novo formulário
        setRoutines(routines.map(r => {
            if (r.id === editingRoutineFormId) {
                return { ...r, form: formData };
            }
            return r;
        }));
        setEditingRoutineFormId(null);
        setIsSavingForm(false);
        toast.success('Formulário da rotina atualizado com sucesso!');
        // Desativar modo comprimido ao fechar editor
        setIsCompressed(false);
    };

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
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
                    <div className="py-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                            {/* First Column - Runtime Input */}
                            <div className="h-full">
                                <AssetRuntimeInput
                                    assetId={asset?.id}
                                    runtimeData={asset?.runtime_data}
                                    onRuntimeUpdated={(data) => {
                                        // Handle runtime update if needed
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
                    <div className="space-y-4 min-h-full">
                        {loadingFormEditor ? (
                            // Show loading state while fetching form data
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-muted-foreground">Carregando formulário...</p>
                                </div>
                            </div>
                        ) : editingRoutineFormId ? (
                            // Mostrar o editor de formulário inline
                            (() => {
                                const routine = routines.find(r => r.id === editingRoutineFormId);
                                if (!routine) return null;

                                return (
                                    <InlineRoutineFormEditor
                                        routine={routine}
                                        assetId={asset!.id}
                                        onClose={handleCloseFormEditor}
                                        onSuccess={handleFormSaved}
                                    />
                                );
                            })()
                        ) : fillingRoutineId ? (
                            // Mostrar o preenchedor de formulário inline
                            (() => {
                                const routine = routines.find(r => r.id === fillingRoutineId);
                                if (!routine) return null;

                                return (
                                    <InlineRoutineForm
                                        routine={routine}
                                        assetId={asset!.id}
                                        onClose={handleCloseFormFiller}
                                        onComplete={handleCloseFormFiller}
                                    />
                                );
                            })()
                        ) : routines.length === 0 ? (
                            <div className="py-4 min-h-[400px] flex items-center justify-center">
                                <div className="w-full">
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
                            </div>
                        ) : (
                            <>
                                {/* Lista de rotinas existentes */}

                                <div className="bg-background-muted">
                                    <div className={cn(
                                        "transition-all duration-200 ease-in-out",
                                        isCompressed ? "mt-4 mb-4 px-4" : "mt-4 mb-4 px-4"
                                    )}>
                                        <div className="relative">
                                            <Search className={cn(
                                                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                                                isCompressed ? "h-4 w-4" : "h-5 w-5"
                                            )} />
                                            <Input
                                                type="text"
                                                placeholder="Buscar rotinas..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={cn(
                                                    "max-w-sm bg-background",
                                                    isCompressed ? "pl-9 h-8" : "pl-10"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "transition-all duration-200 ease-in-out",
                                        isCompressed ? "px-2" : "px-4"
                                    )}>
                                        <ul role="list" className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                            {filteredRoutines.map((routine) => (
                                                <RoutineList
                                                    key={routine.id}
                                                    routine={routine}
                                                    onSave={handleSaveRoutine}
                                                    onDelete={handleDeleteRoutine}
                                                    assetId={asset?.id}
                                                    onEditForm={() => handleEditRoutineForm(routine.id)}
                                                    onFillForm={() => handleFillRoutineForm(routine.id)}
                                                    isCompressed={isCompressed}
                                                    shift={selectedShift}
                                                />
                                            ))}
                                        </ul>

                                        {filteredRoutines.length === 0 && searchTerm && (
                                            <div className={cn(
                                                "text-center text-muted-foreground",
                                                isCompressed ? "py-4 text-sm" : "py-8"
                                            )}>
                                                Nenhuma rotina encontrada para "{searchTerm}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão para adicionar nova rotina quando já existem rotinas */}
                                    <div className={cn(
                                        "flex justify-center transition-all duration-200 ease-in-out",
                                        isCompressed ? "py-2" : "py-4"
                                    )}>
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
                    <div className="py-4 min-h-[400px] flex items-center justify-center">
                        <div className="w-full">
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
                    </div>
                ),
            },
            {
                id: 'ordem-serviço',
                label: 'Ordens de Manutenção',
                content: (
                    <div className="py-4 min-h-[400px] flex items-center justify-center">
                        <div className="w-full">
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
                    </div>
                ),
            },
            {
                id: 'arquivos',
                label: 'Arquivos',
                content: (
                    <div className="py-4 min-h-[400px] flex items-center justify-center">
                        <div className="w-full">
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
                    </div>
                ),
            },
            {
                id: 'historico',
                label: 'Histórico',
                content: (
                    <div className="py-4 min-h-[400px] flex items-center justify-center">
                        <div className="w-full">
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
                    ) : (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {asset?.asset_type && (
                                <Link href={route('asset-hierarchy.tipos-ativo.show', asset.asset_type.id)} className="hover:underline">
                                    {asset.asset_type.name}
                                </Link>
                            )}
                            {asset?.serial_number && (
                                <>
                                    {asset?.asset_type && <span className="text-muted-foreground">•</span>}
                                    <span className="text-muted-foreground">S/N: {asset.serial_number}</span>
                                </>
                            )}
                            {asset?.part_number && (
                                <>
                                    {(asset?.asset_type || asset?.serial_number) && <span className="text-muted-foreground">•</span>}
                                    <span className="text-muted-foreground">P/N: {asset.part_number}</span>
                                </>
                            )}
                            {!asset?.asset_type && !asset?.serial_number && !asset?.part_number && (
                                <span className="text-muted-foreground">Sem informações adicionais</span>
                            )}
                        </span>
                    )
                }
                breadcrumbs={breadcrumbs}
                editRoute={isCreating ? '' : (asset ? route('asset-hierarchy.assets.edit', asset.id) : '')}
                backRoute={route('asset-hierarchy.assets')}
                tabs={tabs}
                defaultActiveTab={tabFromUrl || undefined}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
            />
        </AppLayout>
    );
}
