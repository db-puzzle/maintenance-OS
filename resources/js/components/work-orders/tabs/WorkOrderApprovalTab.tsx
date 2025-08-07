import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import StateButton from '@/components/StateButton';
import {
    AlertCircle,
    CheckCircle,
    XCircle,
    User,
    Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface WorkOrderApprovalTabProps {
    workOrder: any;
    canApprove: boolean;
    approvalThreshold?: {
        maxCost: number;
        maxPriority: string;
    };
    discipline: 'maintenance' | 'quality';
}
export function WorkOrderApprovalTab({
    workOrder,
    canApprove,
    approvalThreshold,
    discipline
}: WorkOrderApprovalTabProps) {
    const [decision, setDecision] = useState('');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const isApproved = workOrder.status !== 'requested';
    // Find the most recent approval or rejection entry (could be multiple)
    const approvalEntries = workOrder.status_history?.filter((entry: any) =>
        entry.from_status === 'requested' && (entry.to_status === 'approved' || entry.to_status === 'rejected')
    ) || [];
    // Get the most recent one (last in the array since they should be ordered by created_at)
    const approvalEntry = approvalEntries.length > 0 ? approvalEntries[approvalEntries.length - 1] : null;
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isApproved || !decision) return;
        // Validate that rejection has a reason
        if (decision === 'reject' && !reason.trim()) {
            alert('Por favor, forneça uma razão para a rejeição.');
            return;
        }
        setProcessing(true);
        const data = {
            decision,
            reason: reason.trim(),
            // For backward compatibility with the backend
            notes: decision === 'approve' ? reason.trim() : undefined,
            rejection_reason: decision === 'reject' ? reason.trim() : undefined
        };
        let url = '';
        if (decision === 'approve') {
            url = route(`${discipline}.work-orders.approve.store`, workOrder.id);
        } else if (decision === 'reject') {
            url = route(`${discipline}.work-orders.reject`, workOrder.id);
        }
        if (url) {
            router.post(url, data, {
                onFinish: () => setProcessing(false)
            });
        }
    };
    return (
        <div className="space-y-6 py-6">
            {isApproved && approvalEntry ? (
                <>
                    {/* Approval/Rejection Status Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            {approvalEntry.to_status === 'approved' ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <h3 className="text-lg font-semibold">Ordem de Serviço Aprovada</h3>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <h3 className="text-lg font-semibold">Ordem de Serviço Rejeitada</h3>
                                </>
                            )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{approvalEntry.to_status === 'approved' ? 'Aprovado por' : 'Rejeitado por'}</Label>
                                <div className="rounded-md border bg-muted/20 p-2 text-sm flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{approvalEntry.changed_by?.name || approvalEntry.user?.name || 'Sistema'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Data da {approvalEntry.to_status === 'approved' ? 'aprovação' : 'rejeição'}</Label>
                                <div className="rounded-md border bg-muted/20 p-2 text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {format(new Date(approvalEntry.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Razão da {approvalEntry.to_status === 'approved' ? 'aprovação' : 'rejeição'}</Label>
                            <div className="rounded-md border bg-muted/20 p-3 text-sm min-h-[100px] flex items-start">
                                {approvalEntry.reason || (
                                    <span className="text-muted-foreground italic">
                                        Nenhuma razão fornecida
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : isApproved ? (
                <>
                    {/* Other Status Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Status da Aprovação</h3>
                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                            Esta ordem de serviço já foi processada e está com status: <Badge variant="outline">{workOrder.status}</Badge>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Approval Decision Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Decisão de Aprovação</h3>
                        {!canApprove ? (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Você não tem permissão para aprovar esta ordem de serviço.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                <Separator />
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Decision Buttons */}
                                    <div className="space-y-2">
                                        <Label>Selecione sua decisão</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <StateButton
                                                icon={CheckCircle}
                                                title="Aprovar"
                                                description="Autorizar a execução desta ordem de serviço"
                                                selected={decision === 'approve'}
                                                onClick={() => setDecision('approve')}
                                                variant="green"
                                            />
                                            <StateButton
                                                icon={XCircle}
                                                title="Rejeitar"
                                                description="Recusar a execução desta ordem de serviço"
                                                selected={decision === 'reject'}
                                                onClick={() => setDecision('reject')}
                                                variant="red"
                                            />
                                        </div>
                                    </div>
                                    {/* Reason */}
                                    <div className="space-y-2">
                                        <Label htmlFor="reason">
                                            Razão
                                            {decision === 'reject' && <span className="text-red-500"> *</span>}
                                        </Label>
                                        <Textarea
                                            id="reason"
                                            placeholder={
                                                decision === 'reject'
                                                    ? "Explique a razão da rejeição (obrigatório)..."
                                                    : "Adicione uma razão para sua decisão (opcional)..."
                                            }
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={4}
                                            required={decision === 'reject'}
                                        />
                                        {decision === 'reject' && !reason.trim() && (
                                            <p className="text-sm text-red-500">A razão da rejeição é obrigatória</p>
                                        )}
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            disabled={!decision || processing || (decision === 'reject' && !reason.trim())}
                                            variant={decision === 'reject' ? 'destructive' : 'default'}
                                        >
                                            {processing ? 'Processando...' : 'Confirmar Decisão'}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
} 