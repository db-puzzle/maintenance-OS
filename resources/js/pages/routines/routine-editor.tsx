import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { useState, useEffect, memo, useRef } from 'react';
import { Camera, FileText, ClipboardCheck, ListChecks, Ruler, CheckSquare, ScanBarcode, Upload, CircleCheck, QrCode, Barcode, ChevronDown, ChevronUp } from 'lucide-react';
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
    
    const [renderExamples, setRenderExamples] = useState(false);
    const [examplesVisible, setExamplesVisible] = useState(false);
    const examplesRef = useRef<HTMLDivElement>(null);
    
    // Adicionar estados para última categoria e unidade selecionada
    const [lastMeasurementCategory, setLastMeasurementCategory] = useState<UnitCategory>('Comprimento');
    const [lastMeasurementUnit, setLastMeasurementUnit] = useState<string>('m');
    
    // Estados para os exemplos
    const [questionMode, setQuestionMode] = useState<'edit' | 'preview'>('edit');
    const [choiceMode, setChoiceMode] = useState<'edit' | 'preview'>('edit');
    const [selectMode, setSelectMode] = useState<'edit' | 'preview'>('edit');
    const [measurementMode, setMeasurementMode] = useState<'edit' | 'preview'>('edit');
    
    // Estados para os títulos dos exemplos
    const [questionTitle, setQuestionTitle] = useState('Pergunta Aberta');
    const [choiceTitle, setChoiceTitle] = useState('Múltipla Escolha');
    const [selectTitle, setSelectTitle] = useState('Múltipla Seleção');
    const [measurementTitle, setMeasurementTitle] = useState('Medição');
    const [photoTitle, setPhotoTitle] = useState('Captura de Foto');
    const [codeReaderTitle, setCodeReaderTitle] = useState('Leitura de Código');
    const [fileUploadTitle, setFileUploadTitle] = useState('Faça upload do relatório de vibração');

    // Estados para controlar required de cada exemplo
    const [questionRequired, setQuestionRequired] = useState(true);
    const [choiceRequired, setChoiceRequired] = useState(true);
    const [selectRequired, setSelectRequired] = useState(true);
    const [measurementRequired, setMeasurementRequired] = useState(true);
    const [photoRequired, setPhotoRequired] = useState(true);
    const [codeReaderRequired, setCodeReaderRequired] = useState(true);
    const [fileUploadRequired, setFileUploadRequired] = useState(true);
    
    // Estado para controlar o ícone do leitor de código
    const [codeReaderIcon, setCodeReaderIcon] = useState<React.ReactNode>(null);
    
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

    // Função atualizada para controlar a exibição de exemplos
    const toggleExamples = (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (examplesVisible) {
            // Se estiver ocultando, simplesmente oculte
            setExamplesVisible(false);
            setTimeout(() => {
                setRenderExamples(false);
            }, 300); // Tempo para a animação de fade-out completar
        } else {
            // Capture a posição de rolagem atual
            const scrollPosition = window.scrollY;
            
            // Se estiver mostrando, primeiro renderize (mas invisível)
            setRenderExamples(true);
            
            // Em seguida, torne visível após um breve momento
            setTimeout(() => {
                // Restaure a posição de rolagem
                window.scrollTo(0, scrollPosition);
                setExamplesVisible(true);
            }, 50);
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
                            <button 
                                type="button"
                                onClick={toggleExamples}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {examplesVisible ? (
                                    <>
                                        <ChevronUp className="size-4" />
                                        <span className="whitespace-nowrap">Ocultar exemplos</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="size-4" />
                                        <span className="whitespace-nowrap">Mostrar exemplos</span>
                                    </>
                                )}
                            </button>
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

                        <div className="mt-8">
                            {renderExamples && (
                                <div 
                                    className={`grid gap-4 transition-all duration-300 ease-in-out overflow-hidden ${
                                        examplesVisible 
                                            ? 'opacity-100 max-h-[1000vh]' 
                                            : 'opacity-0 max-h-0'
                                    }`} 
                                    id="examples-section" 
                                    ref={examplesRef}
                                >
                                    <h3 className="text-lg font-medium mb-4">Exemplos do TaskBaseCard</h3>
                                    
                                    {/* GRUPO DE QUESTÕES */}
                                    
                                    {/* Pergunta Aberta - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-question-edit"
                                        mode={questionMode}
                                        icon={<CheckSquare className="size-5" />}
                                        title={questionTitle}
                                        onTitleChange={setQuestionTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => setQuestionMode('preview')}
                                        onEdit={() => setQuestionMode('edit')}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={questionRequired}
                                        onRequiredChange={setQuestionRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-question',
                                                type: 'question',
                                                description: 'Descreva as condições da área de trabalho',
                                                state: TaskState.Viewing,
                                                isRequired: questionRequired,
                                                instructionImages: []
                                            }}
                                            mode={questionMode}
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Pergunta Aberta - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-question-respond"
                                        mode="respond"
                                        icon={<CheckSquare className="size-5" />}
                                        title={questionTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={questionRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-question-respond',
                                                type: 'question',
                                                description: 'Descreva as condições da área de trabalho',
                                                state: TaskState.Viewing,
                                                isRequired: questionRequired,
                                                instructionImages: []
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Múltipla Escolha - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-multiple-choice-edit"
                                        mode={choiceMode}
                                        icon={<CircleCheck className="size-5" />}
                                        title={choiceTitle}
                                        onTitleChange={setChoiceTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => setChoiceMode('preview')}
                                        onEdit={() => setChoiceMode('edit')}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={choiceRequired}
                                        onRequiredChange={setChoiceRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-mc',
                                                type: 'multiple_choice',
                                                description: 'Qual o estado do equipamento?',
                                                state: TaskState.Viewing,
                                                isRequired: choiceRequired,
                                                instructionImages: [],
                                                options: [
                                                    'Operando normalmente',
                                                    'Operando com restrições',
                                                    'Em manutenção',
                                                    'Desligado'
                                                ]
                                            }}
                                            mode={choiceMode}
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Múltipla Escolha - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-multiple-choice-respond"
                                        mode="respond"
                                        icon={<CircleCheck className="size-5" />}
                                        title={choiceTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={choiceRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-mc-respond',
                                                type: 'multiple_choice',
                                                description: 'Qual o estado do equipamento?',
                                                state: TaskState.Viewing,
                                                isRequired: choiceRequired,
                                                instructionImages: [],
                                                options: [
                                                    'Operando normalmente',
                                                    'Operando com restrições',
                                                    'Em manutenção',
                                                    'Desligado'
                                                ]
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Múltipla Seleção - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-multiple-select-edit"
                                        mode={selectMode}
                                        icon={<ListChecks className="size-5" />}
                                        title={selectTitle}
                                        onTitleChange={setSelectTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => setSelectMode('preview')}
                                        onEdit={() => setSelectMode('edit')}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={selectRequired}
                                        onRequiredChange={setSelectRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-ms',
                                                type: 'multiple_select',
                                                description: 'Quais problemas você observa?',
                                                state: TaskState.Viewing,
                                                isRequired: selectRequired,
                                                instructionImages: [],
                                                options: [
                                                    'Vibração excessiva',
                                                    'Ruído anormal',
                                                    'Superaquecimento',
                                                    'Vazamento de fluidos',
                                                    'Corrosão visível'
                                                ]
                                            }}
                                            mode={selectMode}
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Múltipla Seleção - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-multiple-select-respond"
                                        mode="respond"
                                        icon={<ListChecks className="size-5" />}
                                        title={selectTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={selectRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-ms-respond',
                                                type: 'multiple_select',
                                                description: 'Quais problemas você observa?',
                                                state: TaskState.Viewing,
                                                isRequired: selectRequired,
                                                instructionImages: [],
                                                options: [
                                                    'Vibração excessiva',
                                                    'Ruído anormal',
                                                    'Superaquecimento',
                                                    'Vazamento de fluidos',
                                                    'Corrosão visível'
                                                ]
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* GRUPO DE MEDIÇÕES */}
                                    
                                    {/* Medição - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-measurement-edit"
                                        mode={measurementMode}
                                        icon={<Ruler className="size-5" />}
                                        title={measurementTitle}
                                        onTitleChange={setMeasurementTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => setMeasurementMode('preview')}
                                        onEdit={() => setMeasurementMode('edit')}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={measurementRequired}
                                        onRequiredChange={setMeasurementRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-measurement',
                                                type: 'measurement',
                                                description: 'Registre as medições dos pontos',
                                                state: TaskState.Viewing,
                                                isRequired: measurementRequired,
                                                instructionImages: [],
                                                measurement: {
                                                    name: 'Temperatura',
                                                    min: 20,
                                                    target: 25,
                                                    max: 30,
                                                    unit: 'celsius',
                                                    category: 'Temperatura'
                                                }
                                            }}
                                            mode={measurementMode}
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Medição - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-measurement-respond"
                                        mode="respond"
                                        icon={<Ruler className="size-5" />}
                                        title={measurementTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={measurementRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-measurement-respond',
                                                type: 'measurement',
                                                description: 'Registre as medições dos pontos',
                                                state: TaskState.Viewing,
                                                isRequired: measurementRequired,
                                                instructionImages: [],
                                                measurement: {
                                                    name: 'Temperatura',
                                                    min: 20,
                                                    target: 25,
                                                    max: 30,
                                                    unit: 'celsius',
                                                    category: 'Temperatura'
                                                }
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* GRUPO DE COLETA DE DADOS */}
                                    
                                    {/* Foto - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-photo-edit"
                                        mode="edit"
                                        icon={<Camera className="size-5" />}
                                        title={photoTitle}
                                        onTitleChange={setPhotoTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => {}}
                                        onEdit={() => {}}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={photoRequired}
                                        onRequiredChange={setPhotoRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-photo',
                                                type: 'photo',
                                                description: 'Tire uma foto da área de trabalho',
                                                state: TaskState.Viewing,
                                                isRequired: photoRequired,
                                                instructionImages: []
                                            }}
                                            mode="edit"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Foto - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-photo-respond"
                                        mode="respond"
                                        icon={<Camera className="size-5" />}
                                        title={photoTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={photoRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-photo-respond',
                                                type: 'photo',
                                                description: 'Tire uma foto da área de trabalho',
                                                state: TaskState.Viewing,
                                                isRequired: photoRequired,
                                                instructionImages: []
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Leitura de Código - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-code-edit"
                                        mode="edit"
                                        icon={codeReaderIcon || <ScanBarcode className="size-5" />}
                                        title={codeReaderTitle}
                                        onTitleChange={setCodeReaderTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => {}}
                                        onEdit={() => {}}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={codeReaderRequired}
                                        onRequiredChange={setCodeReaderRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-qr',
                                                type: 'code_reader',
                                                description: 'Escaneie o QR Code do equipamento',
                                                codeReaderType: 'qr_code',
                                                codeReaderInstructions: 'Posicione o QR Code no centro da câmera e aguarde a leitura.',
                                                state: TaskState.Viewing,
                                                isRequired: codeReaderRequired,
                                                instructionImages: []
                                            }}
                                            mode="edit"
                                            onUpdate={() => {}}
                                            onIconChange={setCodeReaderIcon}
                                        />
                                    </TaskBaseCard>

                                    {/* Leitura de Código - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-code-respond"
                                        mode="respond"
                                        icon={codeReaderIcon || <ScanBarcode className="size-5" />}
                                        title={codeReaderTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={codeReaderRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-qr-respond',
                                                type: 'code_reader',
                                                description: 'Escaneie o QR Code do equipamento',
                                                codeReaderType: 'qr_code',
                                                codeReaderInstructions: 'Posicione o QR Code no centro da câmera e aguarde a leitura.',
                                                state: TaskState.Viewing,
                                                isRequired: codeReaderRequired,
                                                instructionImages: []
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                            onIconChange={setCodeReaderIcon}
                                        />
                                    </TaskBaseCard>

                                    {/* Upload de Arquivo - Modo Edição/Visualização */}
                                    <TaskBaseCard
                                        id="example-upload-edit"
                                        mode="edit"
                                        icon={<Upload className="size-5" />}
                                        title={fileUploadTitle}
                                        onTitleChange={setFileUploadTitle}
                                        onRemove={() => {}}
                                        onNewTask={() => {}}
                                        onPreview={() => {}}
                                        onEdit={() => {}}
                                        taskTypes={TaskTypes}
                                        tasks={[]}
                                        currentIndex={0}
                                        isRequired={fileUploadRequired}
                                        onRequiredChange={setFileUploadRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-upload',
                                                type: 'file_upload',
                                                description: 'Faça upload do relatório de vibração',
                                                fileUploadInstructions: 'Envie o arquivo PDF gerado pelo equipamento de análise de vibração.',
                                                state: TaskState.Viewing,
                                                isRequired: fileUploadRequired,
                                                instructionImages: []
                                            }}
                                            mode="edit"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>

                                    {/* Upload de Arquivo - Modo Resposta */}
                                    <TaskBaseCard
                                        id="example-upload-respond"
                                        mode="respond"
                                        icon={<Upload className="size-5" />}
                                        title={fileUploadTitle}
                                        isLastTask={false}
                                        onNext={() => {}}
                                        isRequired={fileUploadRequired}
                                    >
                                        <TaskContent 
                                            task={{
                                                id: 'example-task-upload-respond',
                                                type: 'file_upload',
                                                description: 'Faça upload do relatório de vibração',
                                                fileUploadInstructions: 'Envie o arquivo PDF gerado pelo equipamento de análise de vibração.',
                                                state: TaskState.Viewing,
                                                isRequired: fileUploadRequired,
                                                instructionImages: []
                                            }}
                                            mode="respond"
                                            onUpdate={() => {}}
                                        />
                                    </TaskBaseCard>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 