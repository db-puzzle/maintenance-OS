import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, CalendarClock, Upload, ClipboardCheck, FileText, Eye, Edit2, History, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import EmptyCard from '@/components/ui/empty-card';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { ColumnConfig } from '@/types/shared';
import FormStatusBadge, { getFormState } from '@/components/form-lifecycle/FormStatusBadge';
import { FormExecutionGuard } from '@/components/form-lifecycle';
import { FormVersionHistory } from '@/components/form-lifecycle';
import CreateRoutineButton from '@/components/CreateRoutineButton';
import EditRoutineSheet from '@/components/EditRoutineSheet';
import InlineRoutineFormEditor from '@/components/InlineRoutineFormEditor';
import InlineRoutineForm from '@/components/InlineRoutineForm';
import { Clock, CalendarRange } from 'lucide-react';

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
    form?: unknown;
    form_id?: number;
    trigger_hours?: number;
    status?: 'Active' | 'Inactive';
    [key: string]: unknown;
}

interface AssetRoutinesTabProps {
    assetId: number;
    routines: Routine[];
    selectedShift?: Shift | null;
    onRoutinesUpdate?: (routines: Routine[]) => void;
    newRoutineId?: number;
}

export default function AssetRoutinesTab({
    assetId,
    routines: initialRoutines,
    selectedShift,
    onRoutinesUpdate,
    newRoutineId
}: AssetRoutinesTabProps) {

    // Estado para gerenciar as rotinas
    const [routines, setRoutines] = useState<Routine[]>(initialRoutines);

    // Update routines when prop changes
    useEffect(() => {
        setRoutines(initialRoutines);
    }, [initialRoutines]);

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
    const [routineToDelete, setRoutineToDelete] = useState<any>(null);

    // Estado para controlar o EditRoutineSheet
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [routineToEditInSheet, setRoutineToEditInSheet] = useState<any>(null);

    // Refs
    const createRoutineButtonRef = useRef<HTMLButtonElement>(null);
    const addTasksButtonRef = useRef<HTMLButtonElement>(null);

    // Notify parent component when routines change
    useEffect(() => {
        onRoutinesUpdate?.(routines);
    }, [routines, onRoutinesUpdate]);

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
        (routine) =>
            routine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            routine.description?.toLowerCase().includes(searchTerm.toLowerCase()),
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
            render: (value, row) => (
                <div className="font-medium">{String(value || 'Sem nome')}</div>
            ),
        },
        {
            key: 'description',
            label: 'Descrição',
            sortable: false,
            width: 'w-[250px]',
            render: (value) => (
                <div
                    className="text-sm text-muted-foreground max-w-[250px] line-clamp-2 whitespace-normal"
                    title={String(value || '-')}
                >
                    {String(value || '-')}
                </div>
            ),
        },
        {
            key: 'trigger_hours',
            label: 'Periodicidade',
            sortable: true,
            width: 'w-[180px]',
            render: (value, row) => {
                const { hoursText, workDaysText } = formatTriggerHours(value as number | undefined);
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {hoursText}
                        </div>
                        {workDaysText && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarRange className="h-3 w-3" />
                                {workDaysText}
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
                const form = (row as any).form;
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
                            ...form,
                            current_version_id: form.current_version_id ?? null,
                        }}
                        size="sm"
                    />
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${value === 'Active'
                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                        : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'
                        }`}
                >
                    {value === 'Active' ? 'Ativo' : 'Inativo'}
                </span>
            ),
        },
    ];

    // Handlers
    const handleCreateSuccess = (routine: { id: number; name: string; description?: string; form?: unknown;[key: string]: unknown }) => {
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
            // Ativar modo comprimido ao editar formulário
            setIsCompressed(true);
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

    const handleFormSaved = (formData: unknown) => {
        // Atualizar a rotina com o novo formulário
        setRoutines((prevRoutines) =>
            prevRoutines.map((r) => {
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

    const handleEditRoutine = (routine: any) => {
        setRoutineToEditInSheet(routine);
        setEditSheetOpen(true);
    };

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
        try {
            await axios.post(
                route('maintenance.assets.routines.forms.publish', {
                    asset: assetId,
                    routine: routineId,
                }),
            );
            toast.success('Formulário publicado com sucesso!');
            // Reload routines to reflect the change
            router.reload();
        } catch {
            toast.error('Erro ao publicar formulário');
        }
    };

    const handleEditFormClick = (routine: any) => {
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

    const handleDeleteClick = (routine: any) => {
        setRoutineToDelete(routine);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!routineToDelete?.id) return;

        setIsDeleting(true);
        router.delete(route('maintenance.assets.routines.destroy', { asset: assetId, routine: routineToDelete.id }), {
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
        router.visit(route('maintenance.assets.routines.executions', { asset: assetId, routine: routineId }));
    };

    const handleNewRoutineClick = () => {
        createRoutineButtonRef.current?.click();
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

    if (fillingRoutineId) {
        // Mostrar o preenchedor de formulário inline
        const routine = routines.find((r) => r.id === fillingRoutineId);
        if (!routine) return null;

        return (
            <InlineRoutineForm
                routine={routine}
                assetId={assetId}
                onClose={handleCloseFormFiller}
                onComplete={handleCloseFormFiller}
            />
        );
    }

    if (routines.length === 0) {
        return (
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
                    emptyMessage={searchTerm ? `Nenhuma rotina encontrada para "${searchTerm}"` : "Nenhuma rotina encontrada"}
                    actions={(routine) => (
                        <div className="flex items-center justify-end gap-2">
                            {/* Preencher/Publicar button */}
                            {routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 ? (
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
                                    <FormExecutionGuard
                                        form={routine.form as any}
                                        onExecute={() => handleFillRoutineForm(routine.id)}
                                        onPublishAndExecute={async () => {
                                            await handlePublishForm(routine.id);
                                            handleFillRoutineForm(routine.id);
                                        }}
                                        onEditForm={() => handleEditFormClick(routine)}
                                    >
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ClipboardCheck className="mr-1 h-4 w-4" />
                                            Preencher
                                        </Button>
                                    </FormExecutionGuard>
                                )
                            ) : routine.form && (routine.form as any).has_draft_changes ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditFormClick(routine);
                                    }}
                                >
                                    <FileText className="mr-1 h-4 w-4" />
                                    Editar Tarefas
                                </Button>
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
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) === 'unpublished' ? [{
                                        label: 'Publicar',
                                        icon: <Upload className="h-4 w-4" />,
                                        onClick: () => handlePublishForm(routine.id),
                                    }] : []),
                                    ...(routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 && getFormState(routine.form as any) !== 'unpublished' ? [{
                                        label: 'Preencher',
                                        icon: <ClipboardCheck className="h-4 w-4" />,
                                        onClick: () => handleFillRoutineForm(routine.id),
                                    }] : []),
                                    {
                                        label: routine.form && (routine.form as any).has_draft_changes ? 'Editar Tarefas' :
                                            routine.form && (routine.form as any).tasks && (routine.form as any).tasks.length > 0 ? 'Editar Tarefas' :
                                                'Adicionar Tarefas',
                                        icon: <FileText className="h-4 w-4" />,
                                        onClick: () => handleEditFormClick(routine),
                                    },
                                    {
                                        label: 'Visualizar Execuções',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => handleViewExecutions(routine.id),
                                    },
                                    {
                                        label: 'Editar Rotina',
                                        icon: <Edit2 className="h-4 w-4" />,
                                        onClick: () => handleEditRoutine(routine),
                                    },
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
                routine={routineToEditInSheet || {
                    name: '',
                    trigger_hours: 0,
                    status: 'Active' as const,
                    description: '',
                }}
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
                    formId={routines.find(r => r.id === selectedRoutineForHistory)?.form?.id || 0}
                    currentVersionId={routines.find(r => r.id === selectedRoutineForHistory)?.form?.current_version_id}
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