import { Task } from '@/types/task';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Image } from 'lucide-react';

interface PhotoTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function PhotoTaskContent({ task, mode, onUpdate }: PhotoTaskContentProps) {
    const [photoTaken, setPhotoTaken] = useState(false);
    
    const instructions = task.photoInstructions || 'Tire uma foto conforme as instruções.';
    
    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-md">
                    <p>Esta tarefa solicita que o usuário tire uma foto.</p>
                    
                    {task.photoInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções:</p>
                            <p className="text-muted-foreground">{task.photoInstructions}</p>
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
                    <p>O usuário deverá tirar uma foto durante a execução desta tarefa.</p>
                    
                    {task.photoInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções para o usuário:</p>
                            <p className="text-muted-foreground">{task.photoInstructions}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Modo 'respond'
    return (
        <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-md">
                <p>{instructions}</p>
            </div>
            
            {photoTaken ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-64 bg-muted/50 rounded-md flex items-center justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Image className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground z-10">Foto capturada</p>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setPhotoTaken(false)}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Tirar nova foto
                    </Button>
                </div>
            ) : (
                <div className="flex gap-4">
                    <Button 
                        className="flex-1" 
                        onClick={() => setPhotoTaken(true)}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Tirar foto
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setPhotoTaken(true)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar foto
                    </Button>
                </div>
            )}
        </div>
    );
} 