import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { useState, useEffect, memo, useRef } from 'react';
import { Camera, FileText, ClipboardCheck, ListChecks, Ruler, CheckSquare, ScanBarcode, Upload, CircleCheck, QrCode, Barcode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TaskBaseCard, TaskContent } from '@/components/tasks';
import { Task, TaskType, TaskTypes, TaskOperations, TaskState, DefaultMeasurement } from '@/types/task';
import { UnitCategory } from '@/types/units';
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
import AddTaskButton from '@/components/tasks/AddTaskButton';

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
    const [cardMode, setCardMode] = useState<'edit' | 'preview'>('edit');
    
    // Adicionar estados para última categoria e unidade selecionada
    const [lastMeasurementCategory, setLastMeasurementCategory] = useState<UnitCategory>('Comprimento');
    const [lastMeasurementUnit, setLastMeasurementUnit] = useState<string>('m');
    
    // Estado para armazenar os ícones personalizados por ID de tarefa
    const [taskIcons, setTaskIcons] = useState<Record<string, React.ReactNode>>({});
    
    // Função para atualizar o ícone de uma tarefa específica
    const updateTaskIcon = (taskId: string, icon: React.ReactNode) => {
        setTaskIcons(prev => {
            // Se o ícone for igual ao anterior, não atualize o estado
            if (prev[taskId] === icon) return prev;
            return {
                ...prev,
                [taskId]: icon
            };
        });
    };

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
            
            // Definir ícone personalizado para tarefas de código de barras
            // Não fazemos isso aqui para evitar loop infinito
            // O ícone será definido pelo useEffect no componente CodeReaderTaskContent
            
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
                
                // Se for uma tarefa de medição, use a última categoria/unidade selecionada
                if (taskToAdd.type === 'measurement') {
                    taskToAdd.measurement = {
                        ...DefaultMeasurement,
                        category: lastMeasurementCategory,
                        unit: lastMeasurementUnit
                    };
                }
            } else if (type) {
                // Caso contrário, crie uma nova tarefa com o tipo especificado
                taskToAdd = TaskOperations.createAtIndex(
                    tasks,
                    index,
                    type
                );
                
                // Se for uma tarefa de medição, use a última categoria/unidade selecionada
                if (type === 'measurement') {
                    taskToAdd.measurement = {
                        ...DefaultMeasurement,
                        category: lastMeasurementCategory,
                        unit: lastMeasurementUnit
                    };
                }
                
                // Se for uma tarefa de código, defina o tipo padrão como barcode
                if (type === 'code_reader') {
                    taskToAdd.codeReaderType = 'barcode';
                }
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
        // Converte as tarefas para um formato compatível com FormDataConvertible
        const tasksToSave = tasks.map(task => ({
            ...task,
            measurement: task.measurement ? {
                ...task.measurement,
                name: task.measurement.name,
                min: task.measurement.min,
                target: task.measurement.target,
                max: task.measurement.max,
                unit: task.measurement.unit,
                category: task.measurement.category
            } : undefined,
            options: task.options?.map(option => option) || [],
            instructionImages: task.instructionImages || []
        }));
        
        // Use o router.post diretamente
        router.post(route('routines.store'), {
            name: data.name,
            trigger_hours: data.trigger_hours,
            type: data.type,
            tasks: JSON.stringify(tasksToSave), // Convertendo para string
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
                contentClassName=""
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
                                            <CardContent className="px-4 sm:px-6 py-8 flex flex-col items-center justify-center text-center">
                                                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                                    <ClipboardCheck className="size-6 text-foreground/60" />
                                                </div>
                                                <h3 className="text-lg font-medium mb-2">Nenhuma tarefa adicionada</h3>
                                                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                                                    Adicione tarefas para compor seu formulário.
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
                                                            setSelectedTaskIndex(updatedTasks.length - 1);
                                                        }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        tasks.map((task, index) => {
                                            // Determinar o ícone com base no tipo de tarefa
                                            const taskType = TaskTypes.find(t => t.value === task.type);
                                            // Usar o ícone personalizado se existir, senão usar o padrão
                                            const icon = taskIcons[task.id] || 
                                                (taskType ? <taskType.icon className="size-5" /> : <FileText className="size-5" />);
                                            
                                            // Convertendo para o novo formato de card
                                            return (
                                                <TaskBaseCard
                                                    key={`task-${task.id}`}
                                                    id={task.id}
                                                    mode={TaskOperations.isEditing(task) ? 'edit' : (
                                                        TaskOperations.isPreviewing(task) ? 'preview' : (
                                                            TaskOperations.isResponding(task) ? 'respond' : 'preview'
                                                        )
                                                    )}
                                                    icon={icon}
                                                    title={task.description}
                                                    onTitleChange={(newTitle) => {
                                                        taskMethods.update(index, t => ({
                                                            ...t,
                                                            description: newTitle
                                                        }));
                                                    }}
                                                    onRemove={() => {
                                                        if (TaskOperations.isEditing(task) && !task.description) {
                                                            taskMethods.remove(index);
                                                        } else {
                                                            taskMethods.setState(index, TaskState.Viewing);
                                                        }
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
                                                        taskMethods.update(index, t => TaskOperations.updateRequired(t, required))
                                                    }
                                                    onTaskUpdate={(updatedTask) => {
                                                        taskMethods.update(index, () => updatedTask);
                                                    }}
                                                >
                                                    <TaskContent
                                                        task={task}
                                                        mode={TaskOperations.isEditing(task) ? 'edit' : (
                                                            TaskOperations.isPreviewing(task) ? 'preview' : (
                                                                TaskOperations.isResponding(task) ? 'respond' : 'preview'
                                                            )
                                                        )}
                                                        onUpdate={(updatedTask) => {
                                                            // Atualizar última categoria/unidade quando uma tarefa de medição é atualizada
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
                                        
                                        // Determinar o ícone com base no tipo de tarefa
                                        const taskType = TaskTypes.find(t => t.value === task.type);
                                        // Usar o ícone personalizado se existir, senão usar o padrão
                                        const icon = taskIcons[task.id] || 
                                            (taskType ? <taskType.icon className="size-5" /> : <FileText className="size-5" />);
                                        
                                        return (
                                            <TaskBaseCard
                                                key={`overlay-${task.id}`}
                                                id={task.id}
                                                mode={TaskOperations.isEditing(task) ? 'edit' : 'preview'}
                                                icon={icon}
                                                title={task.description}
                                                isRequired={task.isRequired}
                                                onTaskUpdate={() => {}}
                                            >
                                                <TaskContent
                                                    task={task}
                                                    mode={TaskOperations.isEditing(task) ? 'edit' : 'preview'}
                                                    onUpdate={() => {}}
                                                    onIconChange={(newIcon) => updateTaskIcon(task.id, newIcon)}
                                                />
                                            </TaskBaseCard>
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