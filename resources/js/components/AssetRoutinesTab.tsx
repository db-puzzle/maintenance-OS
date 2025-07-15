import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Upload, FileText, Edit2, History, Info, Clock, Hand, Plus, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { ColumnConfig } from '@/types/shared';
import FormStatusBadge, { getFormState } from '@/components/form-lifecycle/FormStatusBadge';
import { FormVersionHistory } from '@/components/form-lifecycle';
import CreateRoutineButton from '@/components/CreateRoutineButton';
import EditRoutineSheet from '@/components/EditRoutineSheet';
import InlineRoutineFormEditor from '@/components/InlineRoutineFormEditor';
import { CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/task';

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

interface Routine {
    id: number;
    name: string;
    description?: string;
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
    last_execution_form_version_id?: number;
    form?: {
        id: number;
        tasks: Task[];
        isDraft?: boolean;
        currentVersionId?: number | null;
        current_version_id?: number | null;
        has_draft_changes?: boolean;
        current_version?: {
            id?: number;
            version_number: string;
            published_at?: string;
        };
    };
    lastExecutionFormVersion?: {
        id: number;
        version_number: number;
    };
    [key: string]: unknown;
}

interface AssetRoutinesTabProps {
    assetId: number;
    routines: Routine[];
    selectedShift?: Shift | null;
    newRoutineId?: number;
    userPermissions?: string[];
}

export default function AssetRoutinesTab({
    assetId,
    routines: initialRoutines,
    selectedShift,
    newRoutineId
}: AssetRoutinesTabProps) {

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<Routine[]>(() => {
        // Validate initial routines to ensure they have required properties
        return (initialRoutines || []).filter(r => r && r.id && r.name);
    });

    // Update routines when prop changes
    useEffect(() => {
        // Validate routines before setting them
        const validRoutines = (initialRoutines || []).filter(r => r && r.id && r.name);
        setRoutines(validRoutines);
    }, [initialRoutines]);

    // Estado para controlar qual rotina está sendo editada
    const [editingRoutineFormId, setEditingRoutineFormId] = useState<number | null>(null);

    // Estado para busca de rotinas
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para rastrear a rotina recém-criada (apenas para ordenação)
    const [newlyCreatedRoutineId, setNewlyCreatedRoutineId] = useState<number | null>(null);



    // Estado para controlar o carregamento do formulário
    const [loadingFormEditor, setLoadingFormEditor] = useState(false);

    // Estado para controlar o modal de histórico de versões
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [selectedRoutineForHistory, setSelectedRoutineForHistory] = useState<number | null>(null);

    // Estado para controlar o modal de aviso de nova versão
    const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
    const [routineToEdit, setRoutineToEdit] = useState<number | null>(null);

    // Estados para controle do modal de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [routineToDelete, setRoutineToDelete] = useState<any>(null);

    // Estado para controlar o EditRoutineSheet
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [routineToEditInSheet, setRoutineToEditInSheet] = useState<any>(null);

    // Create a stable default routine object
    const defaultRoutine = {
        name: '',
        trigger_hours: 0,
        status: 'Active' as const,
        description: '',
    };

    // Refs
    const createRoutineButtonRef = useRef<HTMLButtonElement>(null);
    const addTasksButtonRef = useRef<HTMLButtonElement>(null);

    // Check for new routine
    useEffect(() => {

        if (newRoutineId) {
            // Set the newly created routine ID for sorting
            setNewlyCreatedRoutineId(newRoutineId);

            // Small delay to ensure the UI is ready
            setTimeout(() => {
                // Focus the "Adicionar Tarefas" button for the new routine
                const button = document.querySelector(`[data-routine-id="${newRoutineId}"]`) as HTMLButtonElement;
                if (button) {
                    button.focus();
                }
            }, 500);
        }
    }, [newRoutineId]);

    // Filtrar rotinas baseado no termo de busca
    const filteredRoutines = routines.filter(
        (routine) => {
            if (!routine || !routine.name) return false;
            const nameMatch = routine.name.toLowerCase().includes(searchTerm.toLowerCase());
            const descriptionMatch = routine.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
            return nameMatch || descriptionMatch;
        }
    );

    // Ordenar rotinas para colocar a recém-criada no topo
    const sortedRoutines = [...filteredRoutines].sort((a, b) => {
        // Se uma das rotinas é a recém-criada, ela vai para o topo
        if (a.id === newlyCreatedRoutineId) return -1;
        if (b.id === newlyCreatedRoutineId) return 1;
        // Caso contrário, manter a ordem original
        return 0;
    });

    // Helper function to calculate shift work hours per week
    const calculateShiftHoursPerWeek = (shift: Shift | null | undefined): number => {
        if (!shift?.schedules) return 0;

        let totalMinutes = 0;

        shift.schedules.forEach((schedule) => {
            schedule.shifts.forEach((shiftTime) => {
                if (shiftTime.active) {
                    const [startHours, startMinutes] = shiftTime.start_time.split(':').map(Number);
                    const [endHours, endMinutes] = shiftTime.end_time.split(':').map(Number);

                    const startTotalMinutes = startHours * 60 + startMinutes;
                    let endTotalMinutes = endHours * 60 + endMinutes;

                    // Handle shifts that cross midnight
                    if (endTotalMinutes < startTotalMinutes) {
                        endTotalMinutes += 24 * 60;
                    }

                    const shiftDuration = endTotalMinutes - startTotalMinutes;
                    totalMinutes += shiftDuration;

                    // Subtract break time
                    shiftTime.breaks.forEach((breakTime) => {
                        const [breakStartHours, breakStartMinutes] = breakTime.start_time.split(':').map(Number);
                        const [breakEndHours, breakEndMinutes] = breakTime.end_time.split(':').map(Number);

                        const breakStartTotalMinutes = breakStartHours * 60 + breakStartMinutes;
                        let breakEndTotalMinutes = breakEndHours * 60 + breakEndMinutes;

                        if (breakEndTotalMinutes < breakStartTotalMinutes) {
                            breakEndTotalMinutes += 24 * 60;
                        }

                        totalMinutes -= breakEndTotalMinutes - breakStartTotalMinutes;
                    });
                }
            });
        });

        return totalMinutes / 60; // Return hours
    };

    const formatTriggerHours = (hours: number | undefined) => {
        if (!hours) return { hoursText: 'N/A', workDaysText: null };

        const shiftHoursPerWeek = calculateShiftHoursPerWeek(selectedShift);

        // Base hours format - always show in hours as stored in database
        const hoursText = `${hours} hora${hours !== 1 ? 's' : ''}`;

        // Work days estimate
        let workDaysText = null;
        if (selectedShift && shiftHoursPerWeek > 0) {
            const shiftHoursPerDay = shiftHoursPerWeek / 7;
            const workDays = hours / shiftHoursPerDay;

            if (workDays < 1) {
                workDaysText = 'menos de 1 dia de trabalho';
            } else {
                const days = Math.round(workDays);
                workDaysText = `${days} dia${days !== 1 ? 's' : ''} de trabalho`;
            }
        }

        return { hoursText, workDaysText };
    };

    const getRoutineColumns = (): ColumnConfig[] => [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[200px]',
            render: (value) => (
                <div className="font-medium">{String(value || 'Sem nome')}</div>
            ),
        },
        {
            key: 'execution_mode',
            label: 'Modo de Execução',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => {
                const executionMode = value as 'automatic' | 'manual';
                return (
                    <div className="flex items-center gap-2">
                        {executionMode === 'automatic' ? (
                            <>
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Automático</span>
                            </>
                        ) : (
                            <>
                                <Hand className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Manual</span>
                            </>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'trigger_info',
            label: 'Trigger',
            sortable: true,
            width: 'w-[180px]',
            render: (value, row) => {
                const routine = row as Routine;
                const triggerIcon = routine.trigger_type === 'runtime_hours' ? '⏱️' : '📅';
                const triggerValue = routine.trigger_type === 'runtime_hours'
                    ? routine.trigger_runtime_hours
                    : routine.trigger_calendar_days;
                const triggerUnit = routine.trigger_type === 'runtime_hours' ? 'h' : 'd';

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                            {routine.trigger_type === 'runtime_hours' ? (
                                <Clock className="h-3 w-3" />
                            ) : (
                                <CalendarRange className="h-3 w-3" />
                            )}
                            <span>{triggerValue}{triggerUnit} {triggerIcon}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {routine.trigger_type === 'runtime_hours' ? 'Horas de operação' : 'Dias calendário'}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'last_execution',
            label: 'Última Execução',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const routine = row as Routine;
                if (!routine.last_execution_completed_at) {
                    return <span className="text-muted-foreground text-sm">Nunca executada</span>;
                }

                return (
                    <div className="space-y-1">
                        <div className="text-sm">
                            {new Date(routine.last_execution_completed_at).toLocaleDateString('pt-BR')}
                        </div>
                        {routine.last_execution_form_version_id && routine.lastExecutionFormVersion && (
                            <div className="text-xs text-muted-foreground">
                                Versão: v{routine.lastExecutionFormVersion.version_number}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'tasks_count',
            label: 'Tarefas',
            sortable: false,
            width: 'w-[120px]',
            render: (value, row) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const form = (row as any).form;

                if (!form || !form.tasks || form.tasks.length === 0) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                return (
                    <span className="text-sm">
                        {form.tasks.length} tarefa{form.tasks.length !== 1 ? 's' : ''}
                    </span>
                );
            },
        },
        {
            key: 'version',
            label: 'Versão',
            sortable: false,
            width: 'w-[100px]',
            render: (value, row) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const form = (row as any).form;

                if (!form) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }

                if (form.current_version) {
                    return (
                        <span className="text-sm font-medium">
                            v{form.current_version.version_number}
                        </span>
                    );
                }

                return <span className="text-sm text-muted-foreground">-</span>;
            },
        },
        {
            key: 'form_status',
            label: 'Status do Formulário',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => {
                const form = (row as Record<string, unknown>).form;
                if (!form) {
                    return (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            Sem formulário
                        </span>
                    );
                }

                return (
                    <FormStatusBadge
                        form={{
                            id: (form as any).id || 0,
                            ...form,
                            current_version_id: (form as any).current_version_id ?? null,
                        }}
                        size="sm"
                    />
                );
            },
        },
    ];

    // Handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreateSuccess = (routine: any) => {
        // Add the new routine to the state
        if (routine && routine.id) {
            setRoutines((prevRoutines) => [...prevRoutines, routine]);
        }
    };

    const handleEditRoutineForm = async (routineId: number) => {
        // First, fetch the complete routine data with form
        setLoadingFormEditor(true);
        try {
            const url = route('maintenance.routines.form-data', routineId);

            const response = await axios.get(url);
            const routineWithForm = response.data.routine;

            // Update the routine in the state with the fetched data
            setRoutines((prevRoutines) =>
                prevRoutines.map((r) => (r.id === routineId ? { ...r, ...routineWithForm } : r))
            );

            // Then set the editing state
            setEditingRoutineFormId(routineId);
        } catch (error) {
            // More specific error message
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status === 404) {
                toast.error('Rotina não encontrada');
            } else if (axiosError.response?.status === 500) {
                toast.error('Erro no servidor ao carregar formulário');
            } else {
                toast.error('Erro ao carregar dados do formulário');
            }
        } finally {
            setLoadingFormEditor(false);
        }
    };

    const handleCloseFormEditor = () => {
        setEditingRoutineFormId(null);
    };

    const handleFormSaved = (formData: unknown) => {
        // Atualizar a rotina com o novo formulário
        setRoutines((prevRoutines) =>
            prevRoutines.map((r) => {
                if (r.id === editingRoutineFormId) {
                    return { ...r, form: formData as Routine['form'] };
                }
                return r;
            }),
        );
        setEditingRoutineFormId(null);
        toast.success('Formulário da rotina atualizado com sucesso!');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditRoutine = (routine: any) => {
        setRoutineToEditInSheet(routine);
        setEditSheetOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditRoutineSuccess = (updatedRoutine: any) => {
        setEditSheetOpen(false);
        setRoutineToEditInSheet(null);
        // Update the routine in the state
        setRoutines((prevRoutines) =>
            prevRoutines.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r))
        );
        toast.success('Rotina atualizada com sucesso!');
        // Reload to refresh form data
        router.reload();
    };

    const handleSheetOpenChange = (open: boolean) => {
        setEditSheetOpen(open);
        if (!open) {
            setRoutineToEditInSheet(null);
        }
    };

    const handleShowVersionHistory = (routineId: number) => {
        setSelectedRoutineForHistory(routineId);
        setShowVersionHistory(true);
    };

    const handlePublishForm = async (routineId: number) => {
        router.post(
            route('maintenance.routines.forms.publish', {
                routine: routineId,
            }),
            {},
            {
                onSuccess: () => {
                    toast.success('Formulário publicado com sucesso!');
                    // Reload routines to reflect the change
                    router.reload();
                },
                onError: () => {
                    toast.error('Erro ao publicar formulário');
                },
            }
        );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditFormClick = (routine: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formState = routine.form ? getFormState(routine.form as any) : null;

        // Check if form is published (not unpublished and not already in draft)
        if (formState === 'published') {
            // Show warning dialog for published forms
            setRoutineToEdit(routine.id);
            setShowNewVersionDialog(true);
        } else {
            // For unpublished or draft forms, edit directly
            handleEditRoutineForm(routine.id);
        }
    };

    const confirmEditForm = () => {
        if (routineToEdit) {
            handleEditRoutineForm(routineToEdit);
        }
        setShowNewVersionDialog(false);
        setRoutineToEdit(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDeleteClick = (routine: any) => {
        setRoutineToDelete(routine);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!routineToDelete?.id) return;

        setIsDeleting(true);
        router.delete(route('maintenance.routines.destroy', { routine: routineToDelete.id }), {
            onSuccess: () => {
                toast.success('Rotina excluída com sucesso!');
                setShowDeleteDialog(false);
                setConfirmationText('');
                setIsDeleting(false);
                // Remove from state
                setRoutines((prevRoutines) => prevRoutines.filter((r) => r.id !== routineToDelete.id));
                setRoutineToDelete(null);
            },
            onError: () => {
                toast.error('Erro ao excluir rotina. Tente novamente.');
                setIsDeleting(false);
            },
        });
    };

    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setConfirmationText('');
        setRoutineToDelete(null);
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleViewExecutions = (routineId: number) => {
        // Navigate to work orders filtered by this routine
        router.visit(`/maintenance/work-orders?source_type=routine&source_id=${routineId}&asset_id=${assetId}`);
    };

    const handleCreateWorkOrder = async (routineId: number) => {
        try {
            const response = await axios.post(route('maintenance.assets.routines.create-work-order', {
                asset: assetId,
                routine: routineId
            }));

            if (response.data.success) {
                toast.success('Ordem de serviço criada com sucesso!');
                if (response.data.redirect) {
                    router.visit(response.data.redirect);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao criar ordem de serviço');
        }
    };

    const isRoutineDue = (routine: Routine): boolean => {
        // This is a simplified check - ideally this would come from the backend
        if (!routine.last_execution_runtime_hours) {
            return true; // Never executed, so it's due
        }
        // You might want to add more logic here based on current runtime vs trigger hours
        return true;
    };

    if (loadingFormEditor) {
        // Show loading state while fetching form data
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
                    <p className="text-muted-foreground">Carregando formulário...</p>
                </div>
            </div>
        );
    }

    if (editingRoutineFormId) {
        // Mostrar o editor de formulário inline
        const routine = routines.find((r) => r.id === editingRoutineFormId);
        if (!routine) return null;

        return (
            <InlineRoutineFormEditor
                routine={routine}
                assetId={assetId}
                onClose={handleCloseFormEditor}
                onSuccess={handleFormSaved}
            />
        );
    }



    return (
        <>
            {/* Lista de rotinas existentes */}
            <div className="space-y-4 mt-4">
                {/* Search bar */}
                <div className="flex items-center justify-between">
                    <div className="relative max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Buscar rotinas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <CreateRoutineButton
                        onSuccess={handleCreateSuccess}
                        text="Nova Rotina"
                        variant="default"
                        assetId={assetId}
                    />
                </div>

                {/* Routines table */}
                <EntityDataTable
                    data={sortedRoutines}
                    columns={getRoutineColumns()}
                    loading={false}
                    emptyMessage={searchTerm ? `Nenhuma rotina encontrada para "${searchTerm}"` : "Nenhuma rotina cadastrada. Clique em 'Nova Rotina' para começar."}
                    actions={(routine) => (
                        <div className="flex items-center justify-end gap-2">
                            {/* Main action button */}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 ? (
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                getFormState(routine.form as any) === 'unpublished' ? (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePublishForm(routine.id);
                                        }}
                                    >
                                        <Upload className="mr-1 h-4 w-4" />
                                        Publicar
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateWorkOrder(routine.id);
                                        }}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        Criar Ordem de Serviço
                                    </Button>
                                )
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditFormClick(routine);
                                    }}
                                    data-routine-id={routine.id}
                                    ref={routine.id === newlyCreatedRoutineId ? addTasksButtonRef : undefined}
                                >
                                    <FileText className="mr-1 h-4 w-4" />
                                    Adicionar Tarefas
                                </Button>
                            )}

                            {/* Actions dropdown */}
                            <EntityActionDropdown
                                onEdit={() => handleEditRoutine(routine)}
                                onDelete={() => handleDeleteClick(routine)}
                                additionalActions={[
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) === 'unpublished' ? [{
                                        label: 'Publicar',
                                        icon: <Upload className="h-4 w-4" />,
                                        onClick: () => handlePublishForm(routine.id),
                                    }] : []),
                                    {
                                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                        label: routine.form && (routine.form as any).has_draft_changes ? 'Editar Tarefas' :
                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                            routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 ? 'Editar Tarefas' :
                                                'Adicionar Tarefas',
                                        icon: <FileText className="h-4 w-4" />,
                                        onClick: () => handleEditFormClick(routine),
                                    },
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).has_draft_changes && (routine.form as any).current_version_id ? [{
                                        label: `Ver Versão Publicada (v${(routine.form as any).current_version?.version_number || '1.0'})`,
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => router.visit(route('maintenance.routines.view-published-version', { routine: routine.id })),
                                    }] : []),
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).current_version_id ? [{
                                        label: 'Ver Histórico de Versões',
                                        icon: <History className="h-4 w-4" />,
                                        onClick: () => handleShowVersionHistory(routine.id),
                                    }] : []),
                                ]}
                            />
                        </div>
                    )}
                />

                {/* Pagination if needed */}
                {sortedRoutines.length > 10 && (
                    <EntityPagination
                        pagination={{
                            current_page: 1,
                            last_page: Math.ceil(sortedRoutines.length / 10),
                            per_page: 10,
                            total: sortedRoutines.length,
                            from: 1,
                            to: Math.min(10, sortedRoutines.length),
                        }}
                        onPageChange={() => { }}
                        onPerPageChange={() => { }}
                    />
                )}
            </div>

            {/* EditRoutineSheet - Always rendered but controlled via isOpen */}
            <EditRoutineSheet
                showTrigger={false}
                routine={routineToEditInSheet || defaultRoutine}
                isNew={false}
                assetId={assetId}
                onSuccess={handleEditRoutineSuccess}
                isOpen={editSheetOpen}
                onOpenChange={handleSheetOpenChange}
            />

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar exclusão</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a rotina "{routineToDelete?.name}"? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
                            <Input
                                id="confirmation"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="EXCLUIR"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={cancelDelete}>
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={confirmDelete} disabled={!isConfirmationValid || isDeleting}>
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Histórico de Versões */}
            {selectedRoutineForHistory && (
                <FormVersionHistory
                    routineId={selectedRoutineForHistory}
                    isOpen={showVersionHistory}
                    onClose={() => {
                        setShowVersionHistory(false);
                        setSelectedRoutineForHistory(null);
                    }}
                />
            )}

            {/* Modal de Aviso de Nova Versão */}
            <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            Nova versão será criada
                        </DialogTitle>
                        <DialogDescription>
                            Este formulário está publicado na versão{' '}
                            <strong>v{routines.find(r => r.id === routineToEdit)?.form?.current_version?.version_number || '1.0'}</strong>.
                            Ao editar as tarefas, uma cópia de rascunho será criada. As alterações não afetarão a versão atual até que você publique uma nova versão.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Nota:</strong> A versão atual continuará sendo executada até que você publique as alterações como uma nova versão.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowNewVersionDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmEditForm}>Continuar Editando</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CreateRoutineButton oculto para ser acionado programaticamente */}
            <div style={{ display: 'none' }}>
                <CreateRoutineButton
                    ref={createRoutineButtonRef}
                    onSuccess={handleCreateSuccess}
                    text="Nova Rotina"
                    assetId={assetId}
                />
            </div>
        </>
    );
} 