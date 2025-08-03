import AddTaskButton from '@/components/tasks/AddTaskButton';
import { EditableText } from '@/components/tasks/EditableText';
import { TaskInstructionList } from '@/components/tasks/TaskInstructionList';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Task, TaskTypes } from '@/types/task';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
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
    /** Callback para atualizar a tarefa */
    onTaskUpdate?: (updatedTask: Task) => void;
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
    onRequiredChange,
    onTaskUpdate,
}: TaskBaseCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `task-${id}`,
        animateLayoutChanges: () => false,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined,
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
    // Função para atualizar as instruções da tarefa
    const handleInstructionsUpdate = (updatedTask: Task) => {
        if (onTaskUpdate) {
            onTaskUpdate(updatedTask);
        }
    };
    // Encontrar a tarefa atual diretamente
    const currentTask = tasks?.find((task) => task.id === id);
    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`${isEditing ? 'bg-card-muted' : 'bg-card'} ${isDragging ? 'shadow-lg' : ''} relative transition-all duration-200 ease-in-out`}
        >
            <CardHeader className="pb-2">
                {/* Área de obrigatório em telas pequenas - aparece acima do título */}
                <div className="mb-2 flex h-6 items-center justify-between lg:hidden">
                    <div className="flex items-center gap-2">
                        {isEditing && !isResponding && !isPreviewing && (
                            <>
                                <Switch id="required-mobile" checked={isRequired} onCheckedChange={onRequiredChange} />
                                <Label htmlFor="required-mobile" className="text-muted-foreground text-sm">
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
                        <button {...attributes} {...listeners} className="cursor-grab touch-none hover:cursor-grabbing lg:hidden">
                            <GripVertical className="h-4 w-4 text-gray-500" />
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-start justify-between lg:flex-row lg:items-center lg:gap-4">
                    <div className={`flex w-full min-w-0 flex-1 items-start gap-4`}>
                        <div className="text-primary flex-shrink-0" style={{ paddingTop: isEditing ? '0.5rem' : '0.3rem' }}>
                            {icon}
                        </div>
                        <div className="min-w-0 flex-1">
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
                    <div className="ml-auto flex flex-shrink-0 items-center gap-4">
                        {/* Área de obrigatório em telas grandes - aparece ao lado do título */}
                        {!isResponding && !isPreviewing && isEditing && (
                            <div className="hidden items-center gap-2 lg:flex">
                                <Switch id="required" checked={isRequired} onCheckedChange={onRequiredChange} />
                                <Label htmlFor="required" className="text-muted-foreground text-sm">
                                    Obrigatório
                                </Label>
                            </div>
                        )}
                        {(isPreviewing || isResponding) && isRequired && (
                            <Badge variant="required" className="hidden flex-shrink-0 lg:flex">
                                Obrigatório
                            </Badge>
                        )}
                        {!isResponding && !isPreviewing && (
                            <button {...attributes} {...listeners} className="hidden cursor-grab touch-none hover:cursor-grabbing lg:block">
                                <GripVertical className="h-4 w-4 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 lg:space-y-4">
                {/* Conteúdo principal da tarefa */}
                {children}
                {/* Lista de instruções - exibir independentemente do modo */}
                {currentTask && <TaskInstructionList task={currentTask} mode={mode} onInstructionsUpdate={handleInstructionsUpdate} />}
                <div className="mt-4 flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center lg:gap-4">
                    {isEditing && onRemove && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="warning"
                                    className="order-3 flex w-full items-center justify-center gap-2 lg:order-none lg:w-auto"
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
                                <AlertDialogFooter className="flex-col gap-2 lg:flex-row">
                                    <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={onRemove}>
                                        Sim, excluir tarefa
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {isPreviewing && (
                        <div className="mb-2 w-full lg:mb-0 lg:flex-1">
                            <span className="text-muted-foreground block text-sm italic">
                                Visualização apenas • Ações disponíveis durante execução da tarefa
                            </span>
                        </div>
                    )}
                    {isResponding && <div></div> /* Espaço vazio para manter o layout */}
                    <div className="flex w-full flex-col justify-end gap-2 lg:ml-auto lg:w-auto lg:flex-row">
                        {!isResponding && onNewTask && (
                            <div className="order-2 w-full lg:order-none lg:w-auto">
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
                                className="order-1 flex w-full items-center justify-center gap-2 lg:order-none lg:w-auto"
                            >
                                Editar
                            </Button>
                        )}
                        {isEditing && onPreview && (
                            <Button
                                type="button"
                                onClick={onPreview}
                                className="order-1 flex w-full items-center justify-center gap-2 lg:order-none lg:w-auto"
                            >
                                Visualizar
                            </Button>
                        )}
                        {isResponding && (
                            <Button
                                type="button"
                                onClick={isLastTask ? onFinish : onNext}
                                className="order-1 flex w-full items-center justify-center gap-2 lg:order-none lg:w-auto"
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
