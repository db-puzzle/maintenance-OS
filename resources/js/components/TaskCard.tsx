import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, FileText, List, MessageSquare, Pencil, QrCode, Barcode, Upload, ScanBarcode, CheckSquare, ListChecks, Ruler, PlusCircle, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskState, TaskType, TaskTypes, Measurement } from '@/types/task';
import TextInput from '@/components/TextInput';
import AddTaskButton from '@/components/AddTaskButton';

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

const getTaskTypeIcon = (type: TaskType, codeReaderType?: 'qr_code' | 'barcode') => {
    const taskType = TaskTypes.find(t => t.value === type);
    return taskType ? <taskType.icon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
};

export default function TaskCard({ 
    task, 
    index, 
    state,
    onEdit, 
    onTypeChange, 
    onNewTask,
    onPreview,
    onRespond,
    onViewNormal
}: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `task-${task.id}`,
        animateLayoutChanges: () => false
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined
    };

    const renderStateActions = () => {
        switch (state) {
            case TaskState.Viewing:
                return null;
            case TaskState.Previewing:
                return (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onViewNormal}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Button>
                );
            case TaskState.Responding:
                return (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onViewNormal}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Button>
                );
            default:
                return null;
        }
    };

    const renderTaskContent = () => {
        // Conteúdo principal da tarefa
        return (
            <div className="flex items-center gap-2">
                {getTaskTypeIcon(task.type, task.codeReaderType)}
                <Label className={`text-lg font-semibold flex-1 ${!task.description ? 'text-muted-foreground' : ''}`}>
                    {task.description || 'Clique em Editar para configurar a tarefa'}
                </Label>
            </div>
        );
    };

    const renderPreviewContent = () => {
        // Conteúdo da visualização prévia (mais detalhado)
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    {getTaskTypeIcon(task.type, task.codeReaderType)}
                    <Label className="text-lg font-semibold">
                        {task.description}
                    </Label>
                </div>
                
                {/* Campos específicos por tipo de tarefa */}
                {task.type === 'multiple_choice' && task.options && (
                    <div className="space-y-2 pl-4">
                        <Label className="text-sm text-muted-foreground">Escolha uma opção:</Label>
                        {task.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-2 pl-2">
                                <div className="size-4 rounded-full border border-muted-foreground"></div>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                )}

                {task.type === 'multiple_select' && task.options && (
                    <div className="space-y-2 pl-4">
                        <Label className="text-sm text-muted-foreground">Selecione as opções:</Label>
                        {task.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-2 pl-2">
                                <div className="size-4 rounded border border-muted-foreground"></div>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                )}

                {task.type === 'measurement' && task.measurementPoints && (
                    <div className="space-y-2 pl-4">
                        <Label className="text-sm text-muted-foreground">Pontos de medição:</Label>
                        {task.measurementPoints.map((point, i) => (
                            <div key={i} className="flex flex-col gap-1 pl-2 border-l-2 border-muted py-2 px-3">
                                <span className="font-medium">{point.name}</span>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Min: {point.min}</span>
                                    <span>Alvo: {point.target}</span>
                                    <span>Max: {point.max}</span>
                                    <span>Unidade: {point.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {task.type === 'photo' && task.photoInstructions && (
                    <div className="pl-4 text-muted-foreground">
                        <p>{task.photoInstructions}</p>
                    </div>
                )}

                {task.type === 'code_reader' && task.codeReaderInstructions && (
                    <div className="pl-4 text-muted-foreground">
                        <p>Tipo: {task.codeReaderType === 'qr_code' ? 'QR Code' : 'Código de Barras'}</p>
                        <p>{task.codeReaderInstructions}</p>
                    </div>
                )}

                {task.type === 'file_upload' && task.fileUploadInstructions && (
                    <div className="pl-4 text-muted-foreground">
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
                    {getTaskTypeIcon(task.type, task.codeReaderType)}
                    <Label className="text-lg font-semibold">
                        {task.description}
                    </Label>
                </div>
                
                {/* Campos de resposta específicos por tipo de tarefa */}
                {/* Aqui seria implementado o formulário real de resposta */}
                <div className="pl-4 text-muted-foreground italic">
                    Interface de resposta para {TaskTypes.find(t => t.value === task.type)?.name}
                </div>
            </div>
        );
    };

    return (
        <Card 
            ref={setNodeRef}
            style={style}
            className={`bg-muted/30 ${isDragging ? 'shadow-lg' : ''}`}
        >
            <CardHeader>
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        {state === TaskState.Viewing && renderTaskContent()}
                        {state === TaskState.Previewing && renderPreviewContent()}
                        {state === TaskState.Responding && renderRespondContent()}
                    </div>

                    <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.isRequired ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
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
                            taskTypes={TaskTypes}
                            tasks={[task]}
                            currentIndex={0}
                            onTaskAdded={(newTask) => {
                                if (onNewTask) {
                                    onNewTask(newTask);
                                }
                            }}
                        />
                        <Button
                            type="button"
                            onClick={onEdit}
                            className="flex items-center gap-2"
                        >
                            Editar
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
} 