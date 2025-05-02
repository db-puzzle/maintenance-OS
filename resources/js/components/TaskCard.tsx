import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, FileText, List, MessageSquare } from 'lucide-react';

interface Break {
    start_time: string;
    end_time: string;
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

interface TaskCardProps {
    task: Task;
    index: number;
    onTypeChange: (type: Task['type']) => void;
}

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

export default function TaskCard({ task, index, onTypeChange }: TaskCardProps) {
    return (
        <Card className="bg-muted/50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <CardHeader className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-md font-semibold">Tarefa {index + 1}</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Select
                        value={task.type}
                        onValueChange={onTypeChange}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo de tarefa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="question">Registro (pergunta e resposta em texto)</SelectItem>
                            <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                            <SelectItem value="measurement">Medições</SelectItem>
                            <SelectItem value="photo">Registro fotográfico</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                        {getTaskTypeIcon(task.type)}
                    </div>
                    <div className="flex-1">
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
                    <div className="space-y-0.5 pl-4">
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-base font-medium">Opções</Label>
                        </div>
                        <Card className="bg-background shadow-none">
                            <CardContent className="px-2 py-2">
                                <div className="flex flex-wrap gap-1">
                                    {task.options.map((option, idx) => (
                                        <span key={idx} className="bg-muted px-2 py-1 rounded">{option}</span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {task.type === 'measurement' && task.measurementPoints && (
                    <div className="space-y-0.5 pl-4">
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-base font-medium">Pontos de medição</Label>
                        </div>
                        <Card className="bg-background shadow-none">
                            <CardContent className="px-2 py-2">
                                <div className="space-y-2">
                                    {task.measurementPoints.map((point, idx) => (
                                        <div key={idx} className="bg-muted p-2 rounded">
                                            <div className="font-medium">{point.name}</div>
                                            <div className="grid grid-cols-3 gap-2 mt-1 text-gray-600 text-sm">
                                                <div>Min: {point.min}{point.unit}</div>
                                                <div>Target: {point.target}{point.unit}</div>
                                                <div>Max: {point.max}{point.unit}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {task.type === 'photo' && task.photoInstructions && (
                    <div className="space-y-0.5 pl-4">
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-base font-medium">Instruções</Label>
                        </div>
                        <Card className="bg-background shadow-none">
                            <CardContent className="px-2 py-2">
                                <p className="text-sm text-gray-600">{task.photoInstructions}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                <span className={`text-xs ${task.required ? 'text-red-500' : 'text-gray-500'}`}>
                    {task.required ? 'Obrigatório' : 'Opcional'}
                </span>
            </div>
        </Card>
    );
} 