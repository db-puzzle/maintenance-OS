import PhotoUploader from '@/components/PhotoUploader';
import { Task } from '@/types/task';
import { Image } from 'lucide-react';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';

interface PhotoTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function PhotoTaskContent({ task, mode, onUpdate }: PhotoTaskContentProps) {
    const [photo, setPhoto] = useState<File | null>(null);
    const isPreview = mode === 'preview';

    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="p-4">
                    <p>"O usuário deverá tirar uma ou mais fotos durante a execução desta tarefa."</p>
                </div>
            </div>
        );
    }

    // Handler para quando uma foto é selecionada ou capturada
    const handlePhotoChange = (file: File | null) => {
        setPhoto(file);

        // Se tiver a função onUpdate, atualiza a tarefa
        if (onUpdate && file) {
            // Aqui você pode adicionar a lógica para atualizar a tarefa com a foto
            const updatedTask = {
                ...task,
                // Propriedades para armazenar a foto, se necessário
                // photo: file,
                // Ou talvez apenas marcar como feita
                completed: true,
            };
            onUpdate(updatedTask);
        }
    };

    return (
        <div className="space-y-4">
            <div className="p-4">
                <p>
                    {isPreview ? 'O usuário deverá tirar uma ou mais fotos durante a execução desta tarefa.' : 'Tire uma foto conforme necessário.'}
                </p>
            </div>

            {isPreview ? (
                // No modo preview, mostramos apenas um placeholder simples
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-muted/50 flex h-64 w-full items-center justify-center rounded-md">
                        <div className="flex flex-col items-center justify-center">
                            <Image className="text-muted-foreground mb-2 h-16 w-16" />
                            <p className="text-muted-foreground">Prévia da câmera</p>
                        </div>
                    </div>
                </div>
            ) : (
                // No modo respond, usamos o PhotoUploader
                <PhotoUploader
                    label=""
                    value={photo}
                    onChange={handlePhotoChange}
                    minHeight="min-h-[200px]"
                    maxHeight="max-h-[200px]"
                    id={`photo-task-${task.id}`}
                />
            )}
        </div>
    );
}
