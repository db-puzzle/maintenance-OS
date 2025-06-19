import AssetFormComponent from '@/components/AssetFormComponent';
import AssetRuntimeInput from '@/components/AssetRuntimeInput';
import CreateRoutineButton from '@/components/CreateRoutineButton';
import CreateShiftSheet from '@/components/CreateShiftSheet';
import InlineRoutineForm from '@/components/InlineRoutineForm';
import InlineRoutineFormEditor from '@/components/InlineRoutineFormEditor';
import RoutineList from '@/components/RoutineList';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftSelectionCard, { ShiftSelectionCardRef } from '@/components/ShiftSelectionCard';
import ShiftTableView from '@/components/ShiftTableView';
import EmptyCard from '@/components/ui/empty-card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { type Area, type Asset, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Calendar, CalendarClock, Clock, FileText, MessageSquare, Search, Table } from 'lucide-react';
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
    const { url } = usePage<any>();

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

    // Estado para rastrear a rotina recém-criada (apenas para ordenação)
    const [newlyCreatedRoutineId, setNewlyCreatedRoutineId] = useState<number | null>(null);

    // Estado para controlar o preenchimento da rotina
    const [fillingRoutineId, setFillingRoutineId] = useState<number | null>(null);

    // Estado para controlar o carregamento do formulário
    const [loadingFormEditor, setLoadingFormEditor] = useState(false);

    // Refs para os componentes RoutineList
    const routineListRefs = useRef<{ [key: number]: { focusAddTasksButton: () => void } | null }>({});

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

    // Referência para o CreateRoutineButton
    const createRoutineButtonRef = useRef<HTMLButtonElement>(null);
    const shiftSelectionRef = useRef<ShiftSelectionCardRef>(null);

    // Filtrar rotinas baseado no termo de busca
    const filteredRoutines = routines.filter(
        (routine) =>
            routine.name.toLowerCase().includes(searchTerm.toLowerCase()) || routine.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Ordenar rotinas para colocar a recém-criada no topo
    const sortedRoutines = [...filteredRoutines].sort((a, b) => {
        // Se uma das rotinas é a recém-criada, ela vai para o topo
        if (a.id === newlyCreatedRoutineId) return -1;
        if (b.id === newlyCreatedRoutineId) return 1;
        // Caso contrário, manter a ordem original
        return 0;
    });

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
            // Check if the routine exists in the current state
            const routineExists = routines.some((r) => r.id === newRoutineId);

            if (!routineExists) {
                // If the routine doesn't exist in state, it means we need to find it
                // It should be in the asset's routines that were loaded from the backend
                const newRoutine = asset?.routines?.find((r) => r.id === newRoutineId);

                if (newRoutine) {
                    // Add it to the state at the beginning of the array
                    setRoutines([newRoutine, ...routines]);
                }
            }

            // Set the newly created routine ID for sorting
            setNewlyCreatedRoutineId(newRoutineId);

            // Small delay to ensure the UI is ready and the RoutineList component is mounted
            setTimeout(() => {
                // Focus the "Adicionar Tarefas" button for the new routine
                const routineListRef = routineListRefs.current[newRoutineId];
                if (routineListRef) {
                    routineListRef.focusAddTasksButton();
                }
            }, 500);
        }
    }, [newRoutineId, tabFromUrl, asset?.routines]);

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

            const shiftsData = response.data.shifts || [];
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

    const handleEditRoutineForm = async (routineId: number) => {
        // First, fetch the complete routine data with form
        setLoadingFormEditor(true);
        try {
            const url = route('maintenance.routines.form-data', routineId);

            const response = await axios.get(url);
            const routineWithForm = response.data.routine;

            // Update the routine in the state with the fetched data
            setRoutines(routines.map((r) => (r.id === routineId ? { ...r, ...routineWithForm } : r)));

            // Then set the editing state
            setEditingRoutineFormId(routineId);
            // Ativar modo comprimido ao editar formulário
            setIsCompressed(true);
        } catch (error: any) {
            // More specific error message
            if (error.response?.status === 404) {
                toast.error('Rotina não encontrada');
            } else if (error.response?.status === 500) {
                toast.error('Erro no servidor ao carregar formulário');
            } else {
                toast.error('Erro ao carregar dados do formulário');
            }
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
    };

    const handleCloseFormFiller = () => {
        setFillingRoutineId(null);
        setIsCompressed(false);
    };

    const handleFormSaved = (formData: any) => {
        // Atualizar a rotina com o novo formulário
        setRoutines(
            routines.map((r) => {
                if (r.id === editingRoutineFormId) {
                    return { ...r, form: formData };
                }
                return r;
            }),
        );
        setEditingRoutineFormId(null);
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
                      content: (
                          <div className="min-h-full space-y-4">
                              {loadingFormEditor ? (
                                  // Show loading state while fetching form data
                                  <div className="flex min-h-[400px] items-center justify-center">
                                      <div className="text-center">
                                          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
                                          <p className="text-muted-foreground">Carregando formulário...</p>
                                      </div>
                                  </div>
                              ) : editingRoutineFormId ? (
                                  // Mostrar o editor de formulário inline
                                  (() => {
                                      const routine = routines.find((r) => r.id === editingRoutineFormId);
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
                                      const routine = routines.find((r) => r.id === fillingRoutineId);
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
                                  <div className="flex min-h-[400px] items-center justify-center py-4">
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
                                          <div
                                              className={cn(
                                                  'transition-all duration-200 ease-in-out',
                                                  isCompressed ? 'mt-4 mb-4 px-4' : 'mt-4 mb-4 px-4',
                                              )}
                                          >
                                              <div className="relative">
                                                  <Search
                                                      className={cn(
                                                          'text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2',
                                                          isCompressed ? 'h-4 w-4' : 'h-5 w-5',
                                                      )}
                                                  />
                                                  <Input
                                                      type="text"
                                                      placeholder="Buscar rotinas..."
                                                      value={searchTerm}
                                                      onChange={(e) => setSearchTerm(e.target.value)}
                                                      className={cn('bg-background max-w-sm', isCompressed ? 'h-8 pl-9' : 'pl-10')}
                                                  />
                                              </div>
                                          </div>

                                          <div className={cn('transition-all duration-200 ease-in-out', isCompressed ? 'px-2' : 'px-4')}>
                                              <ul role="list" className="divide-y divide-gray-100 border-t border-b border-gray-100">
                                                  {sortedRoutines.map((routine) => (
                                                      <li key={routine.id}>
                                                          <RoutineList
                                                              routine={routine}
                                                              onSave={handleSaveRoutine}
                                                              onDelete={handleDeleteRoutine}
                                                              assetId={asset?.id}
                                                              onEditForm={() => handleEditRoutineForm(routine.id)}
                                                              onFillForm={() => handleFillRoutineForm(routine.id)}
                                                              isCompressed={isCompressed}
                                                              shift={selectedShift}
                                                              ref={(el) => {
                                                                  if (routine.id) {
                                                                      routineListRefs.current[routine.id] = el;
                                                                  }
                                                              }}
                                                          />
                                                      </li>
                                                  ))}
                                              </ul>

                                              {sortedRoutines.length === 0 && searchTerm && (
                                                  <div className={cn('text-muted-foreground text-center', isCompressed ? 'py-4 text-sm' : 'py-8')}>
                                                      Nenhuma rotina encontrada para "{searchTerm}"
                                                  </div>
                                              )}
                                          </div>

                                          {/* Botão para adicionar nova rotina quando já existem rotinas */}
                                          <div
                                              className={cn(
                                                  'flex justify-center transition-all duration-200 ease-in-out',
                                                  isCompressed ? 'py-2' : 'py-4',
                                              )}
                                          >
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
                                  <CreateRoutineButton
                                      ref={createRoutineButtonRef}
                                      onSuccess={handleCreateSuccess}
                                      text="Nova Rotina"
                                      assetId={asset?.id}
                                  />
                              </div>
                          </div>
                      ),
                  },
                  {
                      id: 'chamados',
                      label: 'Chamados de Usuário',
                      content: (
                          <div className="flex min-h-[400px] items-center justify-center py-4">
                              <div className="w-full">
                                  <EmptyCard
                                      icon={MessageSquare}
                                      title="Nenhum chamado registrado"
                                      description="Registre chamados para este ativo"
                                      primaryButtonText="Novo chamado"
                                      primaryButtonAction={() => {}}
                                      secondaryButtonText="Ver histórico"
                                      secondaryButtonAction={() => {}}
                                  />
                              </div>
                          </div>
                      ),
                  },
                  {
                      id: 'ordem-serviço',
                      label: 'Ordens de Manutenção',
                      content: (
                          <div className="flex min-h-[400px] items-center justify-center py-4">
                              <div className="w-full">
                                  <EmptyCard
                                      icon={FileText}
                                      title="Nenhuma ordem de serviço"
                                      description="Registre ordens de serviço para este ativo"
                                      primaryButtonText="Nova ordem de serviço"
                                      primaryButtonAction={() => {}}
                                      secondaryButtonText="Ver histórico"
                                      secondaryButtonAction={() => {}}
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
                                      primaryButtonAction={() => {}}
                                      secondaryButtonText="Ver histórico"
                                      secondaryButtonAction={() => {}}
                                  />
                              </div>
                          </div>
                      ),
                  },
                  {
                      id: 'historico',
                      label: 'Histórico',
                      content: (
                          <div className="flex min-h-[400px] items-center justify-center py-4">
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
                title={isCreating ? 'Novo Ativo' : asset?.tag || 'Ativo'}
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
                editRoute={isCreating ? '' : asset ? route('asset-hierarchy.assets.edit', asset.id) : ''}
                tabs={tabs}
                defaultActiveTab={tabFromUrl || undefined}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
            />
        </AppLayout>
    );
}
