/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * 
 * The work order approval functionality has been refactored into a modal component.
 * Please use the WorkOrderApprovalDialog component instead, which is integrated
 * into the work order show page.
 * 
 * Migration guide:
 * 1. Remove any routes pointing to this page
 * 2. Update any links to use the modal on the show page instead
 * 3. Use WorkOrderApprovalDialog component from '@/components/work-orders'
 * 
 * This file will be removed after all references have been updated.
 */

import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    Wrench,
    DollarSign,
    AlertTriangle,
    Shield
} from 'lucide-react';
import { WorkOrder, PRIORITY_CONFIG } from '@/types/work-order';
import { cn } from '@/lib/utils';
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PageProps {
    workOrder: WorkOrder;
    canApprove: boolean;
    approvalThreshold: {
        maxCost: number;
        maxPriority: string;
    };
}

// Helper functions
const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export default function WorkOrderApproval({ workOrder, canApprove, approvalThreshold }: PageProps) {
    const { auth } = usePage().props as any;
    const [decision, setDecision] = useState<'approve' | 'reject' | 'request_info' | ''>('');

    const { data, setData, post, processing, errors } = useForm({
        decision: '',
        notes: '',
        rejection_reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (decision === 'approve') {
            post(route('work-orders.approve', workOrder.id));
        } else if (decision === 'reject') {
            if (!data.rejection_reason) {
                return;
            }
            post(route('work-orders.reject', workOrder.id));
        } else if (decision === 'request_info') {
            // This would need a new endpoint for requesting more information
            post(route('work-orders.request-info', workOrder.id));
        }
    };

    // Calculate if work order exceeds approval threshold
    const exceedsThreshold = (workOrder.estimated_total_cost || 0) > approvalThreshold.maxCost ||
        (PRIORITY_CONFIG[workOrder.priority as keyof typeof PRIORITY_CONFIG]?.score || 0) >
        (PRIORITY_CONFIG[approvalThreshold.maxPriority as keyof typeof PRIORITY_CONFIG]?.score || 0);

    return (
        <AppLayout>
            <Head title={`Aprovar OS ${workOrder.work_order_number}`} />

            <div className="container mx-auto py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Aprovação de Ordem de Serviço</h1>
                        <p className="text-muted-foreground">
                            {workOrder.work_order_number} - {workOrder.title}
                        </p>
                    </div>
                    <WorkOrderStatusBadge status={workOrder.status} />
                </div>

                {/* Approval Threshold Warning */}
                {exceedsThreshold && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            Esta ordem de serviço excede seu limite de aprovação.
                            Será necessária aprovação de um supervisor com maior autoridade.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Request Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes da Solicitação</CardTitle>
                        <CardDescription>
                            Informações sobre a ordem de serviço solicitada
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Wrench className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Tipo:</span>
                                    <span>{workOrder.type?.name || workOrder.work_order_category}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Prioridade:</span>
                                    <WorkOrderPriorityIndicator priority={workOrder.priority} />
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Solicitado por:</span>
                                    <span>{workOrder.requester?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Solicitado em:</span>
                                    <span>{formatDate(workOrder.requested_at)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Data Solicitada:</span>
                                    <span>{formatDate(workOrder.requested_due_date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">SLA:</span>
                                    <span>{workOrder.type?.sla_hours || 'N/A'} horas</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Garantia:</span>
                                    <span>{workOrder.warranty_claim ? 'Sim' : 'Não'}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Asset Information */}
                        <div>
                            <h4 className="font-medium mb-2">Ativo</h4>
                            <div className="bg-muted p-3 rounded-md space-y-1">
                                <p className="text-sm">
                                    <span className="font-medium">Tag:</span> {workOrder.asset?.tag}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Nome:</span> {workOrder.asset?.name}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Localização:</span> {' '}
                                    {workOrder.asset?.plant?.name} / {workOrder.asset?.area?.name}
                                    {workOrder.asset?.sector && ` / ${workOrder.asset.sector.name}`}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        {workOrder.description && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-medium mb-2">Descrição</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {workOrder.description}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Initial Assessment */}
                <Card>
                    <CardHeader>
                        <CardTitle>Avaliação Inicial</CardTitle>
                        <CardDescription>
                            Impacto estimado e requisitos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Tempo de Parada:</span>
                                    <span>{workOrder.downtime_required ? 'Sim' : 'Não'}</span>
                                </div>
                                {workOrder.estimated_hours && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Horas Estimadas:</span>
                                        <span>{workOrder.estimated_hours} horas</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {workOrder.estimated_total_cost && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Custo Estimado:</span>
                                        <span className="font-bold">
                                            {formatCurrency(workOrder.estimated_total_cost)}
                                        </span>
                                    </div>
                                )}
                                {workOrder.safety_requirements && workOrder.safety_requirements.length > 0 && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <span className="font-medium">Requisitos de Segurança:</span>
                                            <ul className="list-disc list-inside mt-1">
                                                {workOrder.safety_requirements.map((req, index) => (
                                                    <li key={index} className="text-xs">{req}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Risk Assessment */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                            <div className="text-center p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">Risco de Segurança</p>
                                <Badge variant={workOrder.priority === 'emergency' ? 'destructive' : 'secondary'}>
                                    {workOrder.priority === 'emergency' ? 'Alto' : 'Médio'}
                                </Badge>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">Impacto Ambiental</p>
                                <Badge variant="secondary">Baixo</Badge>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium mb-1">Impacto na Produção</p>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        workOrder.downtime_required && "bg-yellow-100 text-yellow-800"
                                    )}
                                >
                                    {workOrder.downtime_required ? 'Com Parada' : 'Sem Parada'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Approval Decision */}
                {canApprove && !exceedsThreshold && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Decisão de Aprovação</CardTitle>
                            <CardDescription>
                                Selecione sua decisão e adicione comentários se necessário
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <RadioGroup
                                    value={decision}
                                    onValueChange={(value: any) => {
                                        setDecision(value);
                                        setData('decision', value);
                                    }}
                                >
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="approve" id="approve" />
                                        <Label htmlFor="approve" className="cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span>Aprovar - Prosseguir para planejamento</span>
                                            </div>
                                        </Label>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="reject" id="reject" />
                                        <Label htmlFor="reject" className="cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                                <span>Rejeitar - Não justificado</span>
                                            </div>
                                        </Label>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="request_info" id="request_info" />
                                        <Label htmlFor="request_info" className="cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                <span>Solicitar Mais Informações</span>
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {decision === 'reject' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="rejection_reason">
                                            Motivo da Rejeição <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="rejection_reason"
                                            placeholder="Explique o motivo da rejeição..."
                                            value={data.rejection_reason}
                                            onChange={(e) => setData('rejection_reason', e.target.value)}
                                            className={errors.rejection_reason ? 'border-red-500' : ''}
                                            required
                                        />
                                        {errors.rejection_reason && (
                                            <p className="text-sm text-red-500">{errors.rejection_reason}</p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Comentários</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Adicione comentários sobre sua decisão..."
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.history.back()}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!decision || processing}
                                        variant={decision === 'reject' ? 'destructive' : 'default'}
                                    >
                                        {processing ? 'Processando...' : 'Confirmar Decisão'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Not Authorized Message */}
                {(!canApprove || exceedsThreshold) && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Você não tem permissão para aprovar esta ordem de serviço.
                            {exceedsThreshold && ' Esta ordem excede seu limite de aprovação.'}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
} 