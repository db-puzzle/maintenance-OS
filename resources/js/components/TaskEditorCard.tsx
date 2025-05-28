import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    X, GripVertical, Lightbulb, Plus, Clock, FileText, CheckSquare,
    ListChecks, Ruler, Camera, ScanBarcode, Upload, QrCode, Barcode,
    ClipboardList, ChevronRight
} from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TextInput from '@/components/TextInput';
import TaskDescriptionInput from '@/components/TaskDescriptionInput';
import { useForm } from '@inertiajs/react';
import { Task, TaskType, TaskTypes, TaskTypeGroups, CodeReaderTypes, TaskOperations, TaskState, Measurement, DefaultMeasurement } from '@/types/task';
import { UnitCategory, MeasurementUnitCategories, findUnitCategory } from '@/types/units';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import AddTaskButton from '@/components/tasks/AddTaskButton';

interface TaskEditorCardProps {
    /** A tarefa inicial sendo editada */
    initialTask?: Task;
    /** Propriedades essenciais da tarefa em edição */
    task: Pick<Task, 'type' | 'measurement' | 'options' | 'isRequired'>;
    /** Callback para pré-visualizar a tarefa após edição */
    onPreview: (task: Task) => void;
    /** Callback para remover a tarefa */
    onRemove: () => void;
    /** Callback para adicionar uma nova tarefa após esta */
    onNewTask: (newTask?: Task) => void;
    /** Callback para atualizar a tarefa com uma operação */
    updateTask: (operation: (task: Task) => Task) => void;
}

interface TaskForm {
    description: string;
    codeReaderType: 'qr_code' | 'barcode' | undefined;
    codeReaderInstructions: string;
    fileUploadInstructions: string;
    options: NonNullable<Task['options']>;
    [key: string]: string | number | boolean | File | null | NonNullable<Task['options']> | undefined;
}

export default function TaskEditorCard({
    initialTask,
    task: { type: taskType = 'question', measurement, options = [], isRequired },
    onPreview,
    onRemove,
    onNewTask,
    updateTask
}: TaskEditorCardProps) {
    const { data, setData, errors, clearErrors } = useForm<TaskForm>({
        description: initialTask?.description || '',
        codeReaderType: initialTask?.codeReaderType,
        codeReaderInstructions: initialTask?.codeReaderInstructions || '',
        fileUploadInstructions: initialTask?.fileUploadInstructions || '',
        options: options
    });

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `task-${initialTask?.id}`,
        animateLayoutChanges: () => false
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined
    };

    const [isChoiceBasedTask, setIsChoiceBasedTask] = useState(taskType === 'multiple_choice' || taskType === 'multiple_select');

    // Função utilitária para criar uma tarefa a partir do formulário
    const createTaskFromForm = (): Task => {
        if (!taskType) {
            throw new Error("Tipo de tarefa não definido");
        }

        const newTask: Task = {
            id: initialTask?.id || '0',
            type: taskType,
            description: data.description,
            instructionImages: initialTask?.instructionImages || [],
            instructions: initialTask?.instructions || [],
            isRequired,
            state: TaskState.Viewing
        };

        if (isChoiceBasedTask) {
            newTask.options = data.options;
        } else if (taskType === 'measurement') {
            newTask.measurement = measurement;
        } else if (taskType === 'code_reader') {
            if (data.codeReaderType) {
                newTask.codeReaderType = data.codeReaderType;
                newTask.codeReaderInstructions = data.codeReaderInstructions;
            }
        } else if (taskType === 'file_upload') {
            newTask.fileUploadInstructions = data.fileUploadInstructions;
        }

        return newTask;
    };

    useEffect(() => {
        if (initialTask) {
            setData({
                description: initialTask.description || '',
                codeReaderType: initialTask.codeReaderType,
                codeReaderInstructions: initialTask.codeReaderInstructions || '',
                fileUploadInstructions: initialTask.fileUploadInstructions || '',
                options: initialTask.options || []
            });
            setIsChoiceBasedTask(initialTask.type === 'multiple_choice' || initialTask.type === 'multiple_select');
        }
    }, [initialTask]);

    const taskLabels = taskType
        ? TaskTypes.find(t => t.value === taskType)
        : null;

    const handleRequiredChange = (required: boolean) => {
        updateTask(task => TaskOperations.updateRequired(task, required));
    };

    const handleOptionsChange = (newOptions: string[]) => {
        updateTask(task => TaskOperations.updateOptions(task, newOptions));
    };

    const handleAddOption = () => {
        updateTask(TaskOperations.addOption);
    };

    const handleRemoveOption = (index: number) => {
        updateTask(task => TaskOperations.removeOption(task, index));
    };

    const handleMeasurementChange = (newMeasurement: Measurement) => {
        updateTask(task => TaskOperations.updateMeasurement(task, newMeasurement));
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`bg-muted/90 ${isDragging ? 'shadow-lg' : ''}`}
        >
            <CardHeader>
                <div className="flex justify-between items-center">
                    {taskType && taskLabels && (
                        <TaskDescriptionInput<TaskForm>
                            mode="edit"
                            icon={taskLabels.icon}
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors
                            }}
                            name="description"
                            value={data.description}
                            placeholder={taskLabels?.placeholder || 'Digite a descrição da tarefa...'}
                            required
                        />
                    )}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="required"
                                checked={isRequired}
                                onCheckedChange={handleRequiredChange}
                            />
                            <Label htmlFor="required" className="text-sm text-muted-foreground">
                                Obrigatório
                            </Label>
                        </div>
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:cursor-grabbing touch-none"
                        >
                            <GripVertical className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-4">
                    {!taskType && (
                        <Card className="bg-background shadow-none">
                            <CardContent className="px-4 py-4 flex items-start space-x-4">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="size-6 text-foreground/60" />
                                    <span>Nenhuma tarefa cadastrada</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {taskType === 'code_reader' && (
                        <div className="w-90">
                            <ItemSelect
                                items={CodeReaderTypes}
                                label="Tipo de Código"
                                value={data.codeReaderType ? String(CodeReaderTypes.find(t => t.value === data.codeReaderType)?.id || '') : ''}
                                onValueChange={(value) => {
                                    const selectedType = CodeReaderTypes.find(t => t.id === Number(value));
                                    if (selectedType) {
                                        setData('codeReaderType', selectedType.value);
                                    } else {
                                        setData('codeReaderType', undefined);
                                    }
                                }}
                                placeholder="Selecione o tipo de código"
                                required
                                canCreate={false}
                                createRoute=""
                            />
                        </div>
                    )}

                    {taskType ? (
                        <div className="grid gap-2">
                            <TextInput<TaskForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="description"
                                label={taskLabels?.label || ''}
                                placeholder={taskLabels?.placeholder || 'Digite a descrição da tarefa...'}
                                required
                            />
                        </div>
                    ) : (
                        <Card className="bg-background shadow-none">
                            <CardContent className="px-4 py-4 flex items-start space-x-4">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="size-6 text-foreground/60" />
                                    <span>Nenhuma tarefa cadastrada</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isChoiceBasedTask && (
                        <div className="grid gap-2">
                            <div className="space-y-0.5 pl-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="text-base font-medium pt-2 ml-2">
                                        {taskType === 'multiple_choice' ? 'Opções de Escolha' : 'Opções de Seleção'}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddOption}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Opção
                                    </Button>
                                </div>
                                {options.length === 0 ? (
                                    <Card className="bg-background shadow-none">
                                        <CardContent className="px-4 flex items-start space-x-4">
                                            <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
                                                <Clock className="size-6 text-foreground/60" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-md font-medium">Nenhuma opção adicionada</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Adicione opções de resposta para esta tarefa.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-2">
                                        {options.map((value, index) => (
                                            <Card key={index} className="bg-background shadow-none">
                                                <CardContent className="flex items-center space-x-2">
                                                    <div className="flex-1">
                                                        <TextInput<TaskForm>
                                                            form={{
                                                                data: {
                                                                    ...data,
                                                                    [`option-${index}`]: value
                                                                },
                                                                setData: (field, value) => {
                                                                    if (field === `option-${index}`) {
                                                                        const newOptions = [...options];
                                                                        newOptions[index] = value;
                                                                        handleOptionsChange(newOptions);
                                                                    }
                                                                },
                                                                errors,
                                                                clearErrors
                                                            }}
                                                            name={`option-${index}`}
                                                            label={`Opção ${index + 1}`}
                                                            placeholder={`Descreva a opção ${index + 1}`}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="h-6 w-6 mt-6"
                                                        onClick={() => handleRemoveOption(index)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {taskType === 'measurement' && (
                        <div>
                            <Label>Medição</Label>
                            <div className="space-y-4">
                                <Card className="bg-background">
                                    <CardContent className="pt-4">
                                        <div className="mb-2">
                                            <Input
                                                value={measurement?.name || 'Medição'}
                                                onChange={(e) => {
                                                    handleMeasurementChange({
                                                        ...(measurement || DefaultMeasurement),
                                                        name: e.target.value
                                                    });
                                                }}
                                                placeholder="Nome da medição"
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label>Mínimo</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={measurement?.min}
                                                        onChange={(e) => {
                                                            handleMeasurementChange({
                                                                ...(measurement || DefaultMeasurement),
                                                                min: parseFloat(e.target.value)
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Target</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={measurement?.target}
                                                        onChange={(e) => {
                                                            handleMeasurementChange({
                                                                ...(measurement || DefaultMeasurement),
                                                                target: parseFloat(e.target.value)
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Máximo</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={measurement?.max}
                                                        onChange={(e) => {
                                                            handleMeasurementChange({
                                                                ...(measurement || DefaultMeasurement),
                                                                max: parseFloat(e.target.value)
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <Label>Unidade</Label>
                                            <div className="space-y-2">
                                                <Select
                                                    value={measurement?.unit ? findUnitCategory(measurement.unit) : 'Comprimento'}
                                                    onValueChange={(category) => {
                                                        // Se mudar de categoria, seleciona a primeira unidade da nova categoria
                                                        const firstUnitInCategory = MeasurementUnitCategories[category as UnitCategory][0].value;
                                                        handleMeasurementChange({
                                                            ...(measurement || DefaultMeasurement),
                                                            unit: firstUnitInCategory
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Escolha uma categoria" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {Object.keys(MeasurementUnitCategories).map((category) => (
                                                            <SelectItem key={category} value={category}>
                                                                {category}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {taskType === 'photo' && (
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Instruções para registro fotográfico serão configuradas através do sistema de instruções.
                            </p>
                        </div>
                    )}

                    {taskType === 'code_reader' && (
                        <div>
                            <TextInput<TaskForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="codeReaderInstructions"
                                label="Instruções para Leitura de Código"
                                placeholder="Como o código deve ser lido..."
                            />
                        </div>
                    )}

                    {taskType === 'file_upload' && (
                        <div>
                            <TextInput<TaskForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="fileUploadInstructions"
                                label="Instruções para Upload de Arquivo"
                                placeholder="Faça o download do registro de vibração e armazene o arquivo aqui..."
                            />
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="flex items-center gap-2"
                                >
                                    Excluir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A exclusão será permanente após a Rotina ser salva.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={onRemove}>
                                        Sim, excluir tarefa
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="flex gap-2">
                            <AddTaskButton
                                label="Nova Tarefa Abaixo"
                                taskTypes={TaskTypes}
                                tasks={initialTask ? [initialTask] : undefined}
                                currentIndex={0}
                                onTaskAdded={(newTask) => {
                                    if (onNewTask) {
                                        onNewTask(newTask);
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                onClick={() => {
                                    if (!taskType) return;
                                    onPreview(createTaskFromForm());
                                }}
                                className="flex items-center gap-2"
                                disabled={!taskType}
                            >
                                Visualizar
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 