import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Save, X, GripVertical, Lightbulb, Plus, Clock, FileText, ListChecks, Ruler, Camera, CheckSquare, ClipboardCheck, QrCode, Barcode, Upload, ScanBarcode } from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TextInput from '@/components/TextInput';
import { useForm } from '@inertiajs/react';
import { Task } from '@/types/task';
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

interface TaskEditorCardProps {
    initialTask?: Task;
    onSave: (task: Task) => void;
    onPreview: (task: Task) => void;
    onCancel: () => void;
    onNewTask: () => void;
}

const taskTypes = [
    { 
        id: 1, 
        name: 'Registro (pergunta e resposta em texto)', 
        icon: FileText,
        label: 'Pergunta',
        placeholder: 'Digite a pergunta que será respondida...'
    },
    { 
        id: 2, 
        name: 'Múltipla escolha', 
        icon: CheckSquare,
        label: 'Pergunta de Múltipla Escolha',
        placeholder: 'Digite a pergunta para escolha da resposta...'
    },
    { 
        id: 3, 
        name: 'Múltipla seleção', 
        icon: ListChecks,
        label: 'Pergunta de Múltipla Seleção',
        placeholder: 'Digite a pergunta para seleção das respostas...'
    },
    { 
        id: 4, 
        name: 'Medições', 
        icon: Ruler,
        label: 'Nome da Medição',
        placeholder: 'Diâmetro do Eixo, Pressão do Ar, Temperatura do Motor, etc...'
    },
    { 
        id: 5, 
        name: 'Registro fotográfico', 
        icon: Camera,
        label: 'Nome da Foto',
        placeholder: 'Vista Geral do Equipamento, Condição da Bucha, etc...'
    },
    { 
        id: 6, 
        name: 'Leitor de Código', 
        icon: ScanBarcode,
        label: 'Nome do Código',
        placeholder: 'Número Serial, Código do Produto, Número do Lote, etc...'
    },
    { 
        id: 7, 
        name: 'Upload de Arquivo', 
        icon: Upload,
        label: 'Nome do Arquivo',
        placeholder: 'Relatório de Inspeção, Ficha Técnica, Manual de Instruções, etc...'
    }
];

const codeReaderTypes = [
    { 
        id: 1,
        value: 'qr_code' as const,
        name: 'QR Code',
        icon: QrCode
    },
    { 
        id: 2,
        value: 'barcode' as const,
        name: 'Código de Barras',
        icon: Barcode
    }
];

const taskTypeMapping: Record<number, Task['type']> = {
    1: 'question',
    2: 'multiple_choice',
    3: 'multiple_select',
    4: 'measurement',
    5: 'photo',
    6: 'code_reader',
    7: 'file_upload'
} as const;

interface TaskForm {
    description: string;
    photoInstructions: string;
    codeReaderType: 'qr_code' | 'barcode' | undefined;
    codeReaderInstructions: string;
    fileUploadInstructions: string;
    options: { [key: number]: string };
    [key: string]: string | number | boolean | File | null | { [key: number]: string } | undefined;
}

export default function TaskEditorCard({ initialTask, onSave, onPreview, onCancel, onNewTask }: TaskEditorCardProps) {
    const { data, setData, errors, clearErrors } = useForm<TaskForm>({
        description: '',
        photoInstructions: '',
        codeReaderType: undefined,
        codeReaderInstructions: '',
        fileUploadInstructions: '',
        options: {}
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

    const [taskType, setTaskType] = useState<Task['type'] | null>(null);
    const [measurementPoints, setMeasurementPoints] = useState([
        { name: 'Ponto A', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto B', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto C', min: 0, target: 0, max: 0, unit: 'mm' }
    ]);
    const [isRequired, setIsRequired] = useState(true);

    useEffect(() => {
        if (initialTask) {
            setData({
                description: initialTask.description || '',
                photoInstructions: initialTask.photoInstructions || '',
                codeReaderType: initialTask.codeReaderType,
                codeReaderInstructions: initialTask.codeReaderInstructions || '',
                fileUploadInstructions: initialTask.fileUploadInstructions || '',
                options: initialTask.options?.reduce((acc, option, index) => ({
                    ...acc,
                    [index + 1]: option
                }), {}) || {}
            });
            setTaskType(initialTask.type);
            setMeasurementPoints(
                initialTask.measurementPoints || [
                    { name: 'Ponto A', min: 0, target: 0, max: 0, unit: 'mm' },
                    { name: 'Ponto B', min: 0, target: 0, max: 0, unit: 'mm' },
                    { name: 'Ponto C', min: 0, target: 0, max: 0, unit: 'mm' }
                ]
            );
            setIsRequired(initialTask.required);
        }
    }, [initialTask]);

    const isChoiceBasedTask = taskType === 'multiple_choice' || taskType === 'multiple_select';
    
    const taskLabels = taskType 
        ? taskTypes.find(t => taskTypeMapping[t.id] === taskType) 
        : { label: '', placeholder: 'Selecione um tipo de tarefa primeiro...' };

    const addOption = () => {
        const newOptions = { ...data.options };
        const newIndex = Object.keys(newOptions).length + 1;
        newOptions[newIndex] = '';
        setData('options', newOptions);
    };

    const removeOption = (indexToRemove: number) => {
        const entries = Object.entries(data.options)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([key, value]) => ({
                index: Number(key),
                value: value || ''
            }));
        
        const reindexedOptions = entries
            .filter(entry => entry.index !== indexToRemove)
            .reduce((acc, entry, idx) => {
                const newIndex = idx + 1;
                return {
                    ...acc,
                    [newIndex]: entry.value
                };
            }, {});
        
        setData('options', reindexedOptions);
    };

    const handleSaveTask = () => {
        if (!taskType) {
            return;
        }

        const newTask: Task = {
            type: taskType,
            description: data.description,
            instructionImages: initialTask?.instructionImages || [],
            required: isRequired,
        };

        if (isChoiceBasedTask) {
            newTask.options = Object.values(data.options);
        } else if (taskType === 'measurement') {
            newTask.measurementPoints = measurementPoints;
        } else if (taskType === 'photo') {
            newTask.photoInstructions = data.photoInstructions;
        } else if (taskType === 'code_reader') {
            if (data.codeReaderType) {
                newTask.codeReaderType = data.codeReaderType;
                newTask.codeReaderInstructions = data.codeReaderInstructions;
            }
        } else if (taskType === 'file_upload') {
            newTask.fileUploadInstructions = data.fileUploadInstructions;
        }

        onSave(newTask);
    };

    return (
        <Card 
            ref={setNodeRef}
            style={style}
            className={`bg-muted/90 ${isDragging ? 'shadow-lg' : ''}`}
        >
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:cursor-grabbing touch-none"
                        >
                            <GripVertical className="h-4 w-4 text-gray-500" />
                        </button>
                        <Label className="text-lg font-semibold">Editar Tarefa</Label>
                    </div>
                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <Lightbulb className="h-6 w-6 text-muted-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-120" align="end">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Dicas úteis:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Arraste o ícone <GripVertical className="h-3 w-3 inline-block text-muted-foreground" /> para reordenar as tarefas</li>
                                </ul>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="w-90">
                        <ItemSelect
                            label="Tipo de Tarefa"
                            items={taskTypes}
                            value={taskType ? (Object.entries(taskTypeMapping).find(([_, type]) => type === taskType)?.[0] ?? '') : ''}
                            onValueChange={(value) => {
                                if (value && value !== '') {
                                    setTaskType(taskTypeMapping[Number(value) as keyof typeof taskTypeMapping]);
                                } else {
                                    setTaskType(null);
                                }
                            }}
                            placeholder="Selecione o tipo de tarefa"
                            required
                            canCreate={false}
                            createRoute=""
                        />
                    </div>
                    <div className="flex items-center space-x-2 mt-6">
                        <Switch
                            id="required"
                            checked={isRequired}
                            onCheckedChange={setIsRequired}
                        />
                        <Label htmlFor="required">Tarefa obrigatória</Label>
                    </div>
                </div>

                {taskType === 'code_reader' && (
                    <div className="w-90">
                        <ItemSelect
                            items={codeReaderTypes}
                            label="Tipo de Código"
                            value={data.codeReaderType ? String(codeReaderTypes.find(t => t.value === data.codeReaderType)?.id || '') : ''}
                            onValueChange={(value) => {
                                const selectedType = codeReaderTypes.find(t => t.id === Number(value));
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
                            placeholder={taskLabels?.placeholder || ''}
                            required
                        />
                    </div>
                ) : (
                    <Card className="bg-background shadow-none">
                        <CardContent className="px-4 py-4 flex items-start space-x-4">
                            <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
                                <ClipboardCheck className="size-6 text-foreground/60" />
                            </div>
                            <div className="flex flex-col py-1">
                                <h3 className="text-md font-medium">Configure sua tarefa</h3>
                                <p className="text-sm text-muted-foreground">
                                    Selecione um tipo de tarefa acima para começar a configuração.
                                </p>
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
                                    onClick={addOption}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Opção
                                </Button>
                            </div>
                            {Object.entries(data.options).length === 0 ? (
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
                                    {Object.entries(data.options).map(([indexStr, value]) => {
                                        const index = Number(indexStr);
                                        return (
                                            <Card key={index} className="bg-background shadow-none">
                                                <CardContent className="flex items-center space-x-2">
                                                    <div className="flex-1">
                                                        <TextInput<TaskForm>
                                                            form={{
                                                                data: {
                                                                    ...data,
                                                                    [`option-${index}`]: data.options[index] || ''
                                                                },
                                                                setData: (field, value) => {
                                                                    if (field === `option-${index}`) {
                                                                        const newOptions = { ...data.options };
                                                                        newOptions[index] = value;
                                                                        setData('options', newOptions);
                                                                    }
                                                                },
                                                                errors,
                                                                clearErrors
                                                            }}
                                                            name={`option-${index}`}
                                                            label={`Opção ${index}`}
                                                            placeholder={`Descreva a opção ${index}`}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="h-6 w-6 mt-6"
                                                        onClick={() => removeOption(index)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {taskType === 'measurement' && (
                    <div>
                        <Label>Pontos de Medição</Label>
                        <div className="space-y-4">
                            {measurementPoints.map((point, index) => (
                                <Card key={index} className="bg-background">
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <Input
                                                value={point.name}
                                                onChange={(e) => {
                                                    const newPoints = [...measurementPoints];
                                                    newPoints[index] = { ...newPoints[index], name: e.target.value };
                                                    setMeasurementPoints(newPoints);
                                                }}
                                                placeholder={`Ponto ${index + 1}`}
                                                className="w-1/3"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    const newPoints = measurementPoints.filter((_, i) => i !== index);
                                                    setMeasurementPoints(newPoints);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label>Mínimo</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={point.min}
                                                        onChange={(e) => {
                                                            const newPoints = [...measurementPoints];
                                                            newPoints[index] = { ...newPoints[index], min: parseFloat(e.target.value) };
                                                            setMeasurementPoints(newPoints);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Target</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={point.target}
                                                        onChange={(e) => {
                                                            const newPoints = [...measurementPoints];
                                                            newPoints[index] = { ...newPoints[index], target: parseFloat(e.target.value) };
                                                            setMeasurementPoints(newPoints);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Máximo</Label>
                                                <div className="flex">
                                                    <Input
                                                        type="number"
                                                        value={point.max}
                                                        onChange={(e) => {
                                                            const newPoints = [...measurementPoints];
                                                            newPoints[index] = { ...newPoints[index], max: parseFloat(e.target.value) };
                                                            setMeasurementPoints(newPoints);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <Label>Unidade</Label>
                                            <Select
                                                value={point.unit}
                                                onValueChange={(value) => {
                                                    const newPoints = [...measurementPoints];
                                                    newPoints[index] = { ...newPoints[index], unit: value };
                                                    setMeasurementPoints(newPoints);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mm">mm</SelectItem>
                                                    <SelectItem value="cm">cm</SelectItem>
                                                    <SelectItem value="m">m</SelectItem>
                                                    <SelectItem value="°C">°C</SelectItem>
                                                    <SelectItem value="bar">bar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMeasurementPoints([...measurementPoints, { name: `Ponto ${measurementPoints.length + 1}`, min: 0, target: 0, max: 0, unit: 'mm' }])}
                                className="flex items-center gap-2"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Adicionar ponto de medição
                            </Button>
                        </div>
                    </div>
                )}

                {taskType === 'photo' && (
                    <div>
                        <TextInput<TaskForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors
                            }}
                            name="photoInstructions"
                            label="Instruções para Foto"
                            placeholder="Como a foto deve ser tirada..."
                        />
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
                                <AlertDialogAction onClick={onCancel}>
                                    Sim, excluir tarefa
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onNewTask}
                            className="flex items-center gap-2"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Nova Tarefa Abaixo
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!taskType) return;
                                
                                const newTask: Task = {
                                    type: taskType,
                                    description: data.description,
                                    instructionImages: initialTask?.instructionImages || [],
                                    required: isRequired,
                                };

                                if (isChoiceBasedTask) {
                                    newTask.options = Object.values(data.options);
                                } else if (taskType === 'measurement') {
                                    newTask.measurementPoints = measurementPoints;
                                } else if (taskType === 'photo') {
                                    newTask.photoInstructions = data.photoInstructions;
                                } else if (taskType === 'code_reader') {
                                    if (data.codeReaderType) {
                                        newTask.codeReaderType = data.codeReaderType;
                                        newTask.codeReaderInstructions = data.codeReaderInstructions;
                                    }
                                } else if (taskType === 'file_upload') {
                                    newTask.fileUploadInstructions = data.fileUploadInstructions;
                                }

                                onPreview(newTask);
                            }}
                            className="flex items-center gap-2"
                            disabled={!taskType}
                        >
                            Visualizar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 