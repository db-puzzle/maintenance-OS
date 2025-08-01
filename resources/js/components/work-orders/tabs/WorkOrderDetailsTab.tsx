import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WorkOrderStatusBadge } from '../WorkOrderStatusBadge';
import { WorkOrderPriorityIndicator } from '../WorkOrderPriorityIndicator';
import { Button } from '@/components/ui/button';
import {
    Edit,
    Play,
    Calendar,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from '@inertiajs/react';

interface Props {
    workOrder: any;
    discipline: 'maintenance' | 'quality';
    canEdit: boolean;
    canApprove: boolean;
    canPlan: boolean;
    canExecute: boolean;
    canValidate: boolean;
}

export default function WorkOrderDetailsTab({
    workOrder,
    discipline,
    canEdit,
    canApprove,
    canPlan,
    canExecute,
    canValidate
}: Props) {
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

        // Planning is now done through the Planning tab, not a separate page

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

        if (canEdit && workOrder.status === 'requested') {
            actions.push(
                <Button key="edit" variant="outline" onClick={() => router.visit(route(`${discipline}.work-orders.edit`, workOrder.id))}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            );
        }

        return actions;
    };

    return (
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
                        <WorkOrderPriorityIndicator priorityScore={workOrder.priority_score || 50} />
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

                        {workOrder.other_requirements && workOrder.other_requirements.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Outros Requisitos:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {workOrder.other_requirements.map((req: string, index: number) => (
                                        <li key={index} className="text-sm">{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
} 