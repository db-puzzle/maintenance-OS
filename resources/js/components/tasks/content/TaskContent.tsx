import { ReactNode } from 'react';
import { Task, TaskType, TaskState } from '@/types/task';
import QuestionTaskContent from './QuestionTaskContent';
import MultipleChoiceTaskContent from './MultipleChoiceTaskContent';
import MeasurementTaskContent from './MeasurementTaskContent';
import PhotoTaskContent from './PhotoTaskContent';
import CodeReaderTaskContent from './CodeReaderTaskContent';
import FileUploadTaskContent from './FileUploadTaskContent';

export type TaskCardMode = 'edit' | 'preview' | 'respond';

interface TaskContentProps {
    /** A tarefa a ser exibida */
    task: Task;
    /** Modo de exibição do conteúdo */
    mode: TaskCardMode;
    /** Callback para atualizar a tarefa */
    onUpdate?: (updatedTask: Task) => void;
}

export default function TaskContent({ task, mode, onUpdate }: TaskContentProps) {
    // Verifica se a tarefa existe
    if (!task) {
        return <div className="p-4 text-muted-foreground">Tarefa não encontrada</div>;
    }

    // Seleciona o componente com base no tipo de tarefa
    switch (task.type) {
        case 'question':
            return <QuestionTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        case 'multiple_choice':
        case 'multiple_select':
            return <MultipleChoiceTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        case 'measurement':
            return <MeasurementTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        case 'photo':
            return <PhotoTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        case 'code_reader':
            return <CodeReaderTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        case 'file_upload':
            return <FileUploadTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        default:
            return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">
                        Tipo de tarefa não implementado: {task.type}
                    </p>
                </div>
            );
    }
} 