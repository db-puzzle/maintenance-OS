import { Task, Measurement } from '@/types/task';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MeasurementTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function MeasurementTaskContent({ task, mode, onUpdate }: MeasurementTaskContentProps) {
    const [measurements, setMeasurements] = useState<{[pointId: string]: number}>(
        (task.measurementPoints || []).reduce((acc, point, idx) => {
            acc[idx.toString()] = 0;
            return acc;
        }, {} as {[pointId: string]: number})
    );
    
    const points = task.measurementPoints || [];
    
    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-md">
                    <p>Tarefa de medição com {points.length} pontos. O usuário deverá inserir valores numéricos para cada ponto.</p>
                    
                    {points.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="font-medium">Pontos de medição:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                {points.map((point, index) => (
                                    <li key={index}>
                                        <span className="font-medium">{point.name}</span>
                                        <div className="text-sm text-muted-foreground">
                                            <span>Mín: {point.min}, </span>
                                            <span>Alvo: {point.target}, </span>
                                            <span>Máx: {point.max}, </span>
                                            <span>Unidade: {point.unit}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (mode === 'preview') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-md">
                    <p>O usuário deverá inserir medições para {points.length} pontos.</p>
                    
                    {points.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="font-medium">Pontos a serem medidos:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                {points.map((point, index) => (
                                    <li key={index}>
                                        <span className="font-medium">{point.name}</span>
                                        <div className="text-sm text-muted-foreground">
                                            <span>Faixa esperada: {point.min} - {point.max} {point.unit}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Modo 'respond'
    return (
        <div className="space-y-4">
            {points.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">Nenhum ponto de medição definido.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {points.map((point, index) => {
                        const pointId = index.toString();
                        const value = measurements[pointId] || 0;
                        const isOutOfRange = value < point.min || value > point.max;
                        
                        return (
                            <div key={index} className="space-y-2">
                                <Label 
                                    htmlFor={`measurement-${index}`} 
                                    className="flex justify-between"
                                >
                                    <span>{point.name}</span>
                                    <span className="text-muted-foreground text-sm">
                                        ({point.min} - {point.max} {point.unit})
                                    </span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id={`measurement-${index}`}
                                        type="number"
                                        value={value || ''}
                                        onChange={(e) => {
                                            const newValue = parseFloat(e.target.value);
                                            setMeasurements({
                                                ...measurements,
                                                [pointId]: isNaN(newValue) ? 0 : newValue
                                            });
                                        }}
                                        className={isOutOfRange ? "border-red-500" : ""}
                                    />
                                    <span>{point.unit}</span>
                                </div>
                                {isOutOfRange && (
                                    <p className="text-red-500 text-sm">
                                        O valor está fora da faixa recomendada.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 