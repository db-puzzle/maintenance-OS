import EditRoutineSheet from '@/components/EditRoutineSheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/task';
import { Link, router } from '@inertiajs/react';
import { ClipboardCheck, Clock, Edit2, Eye, FileText, MoreVertical, Plus, Trash2, AlertCircle, CalendarRange, History } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { FormStatusBadge, FormExecutionGuard, FormVersionHistory, getFormState } from '@/components/form-lifecycle';

export interface Routine {
    id?: number;
    name: string;
    trigger_hours: number;
    status: 'Active' | 'Inactive';
    description?: string;
    form_id?: number;
    form?: {
        id: number;
        name: string;
        tasks: Task[];
        has_draft_changes?: boolean;
        is_draft?: boolean;
        current_version_id?: number | null;
        current_version?: {
            id?: number;
            version_number: string;
            published_at?: string;
        };
    };
}

interface ShiftSchedule {
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
}

interface Shift {
    id: number;
    name: string;
    schedules: ShiftSchedule[];
}

interface RoutineListProps {
    routine?: Routine;
    onSave?: (routine: Routine) => void;
    onDelete?: (routine: Routine) => void;
    onCancel?: () => void;
    isNew?: boolean;
    assetId?: number;
    onEditForm?: () => void;
    onFillForm?: () => void;
    isCompressed?: boolean;
    shift?: Shift | null;
}



// Helper function to calculate shift work hours per week
const calculateShiftHoursPerWeek = (shift: Shift | null | undefined): number => {
    if (!shift?.schedules) return 0;

    let totalMinutes = 0;

    shift.schedules.forEach(schedule => {
        schedule.shifts.forEach(shiftTime => {
            if (shiftTime.active) {
                const [startHours, startMinutes] = shiftTime.start_time.split(':').map(Number);
                const [endHours, endMinutes] = shiftTime.end_time.split(':').map(Number);

                let startTotalMinutes = startHours * 60 + startMinutes;
                let endTotalMinutes = endHours * 60 + endMinutes;

                // Handle shifts that cross midnight
                if (endTotalMinutes < startTotalMinutes) {
                    endTotalMinutes += 24 * 60;
                }

                const shiftDuration = endTotalMinutes - startTotalMinutes;
                totalMinutes += shiftDuration;

                // Subtract break time
                shiftTime.breaks.forEach(breakTime => {
                    const [breakStartHours, breakStartMinutes] = breakTime.start_time.split(':').map(Number);
                    const [breakEndHours, breakEndMinutes] = breakTime.end_time.split(':').map(Number);

                    let breakStartTotalMinutes = breakStartHours * 60 + breakStartMinutes;
                    let breakEndTotalMinutes = breakEndHours * 60 + breakEndMinutes;

                    if (breakEndTotalMinutes < breakStartTotalMinutes) {
                        breakEndTotalMinutes += 24 * 60;
                    }

                    totalMinutes -= (breakEndTotalMinutes - breakStartTotalMinutes);
                });
            }
        });
    });

    return totalMinutes / 60; // Return hours
};

export default function RoutineList({ routine, onSave, onDelete, onCancel, isNew = false, assetId, onEditForm, onFillForm, isCompressed = false, shift }: RoutineListProps) {
    // Referência para o trigger do sheet
    const editSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Estados para controle do modal de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Estado para controlar o dropdown
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Estado para armazenar dados completos da rotina com formulário
    const [routineWithForm, setRoutineWithForm] = useState<Routine | null>(null);
    const [loadingForm, setLoadingForm] = useState(false);

    // Estado para controlar o modal de histórico de versões
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // Dados da rotina ou dados vazios para nova rotina
    const routineData = routineWithForm || routine || {
        name: '',
        trigger_hours: 0,
        status: 'Active' as const,
        description: '',
        form: undefined,
    };

    // Fetch form data when component mounts if routine has a form
    useEffect(() => {
        if (routine?.id && routine?.form_id && !isNew) {
            fetchRoutineFormData();
        }
    }, [routine?.id, routine?.form_id]);

    const fetchRoutineFormData = async () => {
        if (!routine?.id) return;

        setLoadingForm(true);
        try {
            const response = await axios.get(route('maintenance.routines.form-data', routine.id));
            setRoutineWithForm(response.data.routine);
        } catch (error) {
            console.error('Error fetching routine form data:', error);
        } finally {
            setLoadingForm(false);
        }
    };

    const formatTriggerHours = (hours: number) => {
        const shiftHoursPerWeek = calculateShiftHoursPerWeek(shift);

        // Base hours format - always show in hours as stored in database
        const hoursText = `${hours} hora${hours !== 1 ? 's' : ''}`;

        // Work days estimate
        let workDaysText = null;
        if (shift && shiftHoursPerWeek > 0) {
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

    const handleEditClick = () => {
        setIsSheetOpen(true);
        editSheetTriggerRef.current?.click();
    };

    const handleSheetSuccess = (updatedRoutine: Routine) => {
        setIsSheetOpen(false);
        if (onSave) {
            onSave(updatedRoutine);
        }
        // Refresh form data after routine update
        if (updatedRoutine.id) {
            fetchRoutineFormData();
        }
    };

    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
    };

    const handleDelete = () => {
        if (!routine?.id) return;
        setDropdownOpen(false);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!routine?.id) return;

        setIsDeleting(true);
        router.delete(route('maintenance.assets.routines.destroy', { asset: assetId, routine: routine.id }), {
            onSuccess: () => {
                toast.success('Rotina excluída com sucesso!');
                setShowDeleteDialog(false);
                setConfirmationText('');
                setIsDeleting(false);
                // Chamar callback para atualizar a lista
                if (onDelete && routine) {
                    onDelete(routine);
                }
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
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    // Se for nova rotina, renderizar um card especial
    if (isNew) {
        return (
            <>
                <Card className="hover:border-primary/50 border-2 border-dashed transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                        <h3 className="mb-2 text-center text-lg font-semibold">Nova Rotina de Manutenção</h3>
                        <p className="text-muted-foreground mb-4 text-center text-sm">Configure uma nova rotina de manutenção para este ativo</p>
                        <Button onClick={handleEditClick}>
                            <Plus className="mr-1 h-4 w-4" />
                            Criar Rotina
                        </Button>
                    </CardContent>
                </Card>

                {/* EditRoutineSheet com SheetTrigger interno */}
                <div style={{ display: 'none' }}>
                    <EditRoutineSheet
                        showTrigger={true}
                        triggerText="Trigger Oculto"
                        triggerVariant="outline"
                        triggerRef={editSheetTriggerRef}
                        routine={routineData}
                        isNew={true}
                        assetId={assetId}
                        onSuccess={handleSheetSuccess}
                        isOpen={isSheetOpen}
                        onOpenChange={handleSheetOpenChange}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <li className={cn(
                "flex items-center justify-between gap-x-6 transition-all duration-200 ease-in-out",
                isCompressed ? "py-3" : "py-5"
            )}>
                <div className="min-w-0">
                    <div className="flex items-start gap-x-3">
                        <p className={cn(
                            "font-semibold text-gray-900 transition-all duration-200 ease-in-out",
                            isCompressed ? "text-lg" : "text-lg"
                        )}>{routineData.name}</p>
                        {routineData.form ? (
                            <FormStatusBadge
                                form={{
                                    ...routineData.form,
                                    current_version_id: routineData.form.current_version_id ?? null
                                }}
                                size="sm"
                            />
                        ) : (
                            <p
                                className={`mt-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${routineData.status === 'Active'
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                                    }`}
                            >
                                {routineData.status === 'Active' ? 'Ativo' : 'Inativo'}
                            </p>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-x-2 text-xs text-gray-500">
                        <p className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="h-3 w-3" />
                            {formatTriggerHours(routineData.trigger_hours).hoursText}
                        </p>
                        {formatTriggerHours(routineData.trigger_hours).workDaysText && (
                            <>
                                <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                    <circle r={1} cx={1} cy={1} />
                                </svg>
                                <p className="flex items-center gap-1 whitespace-nowrap">
                                    <CalendarRange className="h-3 w-3" />
                                    {formatTriggerHours(routineData.trigger_hours).workDaysText}
                                </p>
                            </>
                        )}
                        {routineData.form && (
                            <>
                                <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                    <circle r={1} cx={1} cy={1} />
                                </svg>
                                <p className="flex items-center gap-1 whitespace-nowrap">
                                    <FileText className="h-3 w-3" />
                                    {loadingForm ? '...' : (routineData.form.tasks?.length || 0)} tarefas
                                </p>
                                {routineData.form.current_version && (
                                    <>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                            <circle r={1} cx={1} cy={1} />
                                        </svg>
                                        <p className="whitespace-nowrap">
                                            v{routineData.form.current_version.version_number}
                                        </p>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {!shift && (
                        <Link
                            href={route('asset-hierarchy.assets.show', { asset: assetId, tab: 'shifts-runtime' })}
                            className="mt-1 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:underline"
                        >
                            <AlertCircle className="h-3 w-3" />
                            <span>Estimativa de tempo disponível após configurar turno</span>
                        </Link>
                    )}
                </div>
                <div className="flex flex-none items-center gap-x-4">
                    {loadingForm ? (
                        <Button size="sm" variant="outline" disabled>
                            <FileText className="mr-1 h-4 w-4 animate-pulse" />
                            Carregando...
                        </Button>
                    ) : routineData.form && routineData.form.tasks && routineData.form.tasks.length > 0 ? (
                        <FormExecutionGuard
                            form={{
                                ...routineData.form,
                                current_version_id: routineData.form.current_version_id ?? null
                            }}
                            onExecute={(versionId) => {
                                if (onFillForm) onFillForm();
                            }}
                            onPublishAndExecute={async () => {
                                // Publish the form first
                                try {
                                    await axios.post(route('maintenance.assets.routines.forms.publish', {
                                        asset: assetId,
                                        routine: routine?.id
                                    }));
                                    toast.success('Formulário publicado com sucesso!');
                                    // Refresh form data
                                    await fetchRoutineFormData();
                                    // Then execute
                                    if (onFillForm) onFillForm();
                                } catch (error) {
                                    toast.error('Erro ao publicar formulário');
                                }
                            }}
                            onEditForm={onEditForm}
                        >
                            <Button size="sm" variant="action">
                                <ClipboardCheck className="mr-1 h-4 w-4" />
                                Preencher
                            </Button>
                        </FormExecutionGuard>
                    ) : routineData.form && routineData.form.has_draft_changes ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onEditForm}
                        >
                            <FileText className="mr-1 h-4 w-4" />
                            Editar Tarefas
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onEditForm}
                        >
                            <FileText className="mr-1 h-4 w-4" />
                            Adicionar Tarefas
                        </Button>
                    )}
                    {!isSheetOpen && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                    <span className="sr-only">Abrir opções</span>
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {!loadingForm && routineData.form && routineData.form.tasks && routineData.form.tasks.length > 0 ? (
                                    <>
                                        <DropdownMenuItem
                                            asChild={!onFillForm}
                                            className={onFillForm ? "flex items-center" : "flex items-center"}
                                            onClick={onFillForm ? onFillForm : undefined}
                                        >
                                            {onFillForm ? (
                                                <>
                                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                                    Preencher
                                                </>
                                            ) : (
                                                <Link
                                                    href={route('maintenance.assets.routines.form', {
                                                        asset: assetId,
                                                        routine: routineData.id,
                                                        mode: 'fill',
                                                    })}
                                                    className="flex items-center"
                                                >
                                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                                    Preencher
                                                </Link>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            asChild={!onEditForm}
                                            className={onEditForm ? "flex items-center" : "flex items-center"}
                                            onClick={onEditForm ? onEditForm : undefined}
                                        >
                                            <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Editar Tarefas
                                            </>
                                        </DropdownMenuItem>
                                    </>
                                ) : routineData.form && routineData.form.has_draft_changes ? (
                                    <>
                                        <DropdownMenuItem
                                            asChild={!onEditForm}
                                            className={onEditForm ? "flex items-center" : "flex items-center"}
                                            onClick={onEditForm ? onEditForm : undefined}
                                        >
                                            <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Editar Tarefas
                                            </>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem
                                            asChild={!onEditForm}
                                            className={onEditForm ? "sm:hidden" : "sm:hidden flex items-center"}
                                            onClick={onEditForm ? onEditForm : undefined}
                                        >
                                            <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Adicionar Tarefas
                                            </>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('maintenance.assets.routines.executions', { asset: assetId, routine: routineData.id })}
                                        className="flex items-center"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Visualizar Execuções
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleEditClick}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Editar Rotina
                                </DropdownMenuItem>
                                {routineData.form && routineData.form.current_version_id && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setShowVersionHistory(true)}
                                            className="flex items-center"
                                        >
                                            <History className="mr-2 h-4 w-4" />
                                            Ver Histórico de Versões
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </li>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir a rotina "{routineData.name}"? Esta ação não pode ser desfeita.
                    </DialogDescription>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
                            <Input
                                id="confirmation"
                                variant="destructive"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
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

            {/* EditRoutineSheet com SheetTrigger interno */}
            <div style={{ display: 'none' }}>
                <EditRoutineSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={editSheetTriggerRef}
                    routine={routineData}
                    isNew={false}
                    assetId={assetId}
                    onSuccess={handleSheetSuccess}
                    isOpen={isSheetOpen}
                    onOpenChange={handleSheetOpenChange}
                />
            </div>

            {/* Modal de Histórico de Versões */}
            {routineData.form && (
                <FormVersionHistory
                    formId={routineData.form.id}
                    currentVersionId={routineData.form.current_version_id}
                    isOpen={showVersionHistory}
                    onClose={() => setShowVersionHistory(false)}
                />
            )}
        </>
    );
}
