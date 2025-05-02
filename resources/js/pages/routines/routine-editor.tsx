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
import { useState } from 'react';
import { Camera, FileText, List, MessageSquare, PlusCircle, Save, X } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/TaskCard';
import TaskEditorCard from '@/components/TaskEditorCard';

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
    [key: string]: string | undefined;
    name: string;
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
}

export default function CreateRoutine({ }: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<RoutineForm>({
        name: '',
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
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <TextInput<RoutineForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="name"
                                label="Nome da Rotina"
                                placeholder="Nome da rotina"
                                required
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

                        {showTaskEditor ? (
                            <TaskEditorCard
                                onSave={(newTask) => {
                                    setTasks([...tasks, newTask]);
                                    setShowTaskEditor(false);
                                }}
                                onCancel={() => setShowTaskEditor(false)}
                            />
                        ) : (
                            <div className="grid gap-4">
                                {tasks.map((task, index) => (
                                    <TaskCard
                                        key={index}
                                        task={task}
                                        index={index}
                                        onTypeChange={(type) => {
                                            const newTasks = [...tasks];
                                            newTasks[index].type = type;
                                            setTasks(newTasks);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 