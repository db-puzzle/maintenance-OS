import TaskDescriptionInput from '@/components/TaskDescriptionInput';
import AddTaskButton from '@/components/tasks/AddTaskButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Task, TaskState, TaskType, TaskTypes } from '@/types/task';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, FileText } from 'lucide-react';
interface TaskCardProps {
    /** A tarefa a ser exibida */
    task: Task;
    /** Índice da tarefa na lista */
    index: number;
    /** Estado atual da tarefa */
    state: TaskState;
    /** Callback para ativar o modo de edição da tarefa */
    onEdit: () => void;
    /** Callback para alterar o tipo da tarefa */
    onTypeChange: (type: TaskType) => void;
    /** Callback para adicionar uma nova tarefa após esta */
    onNewTask?: (newTask?: Task) => void;
    /** Callback para visualizar a tarefa em modo de preview */
    onPreview: () => void;
    /** Callback para responder a tarefa */
    onRespond: () => void;
    /** Callback para retornar ao modo de visualização normal */
    onViewNormal: () => void;
}
const getTaskTypeIcon = (type: TaskType) => {
    const taskType = TaskTypes.find((t) => t.value === type);
    return taskType ? <taskType.icon className="h-6 w-6" /> : <FileText className="h-4 w-4" />;
};
export default function TaskCard({ task, state, onEdit, onNewTask, onViewNormal }: TaskCardProps) {
    const { setNodeRef, transform, transition, isDragging } = useSortable({
        id: `task-${task.id}`,
        animateLayoutChanges: () => false,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
    };
    const renderStateActions = () => {
        switch (state) {
            case TaskState.Viewing:
                return null;
            case TaskState.Previewing:
                return (
                    <Button type="button" variant="ghost" size="sm" onClick={onViewNormal}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Voltar
                    </Button>
                );
            case TaskState.Responding:
                return (
                    <Button type="button" variant="ghost" size="sm" onClick={onViewNormal}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Voltar
                    </Button>
                );
            default:
                return null;
        }
    };
    const renderTaskContent = () => {
        const taskType = TaskTypes.find((t) => t.value === task.type);
        if (!taskType) return null;
        return <TaskDescriptionInput mode="view" icon={taskType.icon} value={task.description} />;
    };
    const renderPreviewContent = () => {
        // Conteúdo da visualização prévia (mais detalhado)
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    {getTaskTypeIcon(task.type)}
                    <Label className="text-lg font-semibold">{task.description}</Label>
                </div>
                {/* Campos específicos por tipo de tarefa */}
                {task.type === 'multiple_choice' && task.options && (
                    <div className="space-y-2 pl-4">
                        <Label className="text-muted-foreground text-sm">Escolha uma opção:</Label>
                        {task.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-2 pl-2">
                                <div className="border-muted-foreground size-4 rounded-full border"></div>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                )}
                {task.type === 'multiple_select' && task.options && (
                    <div className="space-y-2 pl-4">
                        <Label className="text-muted-foreground text-sm">Selecione as opções:</Label>
                        {task.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-2 pl-2">
                                <div className="border-muted-foreground size-4 rounded border"></div>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                )}
                {task.type === 'measurement' && task.measurement && (
                    <div className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                            <span>{task.measurement.name}:</span>
                            <span>
                                {task.measurement.min !== undefined && `Min: ${task.measurement.min}`}
                                {task.measurement.target !== undefined && ` Target: ${task.measurement.target}`}
                                {task.measurement.max !== undefined && ` Max: ${task.measurement.max}`}
                                {` ${task.measurement.unit}`}
                            </span>
                        </div>
                    </div>
                )}
                {task.type === 'photo' && task.instructions && task.instructions.length > 0 && (
                    <div className="text-muted-foreground pl-4">
                        {task.instructions.map((instruction) => {
                            if (instruction.type === 'text') {
                                return <p key={instruction.id}>{instruction.content}</p>;
                            }
                            return null;
                        })}
                    </div>
                )}
                {task.type === 'code_reader' && task.codeReaderInstructions && (
                    <div className="text-muted-foreground pl-4">
                        <p>Tipo: {task.codeReaderType === 'qr_code' ? 'QR Code' : 'Código de Barras'}</p>
                        <p>{task.codeReaderInstructions}</p>
                    </div>
                )}
                {task.type === 'file_upload' && task.fileUploadInstructions && (
                    <div className="text-muted-foreground pl-4">
                        <p>{task.fileUploadInstructions}</p>
                    </div>
                )}
            </div>
        );
    };
    const renderRespondContent = () => {
        // Conteúdo para resposta (similar ao preview, mas com campos para input)
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    {getTaskTypeIcon(task.type)}
                    <Label className="text-lg font-semibold">{task.description}</Label>
                </div>
                {/* Campos de resposta específicos por tipo de tarefa */}
                {/* Aqui seria implementado o formulário real de resposta */}
                <div className="text-muted-foreground pl-4 italic">
                    Interface de resposta para {TaskTypes.find((t) => t.value === task.type)?.name}
                </div>
            </div>
        );
    };
    return (
        <Card ref={setNodeRef} style={style} className={`bg-muted/30 ${isDragging ? 'shadow-lg' : ''}`}>
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {state === TaskState.Viewing && renderTaskContent()}
                        {state === TaskState.Previewing && renderPreviewContent()}
                        {state === TaskState.Responding && renderRespondContent()}
                    </div>
                    <div className="flex items-center gap-1">
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs ${task.isRequired ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}
                        >
                            {task.isRequired ? 'Obrigatório' : 'Opcional'}
                        </span>
                        {renderStateActions()}
                    </div>
                </div>
            </CardHeader>
            {state === TaskState.Viewing && (
                <CardContent className="pt-0">
                    <div className="flex justify-end gap-2">
                        <AddTaskButton
                            label="Nova Tarefa Abaixo"
                            tasks={[task]}
                            currentIndex={0}
                            onTaskAdded={(newTask) => {
                                if (onNewTask) {
                                    onNewTask(newTask);
                                }
                            }}
                        />
                        <Button type="button" onClick={onEdit} className="flex items-center gap-2">
                            Editar
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
