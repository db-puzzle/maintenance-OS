import React from 'react';
import { WorkOrder } from '@/types/work-order';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import EmptyCard from '@/components/ui/empty-card';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface Props {
    workOrder: WorkOrder;
}
export default function WorkOrderExecutionTab({ workOrder }: Props) {
    return (
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
    );
} 