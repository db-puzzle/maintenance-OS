import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { useState, useEffect } from 'react';
import { Camera, FileText, List, MessageSquare, PlusCircle, Save, X, ClipboardCheck, ListChecks, Ruler, CheckSquare, ScanBarcode, Upload } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/TaskCard';
import TaskEditorCard from '@/components/TaskEditorCard';
import { Task, TaskType, TaskTypes, TaskOperations, TaskState } from '@/types/task';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    MeasuringStrategy,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent,
    MouseSensor,
    TouchSensor,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import AddTaskButton from '@/components/AddTaskButton';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rotinas',
        href: '/routines/index',
    },
    {
        title: 'Nova Rotina',
        href: '/routines/routine-editor',
    },
];

interface RoutineForm {
    [key: string]: string | number | undefined;
    name: string;
    trigger_hours: string;
    type: number | undefined;
}

interface Props {
}

export default function CreateRoutine({ }: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<RoutineForm>({
        name: '',
        trigger_hours: '',
        type: undefined,
    });

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Funções utilitárias para gerenciamento de tarefas
    const taskMethods = {
        // Atualizar uma tarefa existente
        update: (index: number, operation: (task: Task) => Task) => {
            const updatedTasks = [...tasks];
            updatedTasks[index] = operation(updatedTasks[index]);
            setTasks(updatedTasks);
        },

        // Adicionar uma nova tarefa
        add: (index: number, task: Task) => {
            // Certifique-se de que a tarefa tenha um ID único
            const existingIds = new Set(tasks.map(t => t.id));
            if (existingIds.has(task.id)) {
                // Se o ID já existe, gere um novo
                task = {
                    ...task,
                    id: TaskOperations.generateNextId(tasks)
                };
            }
            
            const updatedTasks = [...tasks];
            updatedTasks.splice(index + 1, 0, task);
            setTasks(updatedTasks);
            setSelectedTaskIndex(index + 1);
        },

        // Remover uma tarefa
        remove: (index: number) => {
            const updatedTasks = [...tasks];
            updatedTasks.splice(index, 1);
            setTasks(updatedTasks);
        },

        // Criar uma nova tarefa em um índice específico
        createAt: (index: number, type?: TaskType, newTask?: Task) => {
            if (!type && !newTask) return;
            
            let taskToAdd: Task;
            
            if (newTask) {
                // Se uma tarefa já foi criada, use-a
                taskToAdd = newTask;
            } else if (type) {
                // Caso contrário, crie uma nova tarefa com o tipo especificado
                taskToAdd = TaskOperations.createAtIndex(
                    tasks,
                    index,
                    type
                );
            } else {
                return;
            }
            
            taskMethods.add(index, taskToAdd);
        },

        // Alterar o estado de uma tarefa
        setState: (index: number, state: TaskState) => {
            taskMethods.update(index, task => ({
                ...task,
                state
            }));
        },

        // Obter uma tarefa pelo ID (usado no arrastar e soltar)
        getById: (id: string) => {
            const taskId = parseInt(id.replace('task-', ''));
            return tasks.find(task => task.id === taskId.toString());
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Não vamos mais criar uma tarefa inicial automaticamente
        setTasks([]);
    }, []);

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

                // Se ambos os índices são válidos, faça a reordenação
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
        // Remove state flag from tasks before saving
        const tasksToSave = tasks.map(({ state, ...task }) => task);
        
        // Use o router.post diretamente
        router.post(route('routines.store'), {
            name: data.name,
            trigger_hours: data.trigger_hours,
            type: data.type,
            tasks: tasksToSave,
        }, {
            onSuccess: () => {
                toast.success("Rotina criada com sucesso!");
            },
            onError: () => {
                toast.error("Erro ao criar rotina", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Rotina" />

            <CreateLayout
                title="Nova Rotina"
                subtitle="Adicione uma nova rotina de manutenção"
                breadcrumbs={breadcrumbs}
                backRoute={route('routines.index')}
                onSave={handleSave}
                isSaving={processing}
                contentWidth="custom"
                contentClassName="w-[950px]"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <TextInput<RoutineForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="name"
                                label="Nome da Rotina"
                                placeholder="Escreva o nome da rotina"
                                required
                            />
                            <ItemSelect
                                label="Tipo de Rotina"
                                items={[
                                    { id: 1, name: 'Inspeção' },
                                    { id: 2, name: 'Manutenção Preventiva' },
                                    { id: 3, name: 'Manutenção Corretiva' }
                                ]}
                                value={data.type ? data.type.toString() : ''}
                                onValueChange={(value) => {
                                    if (value && value !== '') {
                                        setData('type', Number(value));
                                    } else {
                                        setData('type', undefined);
                                    }
                                }}
                                placeholder="Selecione o tipo de rotina"
                                required
                                canCreate={false}
                                createRoute=""
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Tarefas da Rotina</h3>
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragCancel={handleDragCancel}
                            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                            measuring={{
                                droppable: {
                                    strategy: MeasuringStrategy.Always
                                }
                            }}
                        >
                            <div className="grid gap-4">
                                <SortableContext
                                    items={tasks.map(task => `task-${task.id}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {tasks.length === 0 ? (
                                        <Card className="bg-muted/30">
                                            <CardContent className="px-6 py-8 flex flex-col items-center justify-center text-center">
                                                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                                    <ClipboardCheck className="size-6 text-foreground/60" />
                                                </div>
                                                <h3 className="text-lg font-medium mb-2">Nenhuma tarefa adicionada</h3>
                                                <p className="text-sm text-muted-foreground mb-6">
                                                    Adicione tarefas para compor seu formulário.
                                                </p>
                                                <AddTaskButton
                                                    label="Nova Tarefa"
                                                    taskTypes={TaskTypes}
                                                    tasks={tasks}
                                                    currentIndex={-1}
                                                    onTaskAdded={(newTask) => {
                                                        const updatedTasks = [...tasks, newTask];
                                                        setTasks(updatedTasks);
                                                        setSelectedTaskIndex(updatedTasks.length - 1);
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        tasks.map((task, index) => (
                                            TaskOperations.isEditing(task) ? (
                                                <TaskEditorCard
                                                    key={`task-${task.id}`}
                                                    initialTask={TaskOperations.convertTaskState(task)}
                                                    task={{
                                                        type: task.type,
                                                        measurementPoints: task.measurementPoints,
                                                        options: task.options,
                                                        isRequired: task.isRequired
                                                    }}
                                                    onPreview={(newTask) => taskMethods.update(index, t => ({
                                                        ...TaskOperations.convertTaskState(newTask),
                                                        id: t.id
                                                    }))}
                                                    onRemove={() => {
                                                        if (!tasks[index].description) {
                                                            taskMethods.remove(index);
                                                        } else {
                                                            taskMethods.setState(index, TaskState.Viewing);
                                                        }
                                                    }}
                                                    onNewTask={(newTask) => taskMethods.createAt(index, undefined, newTask)}
                                                    updateTask={(operation) => taskMethods.update(index, operation)}
                                                />
                                            ) : (
                                                <TaskCard
                                                    key={`task-${task.id}`}
                                                    task={TaskOperations.convertTaskState(task)}
                                                    index={index}
                                                    state={task.state || TaskState.Viewing}
                                                    onEdit={() => taskMethods.setState(index, TaskState.Editing)}
                                                    onTypeChange={(type) => taskMethods.update(index, task => TaskOperations.updateType(task, type))}
                                                    onNewTask={(newTask) => taskMethods.createAt(index, undefined, newTask)}
                                                    onPreview={() => taskMethods.setState(index, TaskState.Previewing)}
                                                    onRespond={() => taskMethods.setState(index, TaskState.Responding)}
                                                    onViewNormal={() => taskMethods.setState(index, TaskState.Viewing)}
                                                />
                                            )
                                        ))
                                    )}
                                </SortableContext>
                            </div>

                            <DragOverlay dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({
                                    styles: {
                                        active: {
                                            opacity: '0.5',
                                        },
                                    },
                                }),
                            }}>
                                {activeId ? (
                                    (() => {
                                        const task = taskMethods.getById(activeId);
                                        if (!task) return null;
                                        
                                        return TaskOperations.isEditing(task) ? (
                                            <TaskEditorCard
                                                key={`overlay-${task.id}`}
                                                initialTask={TaskOperations.convertTaskState(task)}
                                                task={{
                                                    type: task.type,
                                                    measurementPoints: task.measurementPoints,
                                                    options: task.options,
                                                    isRequired: task.isRequired
                                                }}
                                                onPreview={() => {}}
                                                onRemove={() => {}}
                                                onNewTask={(newTask) => taskMethods.createAt(tasks.findIndex(t => t.id === task.id), undefined, newTask)}
                                                updateTask={(operation) => {
                                                    const index = tasks.findIndex(t => t.id === task.id);
                                                    if (index !== -1) {
                                                        taskMethods.update(index, operation);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <TaskCard
                                                key={`overlay-${task.id}`}
                                                task={TaskOperations.convertTaskState(task)}
                                                index={tasks.findIndex(t => t.id === task.id)}
                                                state={task.state || TaskState.Viewing}
                                                onEdit={() => {}}
                                                onTypeChange={() => {}}
                                                onNewTask={(newTask) => taskMethods.createAt(tasks.findIndex(t => t.id === task.id), undefined, newTask)}
                                                onPreview={() => {}}
                                                onRespond={() => {}}
                                                onViewNormal={() => {}}
                                            />
                                        );
                                    })()
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 