import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    X, GripVertical, Plus, AlertTriangle, CheckSquare,
    ListChecks, Ruler, Camera, ScanBarcode, Upload
} from 'lucide-react';
import { EditableText } from '@/components/tasks/EditableText';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskType, TaskTypes, TaskState } from '@/types/task';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddTaskButton from '@/components/tasks/AddTaskButton';

export type TaskCardMode = 'edit' | 'preview' | 'respond';

interface TaskBaseCardProps {
    /** ID único da tarefa */
    id: string;
    /** Modo de exibição do card */
    mode: TaskCardMode;
    /** Ícone da tarefa */
    icon: ReactNode;
    /** Título da tarefa */
    title: string;
    /** Indica se é a última tarefa na sequência */
    isLastTask?: boolean;
    /** Conteúdo principal do card */
    children?: ReactNode;
    /** Callback para mudar o título */
    onTitleChange?: (newTitle: string) => void;
    /** Callback para excluir a tarefa */
    onRemove?: () => void;
    /** Callback para adicionar nova tarefa */
    onNewTask?: (newTask?: Task) => void;
    /** Callback para mudar para modo de visualização */
    onPreview?: () => void;
    /** Callback para mudar para modo de edição */
    onEdit?: () => void;
    /** Callback para avançar para próxima tarefa */
    onNext?: () => void;
    /** Callback para finalizar a sequência */
    onFinish?: () => void;
    /** Lista de tipos de tarefas disponíveis */
    taskTypes?: typeof TaskTypes;
    /** Lista de tarefas (para o botão de nova tarefa) */
    tasks?: Task[];
    /** Índice atual da tarefa */
    currentIndex?: number;
    /** Indica se a tarefa é obrigatória */
    isRequired?: boolean;
    /** Callback para mudar a obrigatoriedade da tarefa */
    onRequiredChange?: (checked: boolean) => void;
}

export default function TaskBaseCard({
    id,
    mode,
    icon,
    title,
    isLastTask = false,
    children,
    onTitleChange,
    onRemove,
    onNewTask,
    onPreview,
    onEdit,
    onNext,
    onFinish,
    taskTypes,
    tasks,
    currentIndex,
    isRequired,
    onRequiredChange
}: TaskBaseCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `task-${id}`,
        animateLayoutChanges: () => false
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined
    };

    const isEditing = mode === 'edit';
    const isPreviewing = mode === 'preview';
    const isResponding = mode === 'respond';

    // Função para lidar com a mudança do título, garantindo que a
    // função sempre exista, mesmo que onTitleChange não seja fornecido
    const handleTitleChange = (value: string) => {
        if (onTitleChange) {
            onTitleChange(value);
        }
    };

    return (
        <Card 
            ref={setNodeRef}
            style={style}
            className={`${isEditing ? 'bg-muted/90' : 'bg-background'} ${isDragging ? 'shadow-lg' : ''} transition-all duration-200 ease-in-out`}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center gap-4">
                    <div className={`flex items-start gap-4 flex-1 min-w-0`}>
                        <div className="text-primary flex-shrink-0" style={{ paddingTop: isEditing ? '0.5rem' : '0.3rem' }}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <EditableText
                                    value={title}
                                    onChange={handleTitleChange}
                                    isEditing={isEditing}
                                    editingClassName="!text-lg font-medium bg-background"
                                    viewClassName="text-lg font-medium"
                                />
                                {(isPreviewing || isResponding) && isRequired && (
                                    <Badge variant="required" className="flex-shrink-0">
                                        Obrigatório
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    {!isResponding && !isPreviewing && (
                        <div className="flex-shrink-0 flex items-center gap-4">
                            {isEditing && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="required"
                                        checked={isRequired}
                                        onCheckedChange={onRequiredChange}
                                    />
                                    <Label htmlFor="required" className="text-sm text-muted-foreground">
                                        Obrigatório
                                    </Label>
                                </div>
                            )}
                            <button
                                {...attributes}
                                {...listeners}
                                className="cursor-grab hover:cursor-grabbing touch-none"
                            >
                                <GripVertical className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                {children}

                <div className="flex justify-between items-center mt-4">
                    {isEditing && onRemove && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="warning"
                                    className="flex items-center gap-2"
                                >
                                    Excluir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A exclusão será permanente após a Rotina ser salva.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={onRemove}>
                                        Sim, excluir tarefa
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    
                    {isPreviewing && (
                        <div className="flex-1">
                            <span className="text-sm text-muted-foreground italic">
                                Visualização apenas • Ações disponíveis durante execução da tarefa
                            </span>
                        </div>
                    )}
                    
                    {isResponding && (
                        <div></div> /* Espaço vazio para manter o layout */
                    )}
                    
                    <div className="flex gap-2 justify-end">
                        {!isResponding && onNewTask && (
                            <AddTaskButton
                                label="Nova Tarefa Abaixo"
                                taskTypes={taskTypes || TaskTypes}
                                tasks={tasks}
                                currentIndex={currentIndex || 0}
                                onTaskAdded={onNewTask}
                            />
                        )}
                        
                        {isPreviewing && (
                            <Button
                                type="button"
                                variant="default"
                                onClick={onEdit}
                                className="flex items-center gap-2"
                            >
                                Editar
                            </Button>
                        )}
                        
                        {isEditing && onPreview && (
                            <Button
                                type="button"
                                onClick={onPreview}
                                className="flex items-center gap-2"
                            >
                                Visualizar
                            </Button>
                        )}
                        
                        {isResponding && (
                            <Button
                                type="button"
                                onClick={isLastTask ? onFinish : onNext}
                                className="flex items-center gap-2"
                            >
                                {isLastTask ? 'Finalizar' : 'Próxima'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 