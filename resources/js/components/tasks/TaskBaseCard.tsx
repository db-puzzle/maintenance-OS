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
            className={`${isEditing ? 'bg-muted/90' : 'bg-background'} ${isDragging ? 'shadow-lg' : ''} transition-all duration-200 ease-in-out relative`}
        >
            <CardHeader className="pb-2">
                {/* Área de obrigatório em telas pequenas - aparece acima do título */}
                <div className="flex justify-between items-center mb-2 lg:hidden h-6">
                    <div className="flex items-center gap-2">
                        {isEditing && !isResponding && !isPreviewing && (
                            <>
                                <Switch
                                    id="required-mobile"
                                    checked={isRequired}
                                    onCheckedChange={onRequiredChange}
                                />
                                <Label htmlFor="required-mobile" className="text-sm text-muted-foreground">
                                    Obrigatório
                                </Label>
                            </>
                        )}
                        {(isPreviewing || isResponding) && isRequired && (
                            <Badge variant="required" className="flex-shrink-0">
                                Obrigatório
                            </Badge>
                        )}
                    </div>
                    {!isResponding && !isPreviewing && (
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:cursor-grabbing touch-none lg:hidden"
                        >
                            <GripVertical className="h-4 w-4 text-gray-500" />
                        </button>
                    )}
                </div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center lg:gap-4">
                    <div className={`flex items-start gap-4 flex-1 min-w-0 w-full`}>
                        <div className="text-primary flex-shrink-0" style={{ paddingTop: isEditing ? '0.5rem' : '0.3rem' }}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <EditableText
                                    value={title}
                                    onChange={handleTitleChange}
                                    isEditing={isEditing}
                                    editingClassName="!text-lg font-medium bg-background"
                                    viewClassName="text-lg font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-4 ml-auto">
                        {/* Área de obrigatório em telas grandes - aparece ao lado do título */}
                        {!isResponding && !isPreviewing && isEditing && (
                            <div className="hidden lg:flex items-center gap-2">
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
                        {(isPreviewing || isResponding) && isRequired && (
                            <Badge variant="required" className="flex-shrink-0 hidden lg:flex">
                                Obrigatório
                            </Badge>
                        )}
                        {!isResponding && !isPreviewing && (
                            <button
                                {...attributes}
                                {...listeners}
                                className="cursor-grab hover:cursor-grabbing touch-none hidden lg:block"
                            >
                                <GripVertical className="h-4 w-4 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 lg:space-y-4">
                {children}

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mt-4 gap-2 lg:gap-4">
                    {isEditing && onRemove && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="warning"
                                    className="flex items-center gap-2 w-full lg:w-auto justify-center order-3 lg:order-none"
                                >
                                    Excluir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[95vw] lg:max-w-lg">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A exclusão será permanente após a Rotina ser salva.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col lg:flex-row gap-2">
                                    <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={onRemove}>
                                        Sim, excluir tarefa
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    
                    {isPreviewing && (
                        <div className="w-full mb-2 lg:mb-0 lg:flex-1">
                            <span className="text-sm text-muted-foreground italic block">
                                Visualização apenas • Ações disponíveis durante execução da tarefa
                            </span>
                        </div>
                    )}
                    
                    {isResponding && (
                        <div></div> /* Espaço vazio para manter o layout */
                    )}
                    
                    <div className="flex flex-col lg:flex-row gap-2 justify-end lg:ml-auto w-full lg:w-auto">
                        {!isResponding && onNewTask && (
                            <div className="w-full lg:w-auto order-2 lg:order-none">
                                <AddTaskButton
                                    label="Nova Tarefa Abaixo"
                                    taskTypes={taskTypes || TaskTypes}
                                    tasks={tasks}
                                    currentIndex={currentIndex || 0}
                                    onTaskAdded={onNewTask}
                                />
                            </div>
                        )}
                        
                        {isPreviewing && (
                            <Button
                                type="button"
                                variant="default"
                                onClick={onEdit}
                                className="flex items-center gap-2 w-full lg:w-auto justify-center order-1 lg:order-none"
                            >
                                Editar
                            </Button>
                        )}
                        
                        {isEditing && onPreview && (
                            <Button
                                type="button"
                                onClick={onPreview}
                                className="flex items-center gap-2 w-full lg:w-auto justify-center order-1 lg:order-none"
                            >
                                Visualizar
                            </Button>
                        )}
                        
                        {isResponding && (
                            <Button
                                type="button"
                                onClick={isLastTask ? onFinish : onNext}
                                className="flex items-center gap-2 w-full lg:w-auto justify-center order-1 lg:order-none"
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