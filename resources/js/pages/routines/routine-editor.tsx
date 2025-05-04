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
import { Task, TaskType, TaskTypes, TaskOperations } from '@/types/task';
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

    // Função utilitária para atualizar uma tarefa
    const updateTask = (index: number, operation: (task: Task) => Task) => {
        const updatedTasks = [...tasks];
        updatedTasks[index] = operation(updatedTasks[index]);
        setTasks(updatedTasks);
    };

    // Função utilitária para adicionar uma nova tarefa
    const addTask = (index: number, task: Task) => {
        const updatedTasks = [...tasks];
        updatedTasks.splice(index + 1, 0, task);
        setTasks(updatedTasks);
        setSelectedTaskIndex(index + 1);
    };

    // Função utilitária para remover uma tarefa
    const removeTask = (index: number) => {
        const updatedTasks = [...tasks];
        updatedTasks.splice(index, 1);
        setTasks(updatedTasks);
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

    const getTaskById = (id: string) => {
        const taskId = parseInt(id.replace('task-', ''));
        return tasks.find(task => task.id === taskId.toString());
    };

    const handleSave = () => {
        // Remove isEditing flag from tasks before saving
        const tasksToSave = tasks.map(({ isEditing, ...task }) => task);
        
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

    const handleNewTaskAtIndex = (index: number, type?: TaskType) => {
        if (!type) return;
        
        const newTask = TaskOperations.createAtIndex(
            tasks,
            index,
            type
        );
        
        addTask(index, newTask);
    };

    const handleTaskTypeChange = (type: TaskType) => {
        if (selectedTaskIndex !== null) {
            // Se temos uma tarefa selecionada, apenas mudamos seu tipo
            updateTask(selectedTaskIndex, task => TaskOperations.updateType(task, type));
        } else {
            // Caso contrário, criamos uma nova tarefa no final da lista
            handleNewTaskAtIndex(tasks.length - 1, type);
        }
    };

    const handleNewTask = () => {
        handleNewTaskAtIndex(tasks.length - 1);
    };

    const handleEditTask = (index: number) => {
        updateTask(index, task => ({
            ...task,
            isEditing: true
        }));
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
                                                    onTaskTypeChange={handleTaskTypeChange}
                                                    onNewTask={() => handleNewTask()}
                                                />
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        tasks.map((task, index) => (
                                            task.isEditing ? (
                                                <TaskEditorCard
                                                    key={`task-${task.id}`}
                                                    initialTask={TaskOperations.convertTaskState(task)}
                                                    task={{
                                                        type: task.type,
                                                        measurementPoints: task.measurementPoints,
                                                        options: task.options,
                                                        isRequired: task.isRequired
                                                    }}
                                                    onPreview={(newTask) => updateTask(index, t => ({
                                                        ...TaskOperations.convertTaskState(newTask),
                                                        id: t.id
                                                    }))}
                                                    onRemove={() => {
                                                        if (!tasks[index].description) {
                                                            removeTask(index);
                                                        } else {
                                                            updateTask(index, task => ({
                                                                ...task,
                                                                isEditing: false
                                                            }));
                                                        }
                                                    }}
                                                    onNewTask={() => handleNewTaskAtIndex(index)}
                                                    updateTask={(operation) => updateTask(index, operation)}
                                                />
                                            ) : (
                                                <TaskCard
                                                    key={`task-${task.id}`}
                                                    task={TaskOperations.convertTaskState(task)}
                                                    index={index}
                                                    onEdit={() => handleEditTask(index)}
                                                    onTypeChange={(type) => updateTask(index, task => TaskOperations.updateType(task, type))}
                                                    onNewTask={() => handleNewTaskAtIndex(index)}
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
                                        const task = getTaskById(activeId);
                                        if (!task) return null;
                                        
                                        return task.isEditing ? (
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
                                                onNewTask={() => handleNewTaskAtIndex(tasks.findIndex(t => t.id === task.id))}
                                                updateTask={(operation) => {
                                                    const index = tasks.findIndex(t => t.id === task.id);
                                                    if (index !== -1) {
                                                        updateTask(index, operation);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <TaskCard
                                                key={`overlay-${task.id}`}
                                                task={TaskOperations.convertTaskState(task)}
                                                index={tasks.findIndex(t => t.id === task.id)}
                                                onEdit={() => {}}
                                                onTypeChange={() => {}}
                                                onNewTask={() => handleNewTaskAtIndex(tasks.findIndex(t => t.id === task.id))}
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