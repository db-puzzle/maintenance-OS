import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { useState, useEffect } from 'react';
import { Camera, FileText, List, MessageSquare, PlusCircle, Save, X } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/TaskCard';
import TaskEditorCard from '@/components/TaskEditorCard';
import { Task } from '@/types/task';
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
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

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
    const [activeId, setActiveId] = useState<string | null>(null);

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
        // Adiciona uma tarefa inicial quando o componente é montado
        const initialTask: Task = {
            id: 1,
            type: 'question',
            description: '',
            instructionImages: [],
            required: true,
            isEditing: true
        };
        setTasks([initialTask]);
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
        return tasks.find(task => task.id === taskId);
    };

    const handleSave = () => {
        // Remove isEditing flag from tasks before saving
        const tasksToSave = tasks.map(({ isEditing, ...task }) => task);
        
        post(route('routines.store'), {
            onSuccess: () => {
                reset();
                toast.success("Rotina criada com sucesso!");
            },
            onError: (errors) => {
                toast.error("Erro ao criar rotina", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    const handleNewTaskAtIndex = (index: number) => {
        const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id || 0)) + 1 : 1;
        const newTask: Task = {
            id: newId,
            type: 'question',
            description: '',
            instructionImages: [],
            required: true,
            isEditing: true
        };
        
        const updatedTasks = [...tasks];
        updatedTasks.splice(index + 1, 0, newTask);
        setTasks(updatedTasks);
    };

    const handleNewTask = () => {
        handleNewTaskAtIndex(tasks.length - 1);
    };

    const handleSaveTask = (index: number, newTask: Task) => {
        const updatedTasks = [...tasks];
        updatedTasks[index] = { 
            ...newTask, 
            id: tasks[index].id || Math.max(...tasks.map(t => t.id || 0)) + 1,
            isEditing: false 
        };
        setTasks(updatedTasks);
    };

    const handleCancelTask = (index: number) => {
        const updatedTasks = [...tasks];
        if (!updatedTasks[index].description) {
            // Remove task if it's empty
            updatedTasks.splice(index, 1);
        } else {
            updatedTasks[index].isEditing = false;
        }
        setTasks(updatedTasks);
    };

    const handleEditTask = (index: number) => {
        const updatedTasks = [...tasks];
        updatedTasks[index].isEditing = true;
        setTasks(updatedTasks);
    };

    const getTaskTypeIcon = (type: Task['type']) => {
        switch(type) {
            case 'question':
                return <MessageSquare className="text-blue-500" />;
            case 'multiple_choice':
                return <List className="text-green-500" />;
            case 'measurement':
                return <FileText className="text-orange-500" />;
            case 'photo':
                return <Camera className="text-purple-500" />;
            default:
                return <FileText className="text-gray-500" />;
        }
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
                                    {tasks.map((task, index) => (
                                        task.isEditing ? (
                                            <TaskEditorCard
                                                key={`task-${task.id}`}
                                                initialTask={task}
                                                onSave={(newTask) => handleSaveTask(index, newTask)}
                                                onCancel={() => handleCancelTask(index)}
                                                onNewTask={() => handleNewTaskAtIndex(index)}
                                            />
                                        ) : (
                                            <TaskCard
                                                key={`task-${task.id}`}
                                                task={task}
                                                index={index}
                                                onEdit={() => handleEditTask(index)}
                                                onTypeChange={(type) => {
                                                    const newTasks = [...tasks];
                                                    newTasks[index].type = type;
                                                    setTasks(newTasks);
                                                }}
                                            />
                                        )
                                    ))}
                                </SortableContext>
                                
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleNewTask}
                                    className="mt-2 flex items-center gap-2 w-fit"
                                >
                                    <PlusCircle size={16} />
                                    Nova Tarefa
                                </Button>
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
                                                initialTask={task}
                                                onSave={() => {}}
                                                onCancel={() => {}}
                                                onNewTask={() => handleNewTaskAtIndex(tasks.findIndex(t => t.id === task.id))}
                                            />
                                        ) : (
                                            <TaskCard
                                                key={`overlay-${task.id}`}
                                                task={task}
                                                index={tasks.findIndex(t => t.id === task.id)}
                                                onEdit={() => {}}
                                                onTypeChange={() => {}}
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