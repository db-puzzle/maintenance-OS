import { Button } from '@/components/ui/button';
import { Task } from '@/types/task';
import { FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';

interface FileUploadTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function FileUploadTaskContent({ task, mode, onUpdate }: FileUploadTaskContentProps) {
    const [fileUploaded, setFileUploaded] = useState(false);
    const [fileName, setFileName] = useState('');

    const instructions = task.fileUploadInstructions || 'Faça o upload de um arquivo conforme as instruções.';

    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-4">
                    <p>Esta tarefa solicita que o usuário faça o upload de um arquivo.</p>

                    {task.fileUploadInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções:</p>
                            <p className="text-muted-foreground">{task.fileUploadInstructions}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'preview') {
        return (
            <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-4">
                    <p>O usuário deverá fazer o upload de um arquivo durante a execução desta tarefa.</p>

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

    // Modo 'respond'
    return (
        <div className="space-y-4">
            <div className="bg-muted/30 rounded-md p-4">
                <p>{instructions}</p>
            </div>

            {fileUploaded ? (
                <div className="bg-muted/30 rounded-md p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="text-primary h-5 w-5" />
                            <span className="font-medium">{fileName}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFileUploaded(false);
                                setFileName('');
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        className="px-8"
                        onClick={() => {
                            setFileUploaded(true);
                            setFileName('documento_exemplo.pdf');
                        }}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar arquivo
                    </Button>
                </div>
            )}
        </div>
    );
}
