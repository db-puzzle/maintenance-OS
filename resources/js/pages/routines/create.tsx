import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import { useState } from 'react';
import { Camera, FileText, List, MessageSquare, PlusCircle, Save, X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Rotinas',
        href: '/routines/index',
    },
    {
        title: 'Nova Rotina',
        href: '/routines/create',
    },
];

interface RoutineForm {
    [key: string]: string | undefined;
    name: string;
    maintenance_plan_id: string;
    trigger_hours: string;
}

interface Task {
    id?: number;
    type: 'question' | 'multiple_choice' | 'measurement' | 'photo';
    description: string;
    options?: string[];
    measurementPoints?: {
        name: string;
        min: number;
        target: number;
        max: number;
        unit: string;
    }[];
    photoInstructions?: string;
    instructionImages: string[];
    required: boolean;
}

interface Props {
    maintenancePlans: {
        id: number;
        name: string;
    }[];
}

export default function CreateRoutine({ maintenancePlans }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm<RoutineForm>({
        name: '',
        maintenance_plan_id: '',
        trigger_hours: '',
    });

    const [showTaskEditor, setShowTaskEditor] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskType, setTaskType] = useState<Task['type']>('question');
    const [taskOptions, setTaskOptions] = useState(['Sim', 'Não']);
    const [measurementPoints, setMeasurementPoints] = useState([
        { name: 'Ponto A', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto B', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto C', min: 0, target: 0, max: 0, unit: 'mm' }
    ]);
    const [photoInstructions, setPhotoInstructions] = useState('');
    const [instructionImages, setInstructionImages] = useState<string[]>([]);
    const [isRequired, setIsRequired] = useState(true);
    const [taskDescription, setTaskDescription] = useState('');

    const handleSave = () => {
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

    const handleNewTask = () => {
        setTaskType('question');
        setTaskOptions(['Sim', 'Não']);
        setMeasurementPoints([
            { name: 'Ponto A', min: 0, target: 0, max: 0, unit: 'mm' },
            { name: 'Ponto B', min: 0, target: 0, max: 0, unit: 'mm' },
            { name: 'Ponto C', min: 0, target: 0, max: 0, unit: 'mm' }
        ]);
        setPhotoInstructions('');
        setInstructionImages([]);
        setIsRequired(true);
        setTaskDescription('');
        setShowTaskEditor(true);
    };

    const handleSaveTask = () => {
        const newTask: Task = {
            type: taskType,
            description: taskDescription,
            instructionImages,
            required: isRequired,
        };

        if (taskType === 'multiple_choice') {
            newTask.options = taskOptions;
        } else if (taskType === 'measurement') {
            newTask.measurementPoints = measurementPoints;
        } else if (taskType === 'photo') {
            newTask.photoInstructions = photoInstructions;
        }

        setTasks([...tasks, newTask]);
        setShowTaskEditor(false);
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
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="flex items-center gap-1">
                                Nome da Rotina
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Nome da rotina"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <ItemSelect
                                label="Plano de Manutenção"
                                items={maintenancePlans}
                                value={data.maintenance_plan_id}
                                onValueChange={(value) => setData('maintenance_plan_id', value)}
                                createRoute={route('routines.index')}
                                placeholder="Selecione um plano de manutenção"
                                error={errors.maintenance_plan_id}
                                required
                                canCreate={false}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Tarefas da Rotina</h3>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleNewTask}
                                className="flex items-center gap-2"
                            >
                                <PlusCircle size={16} />
                                Nova Tarefa
                            </Button>
                        </div>

                        {showTaskEditor && (
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <div className="flex justify-between mb-3">
                                    <h3 className="font-medium">Nova Tarefa</h3>
                                    <button onClick={() => setShowTaskEditor(false)}>
                                        <X size={18} className="text-gray-500 hover:text-gray-700" />
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    <div>
                                        <Label htmlFor="taskDescription">Descrição</Label>
                                        <Input
                                            id="taskDescription"
                                            value={taskDescription}
                                            onChange={(e) => setTaskDescription(e.target.value)}
                                            placeholder="Descrição da tarefa..."
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="taskType">Tipo</Label>
                                        <select
                                            id="taskType"
                                            className="w-full border rounded-md px-3 py-2"
                                            value={taskType}
                                            onChange={(e) => setTaskType(e.target.value as Task['type'])}
                                        >
                                            <option value="question">Registro (pergunta e resposta em texto)</option>
                                            <option value="multiple_choice">Múltipla escolha</option>
                                            <option value="measurement">Medições</option>
                                            <option value="photo">Registro fotográfico</option>
                                        </select>
                                    </div>

                                    {taskType === 'multiple_choice' && (
                                        <div>
                                            <Label>Opções</Label>
                                            <div className="space-y-2">
                                                {taskOptions.map((option, index) => (
                                                    <div key={index} className="flex gap-2">
                                                        <Input
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...taskOptions];
                                                                newOptions[index] = e.target.value;
                                                                setTaskOptions(newOptions);
                                                            }}
                                                            placeholder={`Opção ${index + 1}`}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                const newOptions = taskOptions.filter((_, i) => i !== index);
                                                                setTaskOptions(newOptions);
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setTaskOptions([...taskOptions, ''])}
                                                    className="flex items-center gap-2"
                                                >
                                                    <PlusCircle size={16} />
                                                    Adicionar opção
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {taskType === 'measurement' && (
                                        <div>
                                            <Label>Pontos de Medição</Label>
                                            <div className="space-y-4">
                                                {measurementPoints.map((point, index) => (
                                                    <div key={index} className="border rounded-md p-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <Input
                                                                value={point.name}
                                                                onChange={(e) => {
                                                                    const newPoints = [...measurementPoints];
                                                                    newPoints[index] = { ...newPoints[index], name: e.target.value };
                                                                    setMeasurementPoints(newPoints);
                                                                }}
                                                                placeholder={`Ponto ${index + 1}`}
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
                                                                <X size={16} />
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
                                                                    <select
                                                                        value={point.unit}
                                                                        onChange={(e) => {
                                                                            const newPoints = [...measurementPoints];
                                                                            newPoints[index] = { ...newPoints[index], unit: e.target.value };
                                                                            setMeasurementPoints(newPoints);
                                                                        }}
                                                                        className="border-l-0 rounded-l-none"
                                                                    >
                                                                        <option>mm</option>
                                                                        <option>cm</option>
                                                                        <option>m</option>
                                                                        <option>°C</option>
                                                                        <option>bar</option>
                                                                    </select>
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
                                                                    <select
                                                                        value={point.unit}
                                                                        disabled
                                                                        className="border-l-0 rounded-l-none"
                                                                    >
                                                                        <option>{point.unit}</option>
                                                                    </select>
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
                                                                    <select
                                                                        value={point.unit}
                                                                        disabled
                                                                        className="border-l-0 rounded-l-none"
                                                                    >
                                                                        <option>{point.unit}</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setMeasurementPoints([...measurementPoints, { name: `Ponto ${measurementPoints.length + 1}`, min: 0, target: 0, max: 0, unit: 'mm' }])}
                                                    className="flex items-center gap-2"
                                                >
                                                    <PlusCircle size={16} />
                                                    Adicionar ponto de medição
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {taskType === 'photo' && (
                                        <div>
                                            <Label>Instruções para Foto</Label>
                                            <Input
                                                value={photoInstructions}
                                                onChange={(e) => setPhotoInstructions(e.target.value)}
                                                placeholder="Instruções específicas para a foto a ser tirada..."
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="required"
                                            checked={isRequired}
                                            onChange={(e) => setIsRequired(e.target.checked)}
                                        />
                                        <Label htmlFor="required">Tarefa obrigatória</Label>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowTaskEditor(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleSaveTask}
                                            className="flex items-center gap-2"
                                        >
                                            <Save size={16} />
                                            Salvar Tarefa
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task, index) => (
                                <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                {getTaskTypeIcon(task.type)}
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-sm font-medium">{task.description}</h3>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {task.type === 'question' && 'Pergunta e resposta em texto'}
                                                    {task.type === 'multiple_choice' && 'Múltipla escolha'}
                                                    {task.type === 'measurement' && 'Medições a serem tomadas'}
                                                    {task.type === 'photo' && 'Registro fotográfico'}
                                                </p>
                                            </div>
                                        </div>

                                        {task.type === 'multiple_choice' && task.options && (
                                            <div className="mt-3 text-xs">
                                                <p className="font-medium mb-1">Opções:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {task.options.map((option, idx) => (
                                                        <span key={idx} className="bg-gray-100 px-2 py-1 rounded">{option}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {task.type === 'measurement' && task.measurementPoints && (
                                            <div className="mt-3 text-xs">
                                                <p className="font-medium mb-1">Pontos de medição:</p>
                                                <div className="space-y-2">
                                                    {task.measurementPoints.map((point, idx) => (
                                                        <div key={idx} className="bg-gray-100 p-2 rounded">
                                                            <div className="font-medium">{point.name}</div>
                                                            <div className="grid grid-cols-3 gap-2 mt-1 text-gray-600">
                                                                <div>Min: {point.min}{point.unit}</div>
                                                                <div>Target: {point.target}{point.unit}</div>
                                                                <div>Max: {point.max}{point.unit}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {task.type === 'photo' && task.photoInstructions && (
                                            <div className="mt-3 text-xs">
                                                <p className="font-medium mb-1">Instruções:</p>
                                                <p className="text-gray-600">{task.photoInstructions}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                                        <span className={`text-xs ${task.required ? 'text-red-500' : 'text-gray-500'}`}>
                                            {task.required ? 'Obrigatório' : 'Opcional'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 