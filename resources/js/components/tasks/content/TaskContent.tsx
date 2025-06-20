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
    /** Callback para salvar a resposta da tarefa */
    onSave?: (responseData: Record<string, unknown>) => void;
    /** Se deve mostrar o botão de salvar */
    showSaveButton?: boolean;
    /** Se o componente está desabilitado */
    disabled?: boolean;
    /** Se é a última tarefa */
    isLastTask?: boolean;
    /** Callback para navegar para próxima tarefa */
    onNext?: () => void;
}

function TaskContent({ task, mode, onUpdate, onIconChange, onSave, showSaveButton, disabled, isLastTask, onNext }: TaskContentProps) {
    // Verifica se a tarefa existe
    if (!task) {
        return <div className="text-muted-foreground p-4">Tarefa não encontrada</div>;
    }

    const props = { task, mode, onUpdate, onSave, showSaveButton, disabled, isLastTask, onNext };

    // Seleciona o componente com base no tipo de tarefa
    switch (task.type) {
        case 'question':
            return <QuestionTaskContent {...props} />;
        case 'multiple_choice':
        case 'multiple_select':
            return <MultipleChoiceTaskContent {...props} />;
        case 'measurement':
            return <MeasurementTaskContent {...props} />;
        case 'photo':
            return <PhotoTaskContent {...props} />;
        case 'code_reader':
            return <CodeReaderTaskContent {...props} onIconChange={onIconChange} />;
        case 'file_upload':
            return <FileUploadTaskContent {...props} />;
        default:
            return (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-yellow-700">Tipo de tarefa não implementado: {task.type}</p>
                </div>
            );
    }
}

export default memo(TaskContent);
