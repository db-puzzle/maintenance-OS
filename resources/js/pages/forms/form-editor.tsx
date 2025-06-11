import { TaskBaseCard, TaskContent } from '@/components/tasks';
import AddTaskButton from '@/components/tasks/AddTaskButton';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { type BreadcrumbItem } from '@/types';
import { DefaultMeasurement, Task, TaskOperations, TaskState, TaskType, TaskTypes } from '@/types/task';
import { UnitCategory } from '@/types/units';
import {
    closestCenter,
    defaultDropAnimationSideEffects,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Head, router, useForm } from '@inertiajs/react';
import { ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface FormData {
    id?: number;
    name?: string;
    tasks?: Task[];
}

interface EntityData {
    id: number;
    name?: string;
    tag?: string;
}

interface Props {
    form?: FormData;
    entity: EntityData;
    entityType: 'routine' | 'inspection' | 'report';
    breadcrumbs?: BreadcrumbItem[];
    backRoute?: string;
    saveRoute?: string;
    title?: string;
    subtitle?: string;
    inline?: boolean;
    onSuccess?: (formData: any) => void;
    onCancel?: () => void;
}

interface FormSubmitData {
    [key: string]: string | number | undefined;
}

const EntityLabels = {
    routine: {
        singular: 'Rotina',
        plural: 'Rotinas',
        form: 'Formulário da Rotina',
    },
    inspection: {
        singular: 'Inspeção',
        plural: 'Inspeções',
        form: 'Formulário de Inspeção',
    },
    report: {
        singular: 'Relatório',
        plural: 'Relatórios',
        form: 'Formulário de Relatório',
    },
};

export default function FormEditor({ form, entity, entityType, breadcrumbs, backRoute, saveRoute, title, subtitle, inline = false, onSuccess, onCancel }: Props) {
    const entityLabel = EntityLabels[entityType];
    const entityDisplayName = entity.name || entity.tag || `${entityLabel.singular} ${entity.id}`;

    const defaultBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: entityDisplayName,
            href: '#',
        },
        {
            title: entityLabel.form,
            href: '#',
        },
    ];

    const { data, setData, processing, errors, clearErrors } = useForm<FormSubmitData>({});

    const [tasks, setTasks] = useState<Task[]>(form?.tasks || []);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Estados para última categoria e unidade selecionada
    const [lastMeasurementCategory, setLastMeasurementCategory] = useState<UnitCategory>('Comprimento');
    const [lastMeasurementUnit, setLastMeasurementUnit] = useState<string>('m');

    // Estado para armazenar os ícones personalizados por ID de tarefa
    const [taskIcons, setTaskIcons] = useState<Record<string, React.ReactNode>>({});

    // Função para atualizar o ícone de uma tarefa específica
    const updateTaskIcon = (taskId: string, icon: React.ReactNode) => {
        setTaskIcons((prev) => {
            if (prev[taskId] === icon) return prev;
            return {
                ...prev,
                [taskId]: icon,
            };
        });
    };

    // Função para definir todas as tarefas para o modo de visualização
    const setAllTasksToViewing = () => {
        setTasks(tasks.map(task => ({
            ...task,
            state: TaskState.Viewing
        })));
    };

    // Adicionar event listener para o evento customizado
    useEffect(() => {
        const handleViewAllTasks = () => {
            setAllTasksToViewing();
        };

        window.addEventListener('viewAllTasks', handleViewAllTasks);

        return () => {
            window.removeEventListener('viewAllTasks', handleViewAllTasks);
        };
    }, [tasks]); // Dependência em tasks para ter sempre a versão mais atualizada

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

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
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

    const handleSave = () => {
        if (!saveRoute) {
            toast.error('Rota de salvamento não configurada');
            return;
        }

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
            saveRoute,
            {
                tasks: JSON.stringify(tasksToSave),
            },
            {
                onSuccess: (response) => {
                    toast.success('Formulário salvo com sucesso!');
                    if (onSuccess) {
                        // Extract form data from response if available
                        const formData = response.props?.form || { tasks: tasksToSave };
                        onSuccess(formData);
                    }
                },
                onError: () => {
                    toast.error('Erro ao salvar formulário', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                    if (onCancel) {
                        onCancel();
                    }
                },
            },
        );
    };

    const pageTitle = title || entityLabel.form;
    const pageSubtitle = subtitle || entityDisplayName;

    const formContent = (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSave();
            }}
            className="space-y-6"
        >
            <div className="grid gap-6 mt-4">
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
                                                taskTypes={TaskTypes}
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
                                    taskIcons[task.id] ||
                                    (taskType ? <taskType.icon className="size-5" /> : <ClipboardCheck className="size-5" />);

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
        </form>
    );

    // If inline mode, return just the form content without action buttons
    if (inline) {
        return (
            <div className="space-y-6">
                {formContent}
                {/* Hidden button that can be triggered from parent */}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={processing}
                    data-form-save-button
                    style={{ display: 'none' }}
                    aria-hidden="true"
                >
                    {processing ? 'Salvando...' : 'Salvar Tarefas'}
                </button>
            </div>
        );
    }

    // Otherwise, return with full layout
    return (
        <AppLayout breadcrumbs={breadcrumbs || defaultBreadcrumbs}>
            <Head title={`${pageTitle} - ${pageSubtitle}`} />

            <CreateLayout
                title={pageTitle}
                subtitle={pageSubtitle}
                breadcrumbs={breadcrumbs || defaultBreadcrumbs}
                backRoute={backRoute || '#'}
                onSave={handleSave}
                isSaving={processing}
                contentWidth="custom"
                contentClassName=""
            >
                {formContent}
            </CreateLayout>
        </AppLayout>
    );
}
