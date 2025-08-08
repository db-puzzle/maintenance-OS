import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskContent } from '@/components/tasks/content';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, FileText, ClipboardCheck, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Task as TaskType, TaskState, TaskTypes } from '@/types/task';
import { TaskInstructionList } from '@/components/tasks/TaskInstructionList';
interface Version {
    id: number;
    version_number: string;
    published_at: string;
    tasks: TaskType[];
    is_current?: boolean;
}
interface Routine {
    id: number;
    name: string;
    asset: {
        id: number;
        tag: string;
    };
}
interface Props {
    routine: Routine;
    version: Version;
    mode?: 'view' | 'respond'; // Allow switching between view and respond modes
}
export default function ViewPublishedVersion({ routine, version, mode = 'view' }: Props) {
    const [isResponding, setIsResponding] = useState(mode === 'respond');
    const [tasks, setTasks] = useState<TaskType[]>(
        version.tasks.map(task => ({
            ...task,
            state: mode === 'respond' ? TaskState.Responding : TaskState.Viewing
        }))
    );
    const handleBack = () => {
        router.visit(route('asset-hierarchy.assets.show', {
            asset: routine.asset.id,
            tab: 'routines'
        }));
    };
    const handleStartResponse = () => {
        setIsResponding(true);
        setTasks(tasks.map(task => ({ ...task, state: TaskState.Responding })));
    };
    const handleTaskChange = (updatedTask: TaskType) => {
        const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex !== -1) {
            const newTasks = [...tasks];
            newTasks[taskIndex] = updatedTask;
            setTasks(newTasks);
        }
    };
    const handleSubmitResponse = () => {
        // TODO: Implement form submission
        console.log('Submitting response with tasks:', tasks);
    };
    const isReadOnly = !isResponding;
    return (
        <AppLayout>
            <Head title={`${isResponding ? 'Respondendo' : 'Visualizando'} - ${routine.name}`} />
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:mx-auto lg:max-w-4xl">
                {/* Mobile-optimized Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleBack}
                                className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Voltar</span>
                            </Button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
                                    {isResponding ? 'Respondendo' : 'Versão Publicada'}: {routine.name}
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                    Asset: {routine.asset.tag}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Badge variant="secondary" className="text-xs sm:text-sm whitespace-nowrap">
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                v{version.version_number}
                            </Badge>
                            {version.is_current ? (
                                <Badge variant="default" className="text-xs sm:text-sm">
                                    Versão Atual
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs sm:text-sm">
                                    Versão Anterior
                                </Badge>
                            )}
                            {!isResponding && mode === 'respond' && (
                                <Button
                                    size="sm"
                                    onClick={handleStartResponse}
                                    className="text-xs sm:text-sm"
                                >
                                    <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Iniciar Resposta
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Version Info - Collapsible on mobile */}
                <div className="mb-4 sm:mb-6">
                    <details className="sm:hidden">
                        <summary className="cursor-pointer mb-2">
                            <Badge variant="outline" className="text-xs">
                                <Info className="h-3 w-3 mr-1" />
                                Informações da Versão
                            </Badge>
                        </summary>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="font-medium text-gray-700">Versão</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-gray-900">v{version.version_number}</p>
                                        {version.is_current ? (
                                            <Badge variant="default" className="text-xs">
                                                Atual
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">
                                                Anterior
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Publicado em</label>
                                    <p className="text-gray-900">
                                        {format(new Date(version.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Total de Tarefas</label>
                                    <p className="text-gray-900">{version.tasks.length} tarefas</p>
                                </div>
                            </div>
                        </div>
                    </details>
                    {/* Desktop version info */}
                    <div className="hidden sm:block border rounded-lg p-4 lg:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <label className="font-bold text-gray-700">Versão</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-gray-900">v{version.version_number}</p>
                                    {version.is_current ? (
                                        <Badge variant="default" className="text-xs">
                                            Atual
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">
                                            Anterior
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="font-bold text-gray-700">Publicado em</label>
                                <p className="text-gray-900">
                                    {format(new Date(version.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                            <div>
                                <label className="font-bold text-gray-700">Total de Tarefas</label>
                                <p className="text-gray-900">{version.tasks.length} tarefas</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Response Alert for mobile */}
                {isResponding && (
                    <Alert className="mb-4 sm:mb-6 border-blue-200 bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-xs sm:text-sm text-blue-800">
                            Você está respondendo ao formulário. Preencha todas as tarefas obrigatórias antes de enviar.
                        </AlertDescription>
                    </Alert>
                )}
                {/* Tasks - Mobile optimized */}
                <div className="mb-6">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                        Tarefas ({tasks.length})
                    </h2>
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 text-gray-500">
                            <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 opacity-50 mb-3 sm:mb-4" />
                            <p className="text-sm sm:text-base">Nenhuma tarefa encontrada nesta versão</p>
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            {tasks.map((task) => {
                                // Get task icon based on type
                                const taskType = TaskTypes.find(t => t.value === task.type);
                                const icon = taskType ? <taskType.icon className="h-5 w-5" /> : <FileText className="h-5 w-5" />;
                                return (
                                    <Card
                                        key={task.id}
                                        className={cn(
                                            "relative transition-all duration-200 ease-in-out",
                                            isReadOnly ? "bg-card" : "bg-card"
                                        )}
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex flex-col items-start justify-between lg:flex-row lg:items-center lg:gap-4">
                                                <div className="flex w-full min-w-0 flex-1 items-start gap-4">
                                                    <div className="text-primary flex-shrink-0" style={{ paddingTop: '0.3rem' }}>
                                                        {icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-lg font-medium">
                                                                {task.description}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-auto flex flex-shrink-0 items-center gap-4">
                                                    {task.isRequired && (
                                                        <Badge variant="destructive" className="flex-shrink-0">
                                                            Obrigatória
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 pt-0 lg:space-y-4">
                                            <TaskContent
                                                task={task}
                                                mode={isReadOnly ? 'preview' : 'respond'}
                                                onUpdate={handleTaskChange}
                                                showSaveButton={false}
                                            />
                                            {/* Task Instructions if any */}
                                            {task.instructions && task.instructions.length > 0 && (
                                                <TaskInstructionList
                                                    task={task}
                                                    mode={isReadOnly ? 'preview' : 'respond'}
                                                    onInstructionsUpdate={(updatedTask) => handleTaskChange(updatedTask)}
                                                />
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
                {/* Fixed bottom action bar for mobile when responding */}
                {isResponding && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 sm:hidden z-50">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsResponding(false)}
                                className="flex-1 text-sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmitResponse}
                                className="flex-1 text-sm"
                            >
                                Enviar Resposta
                            </Button>
                        </div>
                    </div>
                )}
                {/* Desktop action buttons */}
                {isResponding && (
                    <div className="hidden sm:flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsResponding(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmitResponse}
                            size="lg"
                        >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Enviar Resposta
                        </Button>
                    </div>
                )}
                {/* Add padding at bottom for mobile fixed action bar */}
                {isResponding && <div className="h-20 sm:hidden" />}
            </div>
        </AppLayout>
    );
} 