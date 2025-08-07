import React from 'react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface Props {
    workOrder: any;
}
export default function WorkOrderFailureAnalysisTab({ workOrder }: Props) {
    if (!workOrder.failure_analysis) {
        return null;
    }
    return (
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
    );
} 