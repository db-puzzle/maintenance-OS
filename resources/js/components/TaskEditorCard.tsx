import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, X } from 'lucide-react';

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

interface TaskEditorCardProps {
    onSave: (task: Task) => void;
    onCancel: () => void;
}

export default function TaskEditorCard({ onSave, onCancel }: TaskEditorCardProps) {
    const [taskType, setTaskType] = useState<Task['type']>('question');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskOptions, setTaskOptions] = useState(['Sim', 'Não']);
    const [measurementPoints, setMeasurementPoints] = useState([
        { name: 'Ponto A', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto B', min: 0, target: 0, max: 0, unit: 'mm' },
        { name: 'Ponto C', min: 0, target: 0, max: 0, unit: 'mm' }
    ]);
    const [photoInstructions, setPhotoInstructions] = useState('');
    const [isRequired, setIsRequired] = useState(true);

    const handleSaveTask = () => {
        const newTask: Task = {
            type: taskType,
            description: taskDescription,
            instructionImages: [],
            required: isRequired,
        };

        if (taskType === 'multiple_choice') {
            newTask.options = taskOptions;
        } else if (taskType === 'measurement') {
            newTask.measurementPoints = measurementPoints;
        } else if (taskType === 'photo') {
            newTask.photoInstructions = photoInstructions;
        }

        onSave(newTask);
    };

    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Nova Tarefa</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="taskType">Tipo</Label>
                    <Select
                        value={taskType}
                        onValueChange={(value) => setTaskType(value as Task['type'])}
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
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTaskOptions([...taskOptions, ''])}
                                className="flex items-center gap-2"
                            >
                                <PlusCircle className="h-4 w-4" />
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
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSaveTask}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Salvar Tarefa
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 