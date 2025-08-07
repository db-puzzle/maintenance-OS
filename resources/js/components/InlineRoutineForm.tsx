import { TaskBaseCard, TaskContent } from '@/components/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Task, TaskState, TaskTypes } from '@/types/task';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
interface RoutineData {
    id: number;
    name: string;
    form?: {
        id: number;
        tasks: Task[];
    };
}
interface ExecutionData {
    id: number;
    status: string;
    form_execution?: {
        id: number;
        form_version?: {
            id: number;
            tasks: Task[];
        };
    };
}
interface TaskResponseData {
    id: number;
    form_task_id: string;
    response: Record<string, unknown>;
    is_completed: boolean;
}
interface Props {
    routine: RoutineData;
    assetId: number;
    onClose?: () => void;
    onComplete?: () => void;
}
export default function InlineRoutineForm({ routine, assetId, onClose, onComplete }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [execution, setExecution] = useState<ExecutionData | null>(null);
    const [taskResponses, setTaskResponses] = useState<Record<string, TaskResponseData>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
    const [taskIcons, setTaskIcons] = useState<Record<string, React.ReactNode>>({});
    const taskRefs = useRef<Record<number, HTMLDivElement | null>>({});
    // Initialize or get existing execution
    const initializeExecution = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.post(
                route('maintenance.assets.routines.inline-execution.start', {
                    asset: assetId,
                    routine: routine.id,
                }),
            );
            const executionData = response.data.execution;
            const formExecution = response.data.form_execution;
            const existingResponses = response.data.task_responses || [];
            setExecution(executionData);
            // Use form version tasks if available, otherwise use routine form tasks
            const tasksToUse = formExecution?.form_version?.tasks || routine.form?.tasks || [];
            setTasks(
                tasksToUse.map((task: Task) => ({
                    ...task,
                    state: TaskState.Viewing,
                })),
            );
            // Process existing responses
            const responsesMap: Record<string, TaskResponseData> = {};
            existingResponses.forEach((response: TaskResponseData) => {
                responsesMap[response.form_task_id] = response;
            });
            setTaskResponses(responsesMap);
            // Calculate progress
            const total = tasksToUse.length;
            const completed = Object.keys(responsesMap).length;
            setProgress({
                total,
                completed,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
            // Find first incomplete task
            const firstIncompleteIndex = tasksToUse.findIndex((task: Task) => !responsesMap[task.id]);
            const initialIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
            setCurrentTaskIndex(initialIndex);
            // Set the initial task to responding state
            const initialTasks = tasksToUse.map((task: Task, idx: number) => ({
                ...task,
                state: idx === initialIndex ? TaskState.Responding : TaskState.Viewing,
            }));
            setTasks(initialTasks);
        } catch (error: unknown) {
            const err = error as {
                response?: {
                    status?: number;
                    data?: {
                        errors?: Record<string, string[]>;
                        message?: string;
                        error?: string;
                    };
                };
            };
            console.error('Error initializing execution:', err);
            toast.error('Erro ao iniciar execução', {
                description: err.response?.data?.error || 'Tente novamente',
            });
            if (onClose) onClose();
        } finally {
            setLoading(false);
        }
    }, [assetId, routine.id, routine.form?.tasks, onClose]);
    useEffect(() => {
        initializeExecution();
    }, [initializeExecution]);
    const updateTaskIcon = (taskId: string, icon: React.ReactNode) => {
        setTaskIcons((prev) => ({
            ...prev,
            [taskId]: icon,
        }));
    };
    const scrollToTask = (index: number) => {
        setTimeout(() => {
            taskRefs.current[index]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 100);
    };
    const handleTaskUpdate = async (taskId: string, updatedTask: Task) => {
        // Update task state locally
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
    };
    const handleTaskSave = async (taskId: string, responseData: Record<string, unknown>) => {
        if (!execution || saving) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('task_id', taskId);
            // Ensure we have some response data
            const dataToSend = responseData || {};
            // Handle different response types
            if (Array.isArray(dataToSend.files) && dataToSend.files.length > 0) {
                const files = dataToSend.files as File[];
                files.forEach((file: File, index: number) => {
                    formData.append(`files[${index}]`, file);
                });
                // Remove files from response data to avoid sending as JSON
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { files: _files, ...restData } = dataToSend;
                // Send response as array fields instead of JSON string
                Object.keys(restData).forEach((key) => {
                    formData.append(`response[${key}]`, String(restData[key]));
                });
            } else {
                // Send response as array fields instead of JSON string
                Object.keys(dataToSend).forEach((key) => {
                    formData.append(`response[${key}]`, String(dataToSend[key]));
                });
            }
            const response = await axios.post(
                route('maintenance.assets.routines.inline-execution.save-task', {
                    asset: assetId,
                    routine: routine.id,
                    execution: execution.id,
                }),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );
            // Update task responses
            const taskResponse = response.data.task_response;
            setTaskResponses((prev) => ({
                ...prev,
                [taskId]: {
                    id: taskResponse.id,
                    form_task_id: taskId,
                    response: taskResponse.response,
                    is_completed: taskResponse.is_completed,
                },
            }));
            // Update progress
            setProgress(response.data.progress);
            // Mark task as completed visually
            setTasks(tasks.map((t) => (t.id === taskId ? { ...t, state: TaskState.Viewing, completed: true } : t)));
            toast.success('Tarefa salva com sucesso');
            // Auto-advance to next task if not the last one
            if (currentTaskIndex < tasks.length - 1) {
                const nextIndex = currentTaskIndex + 1;
                setCurrentTaskIndex(nextIndex);
                scrollToTask(nextIndex);
                // Set next task to responding state
                setTasks(
                    tasks.map((t, idx) => ({
                        ...t,
                        state: idx === nextIndex ? TaskState.Responding : TaskState.Viewing,
                    })),
                );
            } else if (response.data.all_tasks_completed) {
                // All tasks completed, automatically complete the routine
                handleCompleteExecution();
            }
        } catch (error: unknown) {
            const err = error as {
                response?: {
                    status?: number;
                    data?: {
                        errors?: Record<string, string[]>;
                        message?: string;
                        error?: string;
                    };
                };
            };
            console.error('Error saving task:', err);
            // Check for validation errors
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat().join(', ');
                toast.error('Erro de validação', {
                    description: errorMessages,
                });
            } else {
                toast.error('Erro ao salvar tarefa', {
                    description: err.response?.data?.message || err.response?.data?.error || 'Tente novamente',
                });
            }
        } finally {
            setSaving(false);
        }
    };
    const handleCompleteExecution = async () => {
        if (!execution || completing) return;
        setCompleting(true);
        try {
            await axios.post(
                route('maintenance.assets.routines.inline-execution.complete', {
                    asset: assetId,
                    routine: routine.id,
                    execution: execution.id,
                }),
            );
            toast.success('Rotina concluída com sucesso!');
            if (onComplete) onComplete();
            if (onClose) onClose();
            // Reload the page to refresh the routine list
            router.reload();
        } catch (error: unknown) {
            const err = error as {
                response?: {
                    data?: {
                        missing_tasks?: string[];
                        error?: string;
                    };
                };
            };
            console.error('Error completing execution:', err);
            if (err.response?.data?.missing_tasks) {
                toast.error('Existem tarefas obrigatórias não preenchidas', {
                    description: err.response.data.missing_tasks.join(', '),
                });
            } else {
                toast.error('Erro ao concluir rotina', {
                    description: err.response?.data?.error || 'Tente novamente',
                });
            }
        } finally {
            setCompleting(false);
        }
    };
    const handleCancelExecution = async () => {
        if (!execution) return;
        try {
            await axios.post(
                route('maintenance.assets.routines.inline-execution.cancel', {
                    asset: assetId,
                    routine: routine.id,
                    execution: execution.id,
                }),
            );
            toast.info('Execução cancelada');
            if (onClose) onClose();
        } catch (error: unknown) {
            console.error('Error canceling execution:', error);
            toast.error('Erro ao cancelar execução');
        }
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
        );
    }
    if (!execution || tasks.length === 0) {
        return (
            <Card className="bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center">
                    <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
                    <h3 className="mb-2 text-lg font-medium">Erro ao carregar formulário</h3>
                    <p className="text-muted-foreground mb-4 text-sm">Não foi possível carregar o formulário desta rotina.</p>
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-6">
            {/* Header with progress */}
            <div className="bg-background/95 sticky top-0 z-10 -mx-4 border-b px-4 pb-4 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Preenchendo: {routine.name}</h3>
                        <p className="text-muted-foreground text-sm">
                            Tarefa {Math.min(currentTaskIndex + 1, tasks.length)} de {tasks.length}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelExecution} disabled={saving || completing}>
                            <X className="mr-1 h-4 w-4" />
                            Cancelar
                        </Button>
                        {progress.percentage === 100 && (
                            <Button size="sm" onClick={handleCompleteExecution} disabled={completing}>
                                {completing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Concluindo...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Concluir Rotina
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                </div>
            </div>
            {/* Task list */}
            <div className="space-y-4">
                {tasks.map((task, index) => {
                    const taskType = TaskTypes.find((t) => t.value === task.type);
                    const icon = taskIcons[task.id] || (taskType ? <taskType.icon className="size-5" /> : <ClipboardCheck className="size-5" />);
                    const isCompleted = !!taskResponses[task.id];
                    const isCurrent = index === currentTaskIndex;
                    return (
                        <div
                            key={`task-${task.id}`}
                            ref={(el) => {
                                taskRefs.current[index] = el;
                            }}
                            className={cn(
                                'transition-all duration-300',
                                isCurrent && 'ring-primary rounded-lg ring-2 ring-offset-2',
                                isCompleted && 'opacity-75',
                            )}
                        >
                            <TaskBaseCard
                                id={task.id}
                                mode={task.state === TaskState.Responding ? 'respond' : 'preview'}
                                icon={icon}
                                title={task.description}
                                isRequired={task.isRequired}
                                onTaskUpdate={() => { }}
                            >
                                {isCompleted && (
                                    <div className="mb-2 flex items-center gap-1 text-sm text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Tarefa concluída</span>
                                    </div>
                                )}
                                <TaskContent
                                    task={task}
                                    mode={task.state === TaskState.Responding ? 'respond' : 'preview'}
                                    onUpdate={(updatedTask) => handleTaskUpdate(task.id, updatedTask)}
                                    onIconChange={(newIcon) => updateTaskIcon(task.id, newIcon)}
                                    onSave={(responseData) => handleTaskSave(task.id, responseData)}
                                    showSaveButton={task.state === TaskState.Responding && !isCompleted}
                                    disabled={saving}
                                    isLastTask={index === tasks.length - 1}
                                />
                            </TaskBaseCard>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
