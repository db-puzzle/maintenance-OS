import PhotoUploader from '@/components/PhotoUploader';
import { Image } from 'lucide-react';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';

interface PhotoTaskContentProps extends WithSaveFunctionalityProps {}

function PhotoTaskContent({ task, mode, response, setResponse, disabled }: PhotoTaskContentProps) {
    const handlePhotoChange = (file: File | null) => {
        setResponse({ files: file ? [file] : [] });
    };

    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="p-4">
                    <p>"O usuário deverá tirar uma ou mais fotos durante a execução desta tarefa."</p>
                </div>
            </div>
        );
    }

    const isPreview = mode === 'preview';

    return (
        <div className="space-y-4">
            <div className="p-4">
                <p>
                    {isPreview ? 'O usuário deverá tirar uma ou mais fotos durante a execução desta tarefa.' : 'Tire uma foto conforme necessário.'}
                </p>
            </div>

            {isPreview ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-muted/50 flex h-64 w-full items-center justify-center rounded-md">
                        <div className="flex flex-col items-center justify-center">
                            <Image className="text-muted-foreground mb-2 h-16 w-16" />
                            <p className="text-muted-foreground">Prévia da câmera</p>
                        </div>
                    </div>
                </div>
            ) : (
                <PhotoUploader
                    label=""
                    value={response?.files?.[0] || null}
                    onChange={handlePhotoChange}
                    minHeight="min-h-[200px]"
                    maxHeight="max-h-[200px]"
                    id={`photo-task-${task.id}`}
                    disabled={disabled}
                />
            )}
        </div>
    );
}

export default withSaveFunctionality(PhotoTaskContent);
