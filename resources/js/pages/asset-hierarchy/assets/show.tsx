import AssetFormComponent from '@/components/AssetFormComponent';
import AssetRuntimeInput from '@/components/AssetRuntimeInput';
import AssetRoutinesTab from '@/components/AssetRoutinesTab';
import CreateShiftSheet from '@/components/CreateShiftSheet';
import ExecutionHistory from '@/components/ExecutionHistory';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftSelectionCard, { ShiftSelectionCardRef } from '@/components/ShiftSelectionCard';
import ShiftTableView from '@/components/ShiftTableView';
import EmptyCard from '@/components/ui/empty-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Calendar, Clock, FileText, MessageSquare, Table } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
        routines?: Array<{
            id: number;
            name: string;
            description?: string;
            form?: unknown;
            form_id?: number;
            trigger_type: 'runtime_hours' | 'calendar_days';
            trigger_runtime_hours?: number;
            trigger_calendar_days?: number;
            execution_mode: 'automatic' | 'manual';
            advance_generation_hours?: number;
            auto_approve_work_orders?: boolean;
            default_priority?: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
            priority_score?: number;
            last_execution_runtime_hours?: number;
            last_execution_completed_at?: string;
            [key: string]: unknown;
        }>;
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
    const page = usePage<{
        flash?: { success?: string };
        auth: {
            user: any;
            permissions: string[];
        };
    }>();
    const { url } = page;
    const userPermissions = page.props.auth?.permissions || [];

    // Extrai o parâmetro tab da URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const tabFromUrl = urlParams.get('tab');

    // Define breadcrumbs with dynamic asset tag
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset?.tag || 'Novo Ativo',
            href: '#',
        },
    ];

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<
        Array<{
            id: number;
            name: string;
            description?: string;
            form?: unknown;
            form_id?: number;
            trigger_type: 'runtime_hours' | 'calendar_days';
            trigger_runtime_hours?: number;
            trigger_calendar_days?: number;
            execution_mode: 'automatic' | 'manual';
            advance_generation_hours?: number;
            auto_approve_work_orders?: boolean;
            default_priority?: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
            priority_score?: number;
            last_execution_runtime_hours?: number;
            last_execution_completed_at?: string;
            [key: string]: unknown;
        }>
    >(asset?.routines || []);

    // Update routines when asset prop changes
    useEffect(() => {
        if (asset?.routines) {
            setRoutines(asset.routines);
        }
    }, [asset?.routines]);

    // Estado para controlar o modo comprimido
    const [isCompressed, setIsCompressed] = useState(false);

    // Estados para turnos
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState<string>(asset?.shift_id?.toString() || '');
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
    const [createShiftSheetOpen, setCreateShiftSheetOpen] = useState(false);

    // Estado para modo de edição dos turnos
    const [isEditingShift, setIsEditingShift] = useState(false);
    const [tempSelectedShiftId, setTempSelectedShiftId] = useState<string>('');

    // Referência para o ShiftSelectionCard
    const shiftSelectionRef = useRef<ShiftSelectionCardRef>(null);

    const handleAssetCreated = () => {
        // This will be called after successful asset creation
        // The AssetFormComponent will handle the redirect
    };

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
            const shift = shifts.find((s) => s.id.toString() === shiftIdToLoad);
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
                    format: 'json',
                },
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            // The response is paginated, so we need to extract the data array
            const shiftsData = response.data.shifts?.data || response.data.shifts || [];
            setShifts(shiftsData);

            if (shiftsData.length === 0) {
                toast.info('Nenhum turno cadastrado.');
            }
        } catch {
            toast.error('Erro ao carregar turnos');
        } finally {
            setLoadingShifts(false);
        }
    };

    const loadShiftDetails = async (shiftId: number) => {
        try {
            const response = await axios.get(route('asset-hierarchy.shifts.show', shiftId), {
                params: { format: 'json' },
            });
            setSelectedShift(response.data.shift);
        } catch {
            // Error loading shift details
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
                    shift_id: tempSelectedShiftId || null,
                });
                setSelectedShiftId(tempSelectedShiftId);
                toast.success('Turno associado ao ativo');

                // Reload the page to refresh runtime data
                router.reload();
            } catch {
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

        // Close the sheet
        setCreateShiftSheetOpen(false);

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
                    await axios.patch(
                        route('asset-hierarchy.assets.update', asset.id),
                        {
                            shift_id: newShiftId,
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json',
                            },
                        },
                    );
                    toast.success('Turno criado e associado ao ativo');
                } catch {
                    toast.error('Erro ao associar turno ao ativo');
                }
            }
        }
    };

    const handleShiftUpdated = (updatedShift: Shift) => {
        // Update the shift in the list
        setShifts(shifts.map((shift) => (shift.id === updatedShift.id ? updatedShift : shift)));

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
        setCreateShiftSheetOpen(true);
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
                <div className="py-8">
                    <AssetFormComponent
                        asset={asset}
                        plants={plants}
                        assetTypes={assetTypes}
                        manufacturers={manufacturers}
                        initialMode={isCreating ? 'edit' : 'view'}
                        onSuccess={isCreating ? handleAssetCreated : undefined}
                    />
                </div>
            ),
        },
        ...(isCreating
            ? []
            : [
                {
                    id: 'shifts-runtime',
                    label: 'Turnos & Horas',
                    content: (
                        <div className="space-y-6 py-6">
                            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
                                {/* First Column - Runtime Input */}
                                <div className="h-full">
                                    <AssetRuntimeInput
                                        assetId={asset?.id}
                                        runtimeData={asset?.runtime_data}
                                        onRuntimeUpdated={() => {
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
                                            <TabsTrigger value="calendar" className="flex flex-1 items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Calendário
                                            </TabsTrigger>
                                            <TabsTrigger value="table" className="flex flex-1 items-center gap-2">
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
                            <CreateShiftSheet
                                isOpen={createShiftSheetOpen}
                                onOpenChange={setCreateShiftSheetOpen}
                                showTrigger={false}
                                onSuccess={handleShiftCreated}
                            />
                        </div>
                    ),
                },
                {
                    id: 'rotinas',
                    label: 'Rotinas',
                    content: (() => {
                        return (
                            <div className="min-h-full space-y-4">
                                <AssetRoutinesTab
                                    assetId={asset!.id}
                                    routines={routines}
                                    selectedShift={selectedShift}
                                    newRoutineId={newRoutineId}
                                    userPermissions={userPermissions}
                                />
                            </div>
                        );
                    })(),
                },
                {
                    id: 'ordem-serviço',
                    label: 'Ordens de Serviço',
                    content: (
                        <div className="flex min-h-[400px] items-center justify-center py-4">
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
                        <div className="flex min-h-[400px] items-center justify-center py-4">
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
                        <div className="space-y-6 py-6">
                            <ExecutionHistory assetId={asset?.id} />
                        </div>
                    ),
                },
            ]),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Novo Ativo' : `Ativo ${asset?.tag}`} />

            <ShowLayout
                title={isCreating ? 'Novo Ativo' : asset?.tag || 'Ativo'}
                subtitle={
                    isCreating ? (
                        'Criação de novo ativo'
                    ) : (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {asset?.asset_type && (
                                <Link href={route('asset-hierarchy.asset-types.show', asset.asset_type.id)} className="hover:underline">
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
                editRoute={isCreating ? '' : asset ? route('asset-hierarchy.assets.edit', asset.id) : ''}
                tabs={tabs}
                defaultActiveTab={tabFromUrl || undefined}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
            />
        </AppLayout>
    );
}
