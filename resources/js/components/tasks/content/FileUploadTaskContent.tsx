import { Button } from '@/components/ui/button';
import { Task } from '@/types/task';
import { FileText, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';

interface FileUploadTaskContentProps extends WithSaveFunctionalityProps { }

function FileUploadTaskContent({ task, mode, response, setResponse, disabled }: FileUploadTaskContentProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const instructions = task.fileUploadInstructions || 'Faça o upload de um arquivo conforme as instruções.';

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setResponse({ files: [file] });
        }
    };

    const handleRemoveFile = () => {
        setResponse({ files: [] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    if (mode === 'edit' || mode === 'preview') {
        const message = mode === 'edit'
            ? 'Esta tarefa solicita que o usuário faça o upload de um arquivo.'
            : 'O usuário deverá fazer o upload de um arquivo durante a execução desta tarefa.';

        return (
            <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-4">
                    <p>{message}</p>
                    {task.fileUploadInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções para o usuário:</p>
                            <p className="text-muted-foreground">{task.fileUploadInstructions}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const uploadedFile = response?.files?.[0];

    return (
        <div className="space-y-4">
            <div className="bg-muted/30 rounded-md p-4">
                <p>{instructions}</p>
            </div>

            {uploadedFile ? (
                <div className="bg-muted/30 rounded-md p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="text-primary h-5 w-5 flex-shrink-0" />
                            <span className="font-medium truncate" title={uploadedFile.name}>
                                {uploadedFile.name}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFile}
                            disabled={disabled}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={disabled}
                    />
                    <Button
                        variant="outline"
                        className="px-8"
                        onClick={triggerFileSelect}
                        disabled={disabled}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar arquivo
                    </Button>
                </div>
            )}
        </div>
    );
}

export default withSaveFunctionality(FileUploadTaskContent);
