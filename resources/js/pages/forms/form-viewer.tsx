import { TaskBaseCard, TaskContent } from '@/components/tasks';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { Task, TaskType, TaskTypes } from '@/types/task';
import { Head, router, usePage } from '@inertiajs/react';
import { ClipboardCheck, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FormData {
    id: number;
    name?: string;
    tasks: Task[];
}

interface EntityData {
    id: number;
    name?: string;
    tag?: string;
}

interface Props {
    form: FormData;
    entity: EntityData;
    entityType: 'routine' | 'inspection' | 'report';
    mode?: 'view' | 'fill';
    breadcrumbs?: BreadcrumbItem[];
    backRoute?: string;
    submitRoute?: string;
}

interface FormResponse {
    task_id: string;
    value?: any;
    measurement?: {
        value: number;
    };
    files?: File[];
}

const EntityLabels = {
    routine: {
        singular: 'Rotina',
        plural: 'Rotinas',
        form: 'Formulário da Rotina',
    },
    inspection: {
        singular: 'Inspeção',
        plural: 'Inspeções',
        form: 'Formulário de Inspeção',
    },
    report: {
        singular: 'Relatório',
        plural: 'Relatórios',
        form: 'Formulário de Relatório',
    },
};

export default function FormViewer({ form, entity, entityType, mode = 'view', breadcrumbs, backRoute, submitRoute }: Props) {
    const { url } = usePage();

    // Extrai o parâmetro mode da URL se não foi passado como prop
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const modeFromUrl = urlParams.get('mode') as 'view' | 'fill' | null;
    const currentMode = mode || modeFromUrl || 'view';

    const entityLabel = EntityLabels[entityType];
    const entityDisplayName = entity.name || entity.tag || `${entityLabel.singular} ${entity.id}`;

    const defaultBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: entityDisplayName,
            href: '#',
        },
        {
            title: currentMode === 'fill' ? 'Preencher Formulário' : 'Visualizar Formulário',
            href: '#',
        },
    ];

    const [tasks, setTasks] = useState<Task[]>(form.tasks);
    const [responses, setResponses] = useState<Record<string, FormResponse>>({});
    const [processing, setProcessing] = useState(false);

    // Estado para armazenar os ícones personalizados por ID de tarefa
    const [taskIcons, setTaskIcons] = useState<Record<string, React.ReactNode>>({});

    // Função para atualizar o ícone de uma tarefa específica
    const updateTaskIcon = (taskId: string, icon: React.ReactNode) => {
        setTaskIcons((prev) => {
            if (prev[taskId] === icon) return prev;
            return {
                ...prev,
                [taskId]: icon,
            };
        });
    };

    const handleTaskUpdate = (taskId: string, updatedTask: Task) => {
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));

        // Armazenar a resposta baseada no tipo de tarefa e dados recebidos
        const response: FormResponse = { task_id: taskId };

        setResponses((prev) => ({ ...prev, [taskId]: response }));
    };

    // Função separada para capturar respostas
    const handleResponseUpdate = (taskId: string, value: any, type: TaskType) => {
        const response: FormResponse = { task_id: taskId };

        switch (type) {
            case 'measurement':
                if (value && typeof value === 'object' && 'value' in value) {
                    response.measurement = { value: value.value };
                }
                break;
            case 'multiple_select':
                if (Array.isArray(value)) {
                    response.value = value;
                }
                break;
            case 'multiple_choice':
            case 'question':
                response.value = value;
                break;
            case 'photo':
            case 'file_upload':
                if (value && Array.isArray(value)) {
                    response.files = value;
                }
                break;
        }

        setResponses((prev) => ({ ...prev, [taskId]: response }));
    };

    const validateResponses = (): boolean => {
        // Verificar se todas as tarefas obrigatórias foram respondidas
        for (const task of tasks) {
            if (task.isRequired) {
                const response = responses[task.id];
                if (!response || (!response.value && !response.measurement && !response.files)) {
                    toast.error(`Por favor, responda a tarefa obrigatória: ${task.description}`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateResponses()) {
            return;
        }

        if (!submitRoute) {
            toast.error('Rota de submissão não configurada');
            return;
        }

        setProcessing(true);

        const formData = new FormData();
        const responsesArray: any[] = [];

        // Converter responses para array
        Object.values(responses).forEach((response, index) => {
            const responseData: any = {
                task_id: response.task_id,
                value: response.value,
                measurement: response.measurement,
            };

            // Adicionar arquivos se existirem
            if (response.files && response.files.length > 0) {
                response.files.forEach((file, fileIndex) => {
                    formData.append(`responses[${index}][files][${fileIndex}]`, file);
                });
            }

            responsesArray.push(responseData);
        });

        // Adicionar responses como JSON
        formData.append('responses', JSON.stringify(responsesArray));

        router.post(submitRoute, formData, {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Formulário preenchido com sucesso!');
            },
            onError: (errors) => {
                toast.error('Erro ao preencher formulário', {
                    description: 'Verifique os campos e tente novamente.',
                });
                console.error(errors);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const renderFormContent = () => (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="mb-4 flex items-center gap-2">
                        <FileText className="text-muted-foreground h-5 w-5" />
                        <h3 className="text-lg font-medium">{form.name || entityLabel.form}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {currentMode === 'fill'
                            ? 'Preencha todas as tarefas obrigatórias do formulário.'
                            : `Este formulário possui ${form.tasks.length} tarefa${form.tasks.length !== 1 ? 's' : ''}.`}
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {tasks.length === 0 ? (
                    <Card className="bg-muted/30">
                        <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
                            <div className="bg-muted/50 mb-4 flex size-12 items-center justify-center rounded-full">
                                <ClipboardCheck className="text-foreground/60 size-6" />
                            </div>
                            <h3 className="mb-2 text-lg font-medium">Nenhuma tarefa no formulário</h3>
                            <p className="text-muted-foreground mx-auto max-w-xs text-sm">Este formulário ainda não possui tarefas configuradas.</p>
                        </CardContent>
                    </Card>
                ) : (
                    tasks.map((task, index) => {
                        const taskType = TaskTypes.find((t) => t.value === task.type);
                        const icon = taskIcons[task.id] || (taskType ? <taskType.icon className="size-5" /> : <ClipboardCheck className="size-5" />);

                        return (
                            <TaskBaseCard
                                key={`task-${task.id}`}
                                id={task.id}
                                mode={currentMode === 'fill' ? 'respond' : 'preview'}
                                icon={icon}
                                title={task.description}
                                isRequired={task.isRequired}
                                onTaskUpdate={() => {}}
                            >
                                <TaskContent
                                    task={task}
                                    mode={currentMode === 'fill' ? 'respond' : 'preview'}
                                    onUpdate={(updatedTask) => handleTaskUpdate(task.id, updatedTask)}
                                    onIconChange={(newIcon) => updateTaskIcon(task.id, newIcon)}
                                />
                            </TaskBaseCard>
                        );
                    })
                )}
            </div>
        </div>
    );

    const pageTitle = `${currentMode === 'fill' ? 'Preencher' : 'Visualizar'} ${entityLabel.form}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs || defaultBreadcrumbs}>
            <Head title={`${pageTitle} - ${entityDisplayName}`} />

            {currentMode === 'fill' ? (
                <CreateLayout
                    title="Preencher Formulário"
                    subtitle={entityDisplayName}
                    breadcrumbs={breadcrumbs || defaultBreadcrumbs}
                    backRoute={backRoute || '#'}
                    onSave={handleSubmit}
                    isSaving={processing}
                    saveButtonText="Enviar Formulário"
                    contentWidth="custom"
                    contentClassName=""
                >
                    {renderFormContent()}
                </CreateLayout>
            ) : (
                <ShowLayout
                    title="Visualizar Formulário"
                    subtitle={entityDisplayName}
                    breadcrumbs={breadcrumbs || defaultBreadcrumbs}
                    backRoute={backRoute || '#'}
                    editRoute=""
                    tabs={[]}
                >
                    {renderFormContent()}
                </ShowLayout>
            )}
        </AppLayout>
    );
}
