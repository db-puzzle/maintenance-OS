import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WorkOrder, PRIORITY_CONFIG } from '@/types/work-order';

interface WorkOrderApprovalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrder: WorkOrder;
    canApprove: boolean;
    approvalThreshold?: {
        maxCost: number;
        maxPriority: string;
    };
    discipline: 'maintenance' | 'quality';
}

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

export function WorkOrderApprovalDialog({
    open,
    onOpenChange,
    workOrder,
    canApprove,
    approvalThreshold = { maxCost: 50000, maxPriority: 'high' },
    discipline
}: WorkOrderApprovalDialogProps) {
    const [decision, setDecision] = useState<'approve' | 'reject' | 'request_info' | ''>('');

    const { data, setData, post, processing, errors, reset } = useForm({
        decision: '',
        notes: '',
        rejection_reason: '',
    });

    // Calculate if work order exceeds approval threshold
    const exceedsThreshold = (workOrder.estimated_total_cost || 0) > approvalThreshold.maxCost ||
        (PRIORITY_CONFIG[workOrder.priority as keyof typeof PRIORITY_CONFIG]?.score || 0) >
        (PRIORITY_CONFIG[approvalThreshold.maxPriority as keyof typeof PRIORITY_CONFIG]?.score || 0);

    const handleSubmit = () => {
        if (!decision) return;

        if (decision === 'reject' && !data.rejection_reason) {
            return;
        }

        const endpoint = decision === 'approve'
            ? route(`${discipline}.work-orders.approve`, workOrder.id)
            : decision === 'reject'
                ? route(`${discipline}.work-orders.reject`, workOrder.id)
                : route(`${discipline}.work-orders.request-info`, workOrder.id);

        post(endpoint, {
            onSuccess: () => {
                toast.success(
                    decision === 'approve'
                        ? 'Ordem de serviço aprovada com sucesso!'
                        : decision === 'reject'
                            ? 'Ordem de serviço rejeitada.'
                            : 'Solicitação de informações enviada.'
                );
                handleClose();
            },
            onError: () => {
                toast.error('Erro ao processar decisão.');
            },
        });
    };

    const handleClose = () => {
        setDecision('');
        reset();
        onOpenChange(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleClose();
        } else {
            onOpenChange(true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>Aprovação de Ordem de Serviço</DialogTitle>
                <DialogDescription>
                    {workOrder.work_order_number} - {workOrder.title}
                </DialogDescription>

                <div className="space-y-4 py-4">
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
                    <div className="space-y-4">
                        <h4 className="font-medium">Detalhes da Solicitação</h4>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Tipo:</span>
                                    <span>{workOrder.type?.name || workOrder.work_order_category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Prioridade:</span>
                                    <WorkOrderPriorityIndicator priority={workOrder.priority} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Solicitado por:</span>
                                    <span>{workOrder.requester?.name || 'Sistema'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Data Solicitada:</span>
                                    <span>{formatDate(workOrder.requested_due_date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Solicitado em:</span>
                                    <span>{formatDate(workOrder.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Asset Information */}
                        <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                            <p><span className="font-medium">Ativo:</span> {workOrder.asset?.tag} - {workOrder.asset?.name}</p>
                            <p><span className="font-medium">Localização:</span> {workOrder.asset?.plant?.name} / {workOrder.asset?.area?.name}</p>
                        </div>

                        {/* Description */}
                        {workOrder.description && (
                            <div className="space-y-2">
                                <p className="font-medium text-sm">Descrição:</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {workOrder.description}
                                </p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Initial Assessment */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Avaliação Inicial</h4>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Tempo de Parada:</span>
                                    <span>{workOrder.downtime_required ? 'Sim' : 'Não'}</span>
                                </div>
                                {workOrder.estimated_hours && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Horas Estimadas:</span>
                                        <span>{workOrder.estimated_hours} horas</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {workOrder.estimated_total_cost && (
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Custo Estimado:</span>
                                        <span className="font-bold">
                                            {formatCurrency(workOrder.estimated_total_cost)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Risk Assessment */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-muted rounded-md">
                                <p className="text-xs font-medium mb-1">Risco de Segurança</p>
                                <Badge variant={workOrder.priority === 'emergency' ? 'destructive' : 'secondary'} className="text-xs">
                                    {workOrder.priority === 'emergency' ? 'Alto' : 'Médio'}
                                </Badge>
                            </div>
                            <div className="text-center p-2 bg-muted rounded-md">
                                <p className="text-xs font-medium mb-1">Impacto Ambiental</p>
                                <Badge variant="secondary" className="text-xs">Baixo</Badge>
                            </div>
                            <div className="text-center p-2 bg-muted rounded-md">
                                <p className="text-xs font-medium mb-1">Impacto na Produção</p>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs",
                                        workOrder.downtime_required && "bg-yellow-100 text-yellow-800"
                                    )}
                                >
                                    {workOrder.downtime_required ? 'Com Parada' : 'Sem Parada'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Approval Decision */}
                    {canApprove && !exceedsThreshold ? (
                        <div className="space-y-4">
                            <h4 className="font-medium">Decisão de Aprovação</h4>

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
                                        className={cn(
                                            "min-h-[80px]",
                                            errors.rejection_reason && "border-red-500"
                                        )}
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
                                    className="min-h-[60px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Você não tem permissão para aprovar esta ordem de serviço.
                                {exceedsThreshold && ' Esta ordem excede seu limite de aprovação.'}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={processing}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    {canApprove && !exceedsThreshold && (
                        <Button
                            onClick={handleSubmit}
                            disabled={!decision || (decision === 'reject' && !data.rejection_reason) || processing}
                            variant={decision === 'reject' ? 'destructive' : 'default'}
                        >
                            {processing ? 'Processando...' : 'Confirmar Decisão'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 