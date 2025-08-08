import { TaskBaseCard, TaskContent } from '@/components/tasks';
import AddTaskButton from '@/components/tasks/AddTaskButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DefaultMeasurement, Task, TaskOperations, TaskState, TaskType, TaskTypes } from '@/types/task';
import { UnitCategory } from '@/types/units';
import {
    closestCenter,
    defaultDropAnimationSideEffects,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { router } from '@inertiajs/react';
import { AlertCircle, ClipboardCheck, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormStatusBadge } from '@/components/form-lifecycle';
interface RoutineData {
    id: number;
    name: string;
    form?: {
        id: number;
        tasks: Task[];
        isDraft?: boolean;
        currentVersionId?: number | null;
        has_draft_changes?: boolean;
        current_version?: {
            id?: number;
            version_number: string;
            published_at?: string;
        };
    };
}
interface Props {
    routine: RoutineData;
    assetId: number;
    onClose?: () => void;
    onSuccess?: (formData: { published: boolean }) => void;
}
export default function InlineRoutineFormEditor({ routine, onClose, onSuccess }: Props) {
    const [tasks, setTasks] = useState<Task[]>(
        (routine.form?.tasks || []).map((task) => ({
            ...task,
            state: TaskState.Previewing, // Set all tasks to Previewing state for the editor
        })),
    );
    const [originalTasks] = useState<Task[]>(
        (routine.form?.tasks || []).map((task) => ({
            ...task,
            state: TaskState.Previewing, // Set all tasks to Previewing state for the editor
        })),
    );
    const [activeId, setActiveId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [taskIcons, setTaskIcons] = useState<Record<string, React.ReactNode>>({});
    const [hasDraftChanges, setHasDraftChanges] = useState(routine.form?.has_draft_changes || false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Estados para última categoria e unidade selecionada
    const [lastMeasurementCategory, setLastMeasurementCategory] = useState<UnitCategory>('Comprimento');
    const [lastMeasurementUnit, setLastMeasurementUnit] = useState<string>('m');
    // Check if form has a published version
    const hasPublishedVersion = routine.form?.currentVersionId !== null && routine.form?.currentVersionId !== undefined;
    // Track unsaved changes
    useEffect(() => {
        const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(originalTasks);
        setHasUnsavedChanges(tasksChanged);
    }, [tasks, originalTasks]);
    // Função para atualizar o ícone de uma tarefa específica
    const updateTaskIcon = (taskId: string, icon: React.ReactNode) => {
        setTaskIcons((prev) => ({
            ...prev,
            [taskId]: icon,
        }));
    };
    // Funções utilitárias para gerenciamento de tarefas
    const taskMethods = {
        update: (index: number, operation: (task: Task) => Task) => {
            const updatedTasks = [...tasks];
            updatedTasks[index] = operation(updatedTasks[index]);
            setTasks(updatedTasks);
        },
        add: (index: number, task: Task) => {
            const existingIds = new Set(tasks.map((t) => t.id));
            if (existingIds.has(task.id)) {
                task = {
                    ...task,
                    id: TaskOperations.generateNextId(tasks),
                };
            }
            const updatedTasks = [...tasks];
            updatedTasks.splice(index + 1, 0, task);
            setTasks(updatedTasks);
        },
        remove: (index: number) => {
            const updatedTasks = [...tasks];
            updatedTasks.splice(index, 1);
            setTasks(updatedTasks);
        },
        createAt: (index: number, type?: TaskType, newTask?: Task) => {
            if (!type && !newTask) return;
            let taskToAdd: Task;
            if (newTask) {
                taskToAdd = newTask;
                if (taskToAdd.type === 'measurement') {
                    taskToAdd.measurement = {
                        ...DefaultMeasurement,
                        category: lastMeasurementCategory,
                        unit: lastMeasurementUnit,
                    };
                }
            } else if (type) {
                taskToAdd = TaskOperations.createAtIndex(tasks, index, type);
                if (type === 'measurement') {
                    taskToAdd.measurement = {
                        ...DefaultMeasurement,
                        category: lastMeasurementCategory,
                        unit: lastMeasurementUnit,
                    };
                }
                if (type === 'code_reader') {
                    taskToAdd.codeReaderType = 'barcode';
                }
            } else {
                return;
            }
            taskMethods.add(index, taskToAdd);
        },
        setState: (index: number, state: TaskState) => {
            taskMethods.update(index, (task) => ({
                ...task,
                state,
            }));
        },
        getById: (id: string) => {
            const taskId = parseInt(id.replace('task-', ''));
            return tasks.find((task) => task.id === taskId.toString());
        },
    };
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id.toString());
    };
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            setTasks((items) => {
                const oldIndex = items.findIndex((item) => `task-${item.id}` === active.id);
                const newIndex = items.findIndex((item) => `task-${item.id}` === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
    };
    const handleDragCancel = () => {
        setActiveId(null);
    };
    const handleSave = async () => {
        setSaving(true);
        const tasksToSave = tasks.map((task) => ({
            ...task,
            measurement: task.measurement
                ? {
                    ...task.measurement,
                    name: task.measurement.name,
                    min: task.measurement.min,
                    target: task.measurement.target,
                    max: task.measurement.max,
                    unit: task.measurement.unit,
                    category: task.measurement.category,
                }
                : undefined,
            options: task.options?.map((option) => option) || [],
            instructionImages: task.instructionImages || [],
        }));
        router.post(
            route('maintenance.routines.forms.store', {
                routine: routine.id,
            }),
            {
                tasks: JSON.stringify(tasksToSave),
            },
            {
                onSuccess: () => {
                    toast.success('Rascunho salvo com sucesso!');
                    setHasDraftChanges(true);
                    setSaving(false);
                    setHasUnsavedChanges(false);
                    // Reload the page to show the saved draft tasks
                    router.reload();
                },
                onError: () => {
                    toast.error('Erro ao salvar formulário', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                    setSaving(false);
                },
            },
        );
    };
    const handleSaveAndPublish = async () => {
        setSaving(true);
        setPublishing(true);
        const tasksToSave = tasks.map((task) => ({
            ...task,
            measurement: task.measurement
                ? {
                    ...task.measurement,
                    name: task.measurement.name,
                    min: task.measurement.min,
                    target: task.measurement.target,
                    max: task.measurement.max,
                    unit: task.measurement.unit,
                    category: task.measurement.category,
                }
                : undefined,
            options: task.options?.map((option) => option) || [],
            instructionImages: task.instructionImages || [],
        }));
        router.post(
            route('maintenance.routines.forms.save-and-publish', {
                routine: routine.id,
            }),
            {
                tasks: JSON.stringify(tasksToSave),
            },
            {
                onSuccess: () => {
                    toast.success('Formulário salvo e publicado com sucesso!');
                    setHasDraftChanges(false);
                    setSaving(false);
                    setPublishing(false);
                    setHasUnsavedChanges(false);
                    if (onSuccess) {
                        onSuccess({ published: true });
                    }
                    // Reload the page to refresh the data
                    router.reload();
                },
                onError: () => {
                    toast.error('Erro ao salvar e publicar formulário', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                    setSaving(false);
                    setPublishing(false);
                },
            },
        );
    };
    const handleClose = () => {
        if (hasUnsavedChanges) {
            setShowExitDialog(true);
        } else {
            onClose?.();
        }
    };
    const handleConfirmExit = () => {
        setShowExitDialog(false);
        onClose?.();
    };
    const handleSaveAndExit = async () => {
        setSaving(true);
        const tasksToSave = tasks.map((task) => ({
            ...task,
            measurement: task.measurement
                ? {
                    ...task.measurement,
                    name: task.measurement.name,
                    min: task.measurement.min,
                    target: task.measurement.target,
                    max: task.measurement.max,
                    unit: task.measurement.unit,
                    category: task.measurement.category,
                }
                : undefined,
            options: task.options?.map((option) => option) || [],
            instructionImages: task.instructionImages || [],
        }));
        router.post(
            route('maintenance.routines.forms.store', {
                routine: routine.id,
            }),
            {
                tasks: JSON.stringify(tasksToSave),
            },
            {
                onSuccess: () => {
                    toast.success('Rascunho salvo com sucesso!');
                    setShowExitDialog(false);
                    onClose?.();
                },
                onError: () => {
                    toast.error('Erro ao salvar formulário', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                    setSaving(false);
                },
            },
        );
    };
    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-10 -mb-2 flex items-center justify-between bg-white/75 px-4 py-5 backdrop-blur-sm">
                <div className="-mt-2 -ml-2 flex flex-wrap items-baseline gap-3">
                    <div className="flex flex-wrap items-baseline">
                        <p className="mt-1 ml-2 truncate text-sm text-gray-500">Tarefas de</p>
                        <h3 className="mt-2 ml-2 text-base font-semibold text-gray-900">{routine.name}</h3>
                    </div>
                    {routine.form && (
                        <FormStatusBadge
                            form={{
                                id: routine.form.id,
                                current_version_id: routine.form.currentVersionId ?? null,
                                has_draft_changes: routine.form.has_draft_changes ?? routine.form.isDraft,
                                current_version: routine.form.current_version,
                                tasks: (routine.form.tasks || []).map(task => ({
                                    ...task,
                                    id: parseInt(task.id),
                                    name: task.description || '',
                                    type: task.type
                                })),
                            }}
                            size="sm"
                        />
                    )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                        Voltar
                    </Button>
                    <Button type="button" size="sm" disabled={saving || tasks.length === 0} onClick={handleSave}>
                        {saving ? (
                            <>
                                <Save className="mr-2 h-4 w-4 animate-pulse" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Rascunho
                            </>
                        )}
                    </Button>
                    {(hasDraftChanges || hasUnsavedChanges) && (
                        <Button type="button" size="sm" variant="action" disabled={publishing || saving || tasks.length === 0} onClick={handleSaveAndPublish}>
                            {publishing || saving ? (
                                <>
                                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                                    {saving ? 'Salvando...' : 'Publicando...'}
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Salvar e Publicar
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
            {/* Alert for unpublished changes */}
            {hasDraftChanges && hasPublishedVersion && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Existem alterações não publicadas. Publique para tornar as mudanças disponíveis para execução.
                    </AlertDescription>
                </Alert>
            )}
            <div className="mt-4 grid gap-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                    measuring={{
                        droppable: {
                            strategy: MeasuringStrategy.Always,
                        },
                    }}
                >
                    <div className="grid gap-4">
                        <SortableContext items={tasks.map((task) => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
                            {tasks.length === 0 ? (
                                <Card className="bg-muted/30">
                                    <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
                                        <div className="bg-muted/50 mb-4 flex size-12 items-center justify-center rounded-full">
                                            <ClipboardCheck className="text-foreground/60 size-6" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-medium">Nenhuma tarefa adicionada</h3>
                                        <p className="text-muted-foreground mx-auto mb-6 max-w-xs text-sm">
                                            Adicione tarefas para compor o formulário.
                                        </p>
                                        <div className="w-full sm:w-auto">
                                            <AddTaskButton
                                                label="Nova Tarefa"
                                                tasks={tasks}
                                                currentIndex={-1}
                                                onTaskAdded={(newTask) => {
                                                    const updatedTasks = [...tasks, newTask];
                                                    setTasks(updatedTasks);
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                tasks.map((task, index) => {
                                    const taskType = TaskTypes.find((t) => t.value === task.type);
                                    const icon =
                                        taskIcons[task.id] ||
                                        (taskType ? <taskType.icon className="size-5" /> : <ClipboardCheck className="size-5" />);
                                    return (
                                        <TaskBaseCard
                                            key={`task-${task.id}`}
                                            id={task.id}
                                            mode={
                                                TaskOperations.isEditing(task)
                                                    ? 'edit'
                                                    : TaskOperations.isPreviewing(task)
                                                        ? 'preview'
                                                        : TaskOperations.isResponding(task)
                                                            ? 'respond'
                                                            : 'preview'
                                            }
                                            icon={icon}
                                            title={task.description}
                                            onTitleChange={(newTitle) => {
                                                taskMethods.update(index, (t) => ({
                                                    ...t,
                                                    description: newTitle,
                                                }));
                                            }}
                                            onRemove={() => {
                                                taskMethods.remove(index);
                                            }}
                                            onNewTask={(newTask) => taskMethods.createAt(index, undefined, newTask)}
                                            onPreview={() => {
                                                if (TaskOperations.isEditing(task)) {
                                                    taskMethods.setState(index, TaskState.Viewing);
                                                } else {
                                                    taskMethods.setState(index, TaskState.Previewing);
                                                }
                                            }}
                                            onEdit={() => taskMethods.setState(index, TaskState.Editing)}
                                            onNext={() => taskMethods.setState(index, TaskState.Viewing)}
                                            taskTypes={TaskTypes}
                                            tasks={tasks}
                                            currentIndex={index}
                                            isRequired={task.isRequired}
                                            onRequiredChange={(required) =>
                                                taskMethods.update(index, (t) => TaskOperations.updateRequired(t, required))
                                            }
                                            onTaskUpdate={(updatedTask) => {
                                                taskMethods.update(index, () => updatedTask);
                                            }}
                                        >
                                            <TaskContent
                                                task={task}
                                                mode={
                                                    TaskOperations.isEditing(task)
                                                        ? 'edit'
                                                        : TaskOperations.isPreviewing(task)
                                                            ? 'preview'
                                                            : TaskOperations.isResponding(task)
                                                                ? 'respond'
                                                                : 'preview'
                                                }
                                                onUpdate={(updatedTask) => {
                                                    if (updatedTask.type === 'measurement' && updatedTask.measurement) {
                                                        setLastMeasurementCategory(updatedTask.measurement.category);
                                                        setLastMeasurementUnit(updatedTask.measurement.unit);
                                                    }
                                                    taskMethods.update(index, () => updatedTask);
                                                }}
                                                onIconChange={(newIcon) => updateTaskIcon(task.id, newIcon)}
                                            />
                                        </TaskBaseCard>
                                    );
                                })
                            )}
                        </SortableContext>
                    </div>
                    <DragOverlay
                        dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: {
                                    active: {
                                        opacity: '0.5',
                                    },
                                },
                            }),
                        }}
                    >
                        {activeId
                            ? (() => {
                                const task = taskMethods.getById(activeId);
                                if (!task) return null;
                                const taskType = TaskTypes.find((t) => t.value === task.type);
                                const icon =
                                    taskIcons[task.id] || (taskType ? <taskType.icon className="size-5" /> : <ClipboardCheck className="size-5" />);
                                return (
                                    <TaskBaseCard
                                        key={`overlay-${task.id}`}
                                        id={task.id}
                                        mode={TaskOperations.isEditing(task) ? 'edit' : 'preview'}
                                        icon={icon}
                                        title={task.description}
                                        isRequired={task.isRequired}
                                        onTaskUpdate={() => { }}
                                    >
                                        <TaskContent
                                            task={task}
                                            mode={TaskOperations.isEditing(task) ? 'edit' : 'preview'}
                                            onUpdate={() => { }}
                                            onIconChange={(newIcon) => updateTaskIcon(task.id, newIcon)}
                                        />
                                    </TaskBaseCard>
                                );
                            })()
                            : null}
                    </DragOverlay>
                </DndContext>
            </div>
            {/* Confirmation Dialog for Unsaved Changes */}
            <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterações não salvas</DialogTitle>
                        <DialogDescription>Você tem alterações não salvas. O que deseja fazer?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                            Continuar editando
                        </Button>
                        <Button variant="ghost" onClick={handleConfirmExit}>
                            Sair sem salvar
                        </Button>
                        <Button onClick={handleSaveAndExit} disabled={saving || tasks.length === 0}>
                            {saving ? 'Salvando...' : 'Salvar e sair'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
