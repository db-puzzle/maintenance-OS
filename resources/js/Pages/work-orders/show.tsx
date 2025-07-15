import React, { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    WorkOrderStatusBadge,
    WorkOrderPriorityIndicator
} from '@/components/work-orders';
import { WorkOrderApprovalTab, WorkOrderPlanningTab } from '@/components/work-orders/tabs';
import EmptyCard from '@/components/ui/empty-card';
import { type BreadcrumbItem } from '@/types';
import {
    Edit,
    Play,
    Calendar,
    Clock,
    User,
    Package,
    FileText,
    AlertCircle,
    CheckCircle,
    XCircle,
    Pause,
    Settings,
    Activity,
    Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
    workOrder: any; // Using any for now to avoid complex type definitions
    discipline: 'maintenance' | 'quality';
    canEdit: boolean;
    canApprove: boolean;
    canPlan: boolean;
    canExecute: boolean;
    canValidate: boolean;
    approvalThreshold?: {
        maxCost: number;
        maxPriority: string;
    };
    technicians?: any[];
    teams?: any[];
    parts?: any[];
    skills?: string[];
    certifications?: string[];
}

export default function ShowWorkOrder({
    workOrder,
    discipline,
    canEdit,
    canApprove,
    canPlan,
    canExecute,
    canValidate,
    approvalThreshold,
    technicians = [],
    teams = [],
    parts = [],
    skills = [],
    certifications = []
}: Props) {
    console.log('[show.tsx] ShowWorkOrder rendering', {
        workOrderId: workOrder.id,
        workOrderStatus: workOrder.status,
        canApprove,
        approvalThreshold
    });



    useEffect(() => {
        console.log('[show.tsx] Component mounted/updated', {
            workOrderId: workOrder.id,
            workOrderStatus: workOrder.status
        });

        // Add error event listener to catch React errors
        const handleError = (event: ErrorEvent) => {
            console.error('[show.tsx] Global error caught:', {
                message: event.message,
                error: event.error,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        };

        window.addEventListener('error', handleError);

        return () => {
            console.log('[show.tsx] Component unmounting', {
                workOrderId: workOrder.id,
                workOrderStatus: workOrder.status
            });
            window.removeEventListener('error', handleError);
        };
    }, [workOrder.id, workOrder.status]);

    const handleStatusAction = (action: string) => {
        router.post(route(`${discipline}.work-orders.${action}`, workOrder.id), {}, {
            onSuccess: () => {
                toast.success(`Ordem de serviço ${action === 'approve' ? 'aprovada' : 'atualizada'} com sucesso!`);
            },
            onError: () => {
                toast.error(`Erro ao ${action === 'approve' ? 'aprovar' : 'atualizar'} ordem de serviço.`);
            },
        });
    };

    const getStatusActions = () => {
        const actions = [];

        if (workOrder.status === 'requested' && canApprove) {
            actions.push(
                <Button key="approve" onClick={() => {
                    // Navigate to approval tab
                    const approvalTab = document.querySelector('[data-value="approval"]');
                    if (approvalTab instanceof HTMLElement) {
                        approvalTab.click();
                    }
                }} variant="default">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar/Rejeitar
                </Button>
            );
        }

        if ((workOrder.status === 'approved' || workOrder.status === 'planned') && canPlan) {
            actions.push(
                <Button key="plan" onClick={() => router.visit(route(`${discipline}.work-orders.planning`, workOrder.id))}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {workOrder.status === 'planned' ? 'Editar Planejamento' : 'Planejar'}
                </Button>
            );
        }

        if (workOrder.status === 'scheduled' && canExecute) {
            actions.push(
                <Button key="execute" onClick={() => router.visit(route(`${discipline}.work-orders.execute`, workOrder.id))}>
                    <Play className="mr-2 h-4 w-4" />
                    Executar
                </Button>
            );
        }

        if (workOrder.status === 'completed' && canValidate) {
            actions.push(
                <Button key="validate" onClick={() => router.visit(route(`${discipline}.work-orders.validate`, workOrder.id))}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Validar
                </Button>
            );
        }

        if (canEdit && ['requested', 'approved'].includes(workOrder.status)) {
            actions.push(
                <Button key="edit" variant="outline" onClick={() => router.visit(route(`${discipline}.work-orders.edit`, workOrder.id))}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            );
        }

        return actions;
    };

    // Define breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = useMemo(() => [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Ordens de Serviço',
            href: `/${discipline}/work-orders`,
        },
        {
            title: workOrder.work_order_number,
            href: '#',
        },
    ], [discipline, workOrder.work_order_number]);

    // Define tabs
    console.log('[show.tsx] Building tabs array');
    const tabs: any[] = [];

    // 1. Detalhes (always first)
    tabs.push({
        id: 'details',
        label: 'Detalhes',
        icon: <FileText className="h-4 w-4" />,
        content: (
            <div className="space-y-6 py-6">
                {/* Status Bar */}
                <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <WorkOrderStatusBadge status={workOrder.status} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Prioridade</p>
                            <WorkOrderPriorityIndicator priority={workOrder.priority} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                            <Badge variant="outline">{workOrder.work_order_category}</Badge>
                        </div>
                        {workOrder.execution && (
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Progresso</p>
                                <p className="font-medium">{workOrder.execution.progress || 0}%</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusActions()}
                    </div>
                </div>

                <Separator />

                {/* Asset Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Informações do Ativo</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Planta</p>
                                <p className="font-medium">{workOrder.asset?.plant?.name || '-'}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Área</p>
                                <p className="font-medium">{workOrder.asset?.area?.name || '-'}</p>
                            </div>
                            {workOrder.asset?.sector && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Setor</p>
                                    <p className="font-medium">{workOrder.asset.sector.name}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Ativo</p>
                                <p className="font-medium">
                                    {workOrder.asset?.tag} - {workOrder.asset?.name}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Tipo de Ativo</p>
                                <p className="font-medium">{workOrder.asset?.asset_type?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Scheduling and Assignment */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Agendamento e Atribuição</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                                <p className="font-medium">
                                    {format(new Date(workOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Prazo Solicitado</p>
                                <p className="font-medium">
                                    {workOrder.requested_due_date ?
                                        format(new Date(workOrder.requested_due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                                        '-'
                                    }
                                </p>
                            </div>
                            {workOrder.scheduled_start_date && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Início Programado</p>
                                    <p className="font-medium">
                                        {format(new Date(workOrder.scheduled_start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {workOrder.scheduled_end_date && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Fim Programado</p>
                                    <p className="font-medium">
                                        {format(new Date(workOrder.scheduled_end_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Técnico Atribuído</p>
                                <p className="font-medium">{workOrder.assigned_technician?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {workOrder.description && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Descrição</h3>
                            <p className="whitespace-pre-wrap text-sm">{workOrder.description}</p>
                        </div>
                    </>
                )}

                {/* Planning Information */}
                {workOrder.status !== 'requested' && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Informações de Planejamento</h3>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Horas Estimadas</p>
                                    <p className="font-medium">{workOrder.estimated_hours || '-'} horas</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Custo Estimado de Peças</p>
                                    <p className="font-medium">
                                        {workOrder.estimated_parts_cost ?
                                            `R$ ${Number(workOrder.estimated_parts_cost).toFixed(2).replace('.', ',')}` :
                                            '-'
                                        }
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Custo Estimado de Mão de Obra</p>
                                    <p className="font-medium">
                                        {workOrder.estimated_labor_cost ?
                                            `R$ ${Number(workOrder.estimated_labor_cost).toFixed(2).replace('.', ',')}` :
                                            '-'
                                        }
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Custo Total Estimado</p>
                                    <p className="font-medium">
                                        {workOrder.estimated_total_cost ?
                                            `R$ ${Number(workOrder.estimated_total_cost).toFixed(2).replace('.', ',')}` :
                                            '-'
                                        }
                                    </p>
                                </div>
                            </div>

                            {workOrder.downtime_required && (
                                <div className="pt-2">
                                    <Badge variant="destructive">
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Requer Parada do Equipamento
                                    </Badge>
                                </div>
                            )}

                            {workOrder.safety_requirements && workOrder.safety_requirements.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Requisitos de Segurança:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {workOrder.safety_requirements.map((req: string, index: number) => (
                                            <li key={index} className="text-sm">{req}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        ),
    });

    const executionTab = {
        id: 'execution',
        label: 'Execução',
        icon: <Play className="h-4 w-4" />,
        content: (
            <div className="space-y-6 py-6">
                {workOrder.execution ? (
                    <>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Detalhes da Execução</h3>
                            <p className="text-sm text-muted-foreground">
                                Informações sobre a execução da ordem de serviço
                            </p>
                        </div>

                        <Separator />

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Status da Execução</p>
                                <Badge variant={workOrder.execution.status === 'completed' ? 'default' : 'secondary'}>
                                    {workOrder.execution.status}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Executado por</p>
                                <p className="font-medium">{workOrder.execution.executor?.name || '-'}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Tempo de Execução</p>
                                <p className="font-medium">
                                    {workOrder.execution.execution_time_minutes} minutos
                                </p>
                            </div>
                            {workOrder.execution.started_at && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Iniciado em</p>
                                    <p className="font-medium">
                                        {format(new Date(workOrder.execution.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            )}
                            {workOrder.execution.completed_at && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Concluído em</p>
                                    <p className="font-medium">
                                        {format(new Date(workOrder.execution.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {workOrder.execution.completion_notes && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Notas de Conclusão:</p>
                                    <p className="text-sm whitespace-pre-wrap">{workOrder.execution.completion_notes}</p>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <EmptyCard
                        icon={Clock}
                        title="Ordem de serviço ainda não foi executada"
                        description="A execução desta ordem de serviço ainda não foi iniciada"
                    />
                )}
            </div>
        ),
    };

    const historyTab = {
        id: 'history',
        label: 'Histórico',
        icon: <Activity className="h-4 w-4" />,
        content: (
            <div className="space-y-6 py-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Histórico de Status</h3>
                    <p className="text-sm text-muted-foreground">
                        Registro de todas as mudanças de status da ordem de serviço
                    </p>
                </div>

                <Separator />

                {workOrder.status_history && workOrder.status_history.length > 0 ? (
                    <div className="space-y-4">
                        {workOrder.status_history.map((history: any, index: number) => (
                            <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{history.from_status || 'início'}</Badge>
                                        <span>→</span>
                                        <Badge>{history.to_status}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Por {history.changedBy?.name || 'Sistema'} em{' '}
                                        {format(new Date(history.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                    {history.reason && (
                                        <p className="text-sm mt-2">{history.reason}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyCard
                        icon={Activity}
                        title="Nenhuma mudança de status registrada"
                        description="Não há histórico de mudanças de status para esta ordem de serviço"
                    />
                )}
            </div>
        ),
    };

    const partsTab = {
        id: 'parts',
        label: 'Peças',
        icon: <Package className="h-4 w-4" />,
        content: (
            <div className="space-y-6 py-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Peças Utilizadas</h3>
                    <p className="text-sm text-muted-foreground">
                        Lista de peças e componentes utilizados na ordem de serviço
                    </p>
                </div>

                <Separator />

                {workOrder.parts && workOrder.parts.length > 0 ? (
                    <div className="space-y-4">
                        {workOrder.parts.map((part: any, index: number) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex-1">
                                    <p className="font-medium">{part.part_name}</p>
                                    {part.part_number && (
                                        <p className="text-sm text-muted-foreground">#{part.part_number}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">
                                        {part.used_quantity || part.estimated_quantity} unidades
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        R$ {Number(part.total_cost).toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyCard
                        icon={Package}
                        title="Nenhuma peça registrada"
                        description="Não há peças ou componentes registrados para esta ordem de serviço"
                    />
                )}
            </div>
        ),
    };

    // 2. Aprovação (always shown)
    console.log('[show.tsx] Adding approval tab', {
        workOrderStatus: workOrder.status,
        canApprove,
        approvalThreshold
    });
    tabs.push({
        id: 'approval',
        label: 'Aprovação',
        icon: <CheckCircle className="h-4 w-4" />,
        content: (
            <WorkOrderApprovalTab
                workOrder={workOrder}
                canApprove={canApprove}
                approvalThreshold={approvalThreshold}
                discipline={discipline}
            />
        ),
    });

    // 3. Planejamento (always shown)
    tabs.push({
        id: 'planning',
        label: 'Planejamento',
        icon: <Calendar className="h-4 w-4" />,
        content: (
            <WorkOrderPlanningTab
                workOrder={workOrder}
                technicians={technicians}
                teams={teams}
                parts={parts}
                skills={skills}
                certifications={certifications}
                canPlan={canPlan}
                discipline={discipline}
                onGoToApproval={() => {
                    // Since we can't control the active tab, we'll show an alert
                    alert('Por favor, clique na aba "Aprovação" para aprovar esta ordem de serviço.');
                }}
            />
        ),
    });

    // 4. Execução (always shown)
    tabs.push(executionTab);

    // Add failure analysis tab if it exists
    if (workOrder.failure_analysis) {
        tabs.push({
            id: 'analysis',
            label: 'Análise de Falha',
            icon: <Wrench className="h-4 w-4" />,
            content: (
                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Análise de Falha</h3>
                        <p className="text-sm text-muted-foreground">
                            Análise detalhada da falha que originou esta ordem de serviço
                        </p>
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Modo de Falha</p>
                            <p className="font-medium">{workOrder.failure_analysis.failure_mode?.name || '-'}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Causa Raiz</p>
                            <p className="font-medium">{workOrder.failure_analysis.root_cause?.name || '-'}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Causa Imediata</p>
                            <p className="font-medium">{workOrder.failure_analysis.immediate_cause?.name || '-'}</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Data da Falha</p>
                            <p className="font-medium">
                                {format(new Date(workOrder.failure_analysis.failure_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Método de Detecção</p>
                            <p className="font-medium">{workOrder.failure_analysis.detection_method}</p>
                        </div>
                    </div>

                    {workOrder.failure_analysis.immediate_action && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Ação Imediata:</p>
                                <p className="text-sm whitespace-pre-wrap">{workOrder.failure_analysis.immediate_action}</p>
                            </div>
                        </>
                    )}

                    {workOrder.failure_analysis.preventive_action && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Ação Preventiva:</p>
                                <p className="text-sm whitespace-pre-wrap">{workOrder.failure_analysis.preventive_action}</p>
                            </div>
                        </>
                    )}
                </div>
            ),
        });
    }

    // Additional tabs (Histórico and Peças)
    tabs.push(historyTab);
    tabs.push(partsTab);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ordem de Serviço ${workOrder.work_order_number}`} />

            <ShowLayout
                title={workOrder.work_order_number}
                subtitle={workOrder.title}
                editRoute={canEdit && ['requested', 'approved'].includes(workOrder.status) ? route(`${discipline}.work-orders.edit`, workOrder.id) : ''}
                tabs={tabs}
                defaultActiveTab="details"
                showEditButton={canEdit && ['requested', 'approved'].includes(workOrder.status)}
            />


        </AppLayout>
    );
} 