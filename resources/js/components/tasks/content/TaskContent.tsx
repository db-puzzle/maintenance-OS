import { Task } from '@/types/task';
import { memo } from 'react';
import CodeReaderTaskContent from './CodeReaderTaskContent';
import FileUploadTaskContent from './FileUploadTaskContent';
import MeasurementTaskContent from './MeasurementTaskContent';
import MultipleChoiceTaskContent from './MultipleChoiceTaskContent';
import PhotoTaskContent from './PhotoTaskContent';
import QuestionTaskContent from './QuestionTaskContent';

export type TaskCardMode = 'edit' | 'preview' | 'respond';

interface TaskContentProps {
    /** A tarefa a ser exibida */
    task: Task;
    /** Modo de exibição do conteúdo */
    mode: TaskCardMode;
    /** Callback para atualizar a tarefa */
    onUpdate?: (updatedTask: Task) => void;
    /** Callback para alterar o ícone do card */
    onIconChange?: (icon: React.ReactNode) => void;
}

function TaskContent({ task, mode, onUpdate, onIconChange }: TaskContentProps) {
    // Verifica se a tarefa existe
    if (!task) {
        return <div className="text-muted-foreground p-4">Tarefa não encontrada</div>;
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
            return <CodeReaderTaskContent task={task} mode={mode} onUpdate={onUpdate} onIconChange={onIconChange} />;
        case 'file_upload':
            return <FileUploadTaskContent task={task} mode={mode} onUpdate={onUpdate} />;
        default:
            return (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-yellow-700">Tipo de tarefa não implementado: {task.type}</p>
                </div>
            );
    }
}

export default memo(TaskContent);
