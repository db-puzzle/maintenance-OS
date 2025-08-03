import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Upload, FileText, Edit2, History, Info, Clock, Hand, Plus, Eye, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
    advance_generation_days?: number;
    auto_approve_work_orders?: boolean;
    priority_score?: number;
    last_execution_runtime_hours?: number;
    last_execution_completed_at?: string;
    last_execution_form_version_id?: number;
    next_execution_date?: string;
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
    isCompressed?: boolean;
}
export default function AssetRoutinesTab({
    assetId,
    routines: initialRoutines,
    selectedShift,
    newRoutineId,
    userPermissions = [],
    isCompressed = false
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
    // Estado para controlar o diálogo de nova rotina
    const [showNewRoutineDialog, setShowNewRoutineDialog] = useState(false);
    const [newRoutineForTasks, setNewRoutineForTasks] = useState<Routine | null>(null);
    const [shownDialogForRoutineIds, setShownDialogForRoutineIds] = useState<Set<number>>(new Set());
    // Estado para controlar o modal de última execução
    const [showLastExecutionDialog, setShowLastExecutionDialog] = useState(false);
    const [routineForLastExecution, setRoutineForLastExecution] = useState<Routine | null>(null);
    const [lastExecutionDate, setLastExecutionDate] = useState('');
    const [isUpdatingLastExecution, setIsUpdatingLastExecution] = useState(false);
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
        if (newRoutineId && !shownDialogForRoutineIds.has(newRoutineId)) {
            // Set the newly created routine ID for sorting
            setNewlyCreatedRoutineId(newRoutineId);
            // Find the newly created routine in the routines array
            const newRoutine = routines.find(r => r.id === newRoutineId);
            if (newRoutine) {
                // Show dialog asking if user wants to add tasks
                setNewRoutineForTasks(newRoutine);
                setShowNewRoutineDialog(true);
                // Mark this routine ID as having shown the dialog
                setShownDialogForRoutineIds(prev => new Set(prev).add(newRoutineId));
            }
            // Small delay to ensure the UI is ready
            setTimeout(() => {
                // Focus the "Adicionar Tarefas" button for the new routine
                const button = document.querySelector(`[data-routine-id="${newRoutineId}"]`) as HTMLButtonElement;
                if (button) {
                    button.focus();
                }
            }, 500);
        }
    }, [newRoutineId, routines, shownDialogForRoutineIds]);
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
            key: 'priority_score',
            label: 'Prioridade',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => {
                const routine = row as Routine;
                const priority = routine.priority_score;
                return (
                    <div className="text-center">
                        <span className="text-sm">
                            {priority || '-'}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'execution_mode',
            label: 'Modo de Execução',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => {
                const executionMode = value as 'automatic' | 'manual';
                return (
                    <div className="flex items-center justify-center gap-2">
                        {executionMode === 'automatic' ? (
                            <>
                                <span className="text-sm font-medium">Automático</span>
                            </>
                        ) : (
                            <>
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
                const triggerValue = routine.trigger_type === 'runtime_hours'
                    ? routine.trigger_runtime_hours
                    : routine.trigger_calendar_days;
                const triggerUnit = routine.trigger_type === 'runtime_hours' ? 'horas operação' : 'dias calendário';
                return (
                    <div className="space-y-1 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                            {routine.trigger_type === 'runtime_hours' ? (
                                <Clock className="h-3 w-3" />
                            ) : (
                                <CalendarRange className="h-3 w-3" />
                            )}
                            <span>{triggerValue} {triggerUnit}</span>
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
            headerAlign: 'center',
            contentAlign: 'center',
            render: (value, row) => {
                const routine = row as Routine;
                if (!routine.last_execution_completed_at) {
                    return <div className="text-center"><span className="text-muted-foreground text-sm">Nunca executada</span></div>;
                }
                // Parse the date string to show the correct date without timezone shifting
                // The date comes as ISO string, we need to extract just the date part
                const dateStr = routine.last_execution_completed_at.split('T')[0];
                const [year, month, day] = dateStr.split('-');
                const displayDate = `${day}/${month}/${year}`;
                return (
                    <div className="space-y-1 text-center">
                        <div className="text-sm">
                            {displayDate}
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
            key: 'next_execution',
            label: 'Próxima Execução',
            sortable: true,
            width: 'w-[220px]',
            headerAlign: 'center',
            contentAlign: 'center',
            render: (value, row) => {
                const routine = row as Routine;
                if (!routine.next_execution_date) {
                    // If no last execution, show a message prompting to set it
                    if (!routine.last_execution_completed_at) {
                        return (
                            <div className="flex justify-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-amber-50 border-amber-200 cursor-default">
                                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-amber-600">
                                                        Definir execução
                                                    </div>
                                                    <div className="text-xs text-amber-600/80">
                                                        Necessário para cálculo
                                                    </div>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-sm">
                                                Use "Definir Última Execução" no menu de ações para informar quando esta rotina foi executada pela última vez
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        );
                    }
                    return <div className="text-center"><span className="text-muted-foreground text-sm">-</span></div>;
                }
                // Parse the date correctly to avoid timezone issues
                const nextDateStr = routine.next_execution_date.split('T')[0];
                const [year, month, day] = nextDateStr.split('-');
                const displayDate = `${day}/${month}/${year}`;
                // For comparison, we need to work with UTC dates
                const nextDateUTC = new Date(routine.next_execution_date);
                const nowUTC = new Date();
                const isOverdue = nextDateUTC < nowUTC;
                const daysUntilDue = Math.ceil((nextDateUTC.getTime() - nowUTC.getTime()) / (1000 * 60 * 60 * 24));
                // Determine status icon and color
                let StatusIcon = CheckCircle;
                let statusColor = 'text-green-600';
                let bgColor = 'bg-green-50';
                let borderColor = 'border-green-200';
                if (isOverdue) {
                    StatusIcon = AlertCircle;
                    statusColor = 'text-red-600';
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-200';
                } else if (daysUntilDue <= 7) {
                    StatusIcon = AlertTriangle;
                    statusColor = 'text-amber-600';
                    bgColor = 'bg-amber-50';
                    borderColor = 'border-amber-200';
                }
                return (
                    <div className="flex justify-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${bgColor} ${borderColor} cursor-default`}>
                                        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                                        <div className="text-center">
                                            <div className={`text-sm font-medium ${statusColor}`}>
                                                {displayDate}
                                            </div>
                                            <div className={`text-xs ${isOverdue ? statusColor : 'text-muted-foreground'}`}>
                                                {isOverdue
                                                    ? `Vencida há ${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
                                                    : daysUntilDue === 0
                                                        ? 'Vence hoje'
                                                        : `Em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''}`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-sm">
                                        {routine.trigger_type === 'runtime_hours'
                                            ? 'Estimativa baseada nas horas de operação e turno do ativo'
                                            : 'Baseado em dias calendário desde a última execução'
                                        }
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                );
            },
        },
        {
            key: 'tasks_count',
            label: 'Tarefas',
            sortable: false,
            width: 'w-[120px]',
            headerAlign: 'center',
            contentAlign: 'center',
            render: (value, row) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const form = (row as any).form;
                if (!form || !form.tasks || form.tasks.length === 0) {
                    return <div className="text-center"><span className="text-sm text-muted-foreground">-</span></div>;
                }
                return (
                    <div className="text-center">
                        <span className="text-sm">
                            {form.tasks.length} tarefa{form.tasks.length !== 1 ? 's' : ''}
                        </span>
                    </div>
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
                    return <div className="text-center"><span className="text-sm text-muted-foreground">-</span></div>;
                }
                if (form.current_version) {
                    return (
                        <div className="text-center">
                            <span className="text-sm font-medium">
                                v{form.current_version.version_number}
                            </span>
                        </div>
                    );
                }
                return <div className="text-center"><span className="text-sm text-muted-foreground">-</span></div>;
            },
        },
        {
            key: 'form_status',
            label: 'Formulário',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => {
                const form = (row as Record<string, unknown>).form;
                if (!form) {
                    return (
                        <div className="text-center">
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                Sem formulário
                            </span>
                        </div>
                    );
                }
                return (
                    <div className="text-center">
                        <FormStatusBadge
                            form={{
                                id: (form as any).id || 0,
                                ...form,
                                current_version_id: (form as any).current_version_id ?? null,
                            }}
                            size="sm"
                        />
                    </div>
                );
            },
        },
    ];
    // Handlers
     
    const handleCreateSuccess = (error: unknown) => {
        // Add the new routine to the state
        if (routine && routine.id) {
            setRoutines((prevRoutines) => [...prevRoutines, routine]);
            // Show dialog asking if user wants to add tasks
            setNewRoutineForTasks(routine);
            setShowNewRoutineDialog(true);
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
     
    const handleEditRoutine = (error: unknown) => {
        setRoutineToEditInSheet(routine);
        setEditSheetOpen(true);
    };
     
    const handleEditRoutineSuccess = (error: unknown) => {
        setEditSheetOpen(false);
        setRoutineToEditInSheet(null);
        // Update the routine in the state
        setRoutines((prevRoutines) =>
            prevRoutines.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r))
        );
        // Don't show toast here - EditRoutineSheet already shows it
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
     
    const handleEditFormClick = (error: unknown) => {
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
     
    const handleDeleteClick = (error: unknown) => {
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
    const handleAddTasksToNewRoutine = () => {
        if (newRoutineForTasks?.id) {
            // Set the newly created routine ID for sorting
            setNewlyCreatedRoutineId(newRoutineForTasks.id);
            // Edit the form to add tasks
            handleEditRoutineForm(newRoutineForTasks.id);
        }
        setShowNewRoutineDialog(false);
        setNewRoutineForTasks(null);
    };
    const handleSkipAddingTasks = () => {
        setShowNewRoutineDialog(false);
        setNewRoutineForTasks(null);
        toast.success('Rotina criada com sucesso! Você pode adicionar tarefas mais tarde.');
    };
    const isConfirmationValid = confirmationText === 'EXCLUIR';
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
        } catch (error: unknown) {
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
    const handleSetLastExecution = (routine: Routine) => {
        setRoutineForLastExecution(routine);
        // Set default date to today
        setLastExecutionDate(new Date().toISOString().split('T')[0]);
        setShowLastExecutionDialog(true);
    };
    const confirmUpdateLastExecution = async () => {
        if (!routineForLastExecution || !lastExecutionDate) return;
        setIsUpdatingLastExecution(true);
        try {
            // Ensure the date is sent as start of day to prevent timezone issues
            // The date input gives us YYYY-MM-DD format, we'll send it as-is
            // to let the backend handle it consistently
            const response = await axios.post(
                route('maintenance.routines.update-last-execution', { routine: routineForLastExecution.id }),
                {
                    last_execution_date: lastExecutionDate,
                }
            );
            if (response.data.success) {
                toast.success(response.data.message);
                // Update the routine in the state with the new data
                setRoutines((prevRoutines) =>
                    prevRoutines.map((r) => {
                        if (r.id === routineForLastExecution.id) {
                            return {
                                ...r,
                                last_execution_completed_at: response.data.routine.last_execution_completed_at,
                                last_execution_runtime_hours: response.data.routine.last_execution_runtime_hours,
                                next_execution_date: response.data.routine.next_execution_date,
                            };
                        }
                        return r;
                    })
                );
                // Close dialog and reset state
                setShowLastExecutionDialog(false);
                setRoutineForLastExecution(null);
                setLastExecutionDate('');
            }
        } catch (error: unknown) {
            toast.error(error.response?.data?.error || 'Erro ao atualizar data da última execução');
        } finally {
            setIsUpdatingLastExecution(false);
        }
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
                    <div className={cn(
                        "relative transition-all duration-200",
                        isCompressed ? "w-[300px]" : "w-[380px]"
                    )}>
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Buscar rotinas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn(
                                "pl-10 transition-all duration-200",
                                isCompressed ? "h-8 text-sm" : "h-10"
                            )}
                        />
                    </div>
                    <CreateRoutineButton
                        onSuccess={handleCreateSuccess}
                        text="Nova Rotina"
                        variant="default"
                        assetId={assetId}
                        userPermissions={userPermissions}
                    />
                </div>
                {/* Routines table */}
                <EntityDataTable
                    data={sortedRoutines}
                    columns={getRoutineColumns()}
                    loading={false}
                    emptyMessage={searchTerm ? `Nenhuma rotina encontrada para "${searchTerm}"` : "Nenhuma rotina cadastrada. Clique em 'Nova Rotina' para começar."}
                    actions={(routine) => (
                        <div className="flex items-center justify-center gap-2">
                            {/* Actions dropdown */}
                            <EntityActionDropdown
                                onEdit={undefined}
                                onDelete={() => handleDeleteClick(routine)}
                                additionalActions={[
                                    // Publicar - Primary action for unpublished routines with tasks
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) === 'unpublished' ? [{
                                        label: 'Publicar',
                                        icon: (
                                            <div className="relative">
                                                <Upload className="h-4 w-4 text-primary" />
                                                <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            </div>
                                        ),
                                        onClick: () => handlePublishForm(routine.id),
                                        className: 'font-semibold text-primary hover:text-primary/90 hover:bg-primary/10'
                                    }] : []),
                                    // Separator after Publicar (if shown)
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) === 'unpublished' ? [{
                                        label: 'separator',
                                        icon: null,
                                        onClick: () => { },
                                    }] : []),
                                    // Create Work Order - Primary action at the top with emphasis
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) !== 'unpublished' ? [{
                                        label: 'Criar Ordem de Serviço',
                                        icon: (
                                            <div className="relative">
                                                <Plus className="h-4 w-4 text-primary" />
                                                <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            </div>
                                        ),
                                        onClick: () => handleCreateWorkOrder(routine.id),
                                        className: 'font-semibold text-primary hover:text-primary/90 hover:bg-primary/10'
                                    }] : []),
                                    // Separator after Create Work Order
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) !== 'unpublished' ? [{
                                        label: 'separator',
                                        icon: null,
                                        onClick: () => { },
                                    }] : []),
                                    // Add/Edit Tasks - Second primary action with prominence
                                    {
                                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                        label: routine.form && (routine.form as any).has_draft_changes ? 'Editar Tarefas' :
                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                            routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 ? 'Editar Tarefas' :
                                                'Adicionar Tarefas',
                                        icon: (
                                            <div className="relative">
                                                <FileText className="h-4 w-4 text-primary" />
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {(!routine.form || !(routine.form as any).tasks || (routine.form as any).tasks.length === 0) && (
                                                    <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </div>
                                        ),
                                        onClick: () => handleEditFormClick(routine),
                                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                        className: (!routine.form || !(routine.form as any).tasks || (routine.form as any).tasks.length === 0)
                                            ? 'font-semibold text-primary hover:text-primary/90 hover:bg-primary/10'
                                            : undefined
                                    },
                                    // Separator after Add Tasks (only when showing "Adicionar Tarefas")
                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                    ...(!routine.form || !(routine.form as any).tasks || (routine.form as any).tasks.length === 0 ? [{
                                        label: 'separator',
                                        icon: null,
                                        onClick: () => { },
                                    }] : []),
                                    // Set Last Execution - Important for tracking routine history
                                    {
                                        label: 'Definir Última Execução',
                                        icon: <CalendarRange className="h-4 w-4" />,
                                        onClick: () => handleSetLastExecution(routine),
                                        className: !routine.last_execution_completed_at
                                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                            : undefined
                                    },
                                    // Edit Routine - Now positioned after primary actions
                                    {
                                        label: 'Editar Rotina',
                                        icon: <Edit2 className="h-4 w-4" />,
                                        onClick: () => handleEditRoutine(routine),
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
                userPermissions={userPermissions}
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
            {showVersionHistory && selectedRoutineForHistory && (
                <FormVersionHistory
                    routineId={selectedRoutineForHistory}
                    isOpen={showVersionHistory}
                    onClose={() => {
                        setShowVersionHistory(false);
                        setSelectedRoutineForHistory(null);
                    }}
                />
            )}
            {/* Modal de aviso de nova versão */}
            <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar nova versão do formulário</DialogTitle>
                        <DialogDescription>
                            <span className="flex items-start gap-2">
                                <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                <span className="text-sm">
                                    Ao editar um formulário publicado, uma nova versão será criada. A versão atual continuará disponível
                                    para consulta e execuções já iniciadas.
                                </span>
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={confirmEditForm}>Continuar e criar nova versão</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal para adicionar tarefas à nova rotina */}
            <Dialog open={showNewRoutineDialog} onOpenChange={setShowNewRoutineDialog}>
                <DialogContent className="gap-4">
                    <DialogHeader className="gap-4">
                        <DialogTitle>Rotina criada com sucesso!</DialogTitle>
                        <DialogDescription>
                            Deseja adicionar tarefas a esta rotina agora? As tarefas definem as atividades que serão executadas durante a manutenção.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-2">
                        <Button variant="outline" onClick={handleSkipAddingTasks}>
                            Adicionar mais tarde
                        </Button>
                        <Button onClick={handleAddTasksToNewRoutine}>
                            <FileText className="mr-2 h-4 w-4" />
                            Adicionar tarefas agora
                        </Button>
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
                    userPermissions={userPermissions}
                />
            </div>
            {/* Modal para definir última execução */}
            <Dialog open={showLastExecutionDialog} onOpenChange={setShowLastExecutionDialog}>
                <DialogContent className="gap-4">
                    <DialogHeader className="gap-2">
                        <DialogTitle>Definir Última Execução</DialogTitle>
                        <DialogDescription>
                            Informe quando esta rotina foi executada pela última vez. Esta informação é necessária para calcular a próxima execução.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="last-execution-date">Data da Última Execução *</Label>
                            <Input
                                id="last-execution-date"
                                type="date"
                                value={lastExecutionDate}
                                onChange={(e) => setLastExecutionDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                A data será armazenada em UTC (horário universal)
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowLastExecutionDialog(false);
                                setRoutineForLastExecution(null);
                                setLastExecutionDate('');
                            }}
                            disabled={isUpdatingLastExecution}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmUpdateLastExecution}
                            disabled={!lastExecutionDate || isUpdatingLastExecution}
                        >
                            {isUpdatingLastExecution ? 'Atualizando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 