import React, { useState } from 'react';
import { router } from '@inertiajs/react';
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
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const isApproved = workOrder.status !== 'requested';
    const approvalEntry = workOrder.status_history?.find((entry: any) =>
        entry.from_status === 'requested' && entry.to_status === 'approved'
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isApproved || !decision) return;

        setProcessing(true);
        const data = {
            decision,
            notes,
            rejection_reason: rejectionReason
        };

        let url = '';
        if (decision === 'approve') {
            url = route(`${discipline}.work-orders.approve.store`, workOrder.id);
        } else if (decision === 'reject') {
            if (!rejectionReason) {
                setProcessing(false);
                return;
            }
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Ordem de Serviço Aprovada
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>Aprovado por: <strong className="text-foreground">{approvalEntry.user?.name || 'Sistema'}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Data da aprovação: <strong className="text-foreground">
                                    {format(new Date(approvalEntry.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </strong></span>
                            </div>
                            {approvalEntry.notes && (
                                <div className="mt-4 p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-1">Observações da aprovação:</p>
                                    <p className="text-sm text-muted-foreground">{approvalEntry.notes}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : isApproved ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Status da Aprovação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Esta ordem de serviço já foi processada e está com status: <Badge variant="outline">{workOrder.status}</Badge>
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Detalhes da Solicitação</h3>
                        <p className="text-sm text-muted-foreground">
                            Informações sobre a ordem de serviço solicitada
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">Ativo:</p>
                            <p className="text-sm">{workOrder.asset?.tag} - {workOrder.asset?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Descrição:</p>
                            <p className="text-sm">{workOrder.description || 'N/A'}</p>
                        </div>
                    </div>

                    {canApprove && (
                        <>
                            <Separator />
                            <Card>
                                <CardHeader>
                                    <CardTitle>Decisão de Aprovação</CardTitle>
                                    <CardDescription>
                                        Selecione sua decisão e adicione comentários se necessário
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <RadioGroup value={decision} onValueChange={setDecision}>
                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="approve" id="approve" />
                                                <Label htmlFor="approve" className="cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span>Aprovar</span>
                                                    </div>
                                                </Label>
                                            </div>
                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="reject" id="reject" />
                                                <Label htmlFor="reject" className="cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                        <span>Rejeitar</span>
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
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Comentários</Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Adicione comentários sobre sua decisão..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2">
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
                        </>
                    )}

                    {!canApprove && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Você não tem permissão para aprovar esta ordem de serviço.
                            </AlertDescription>
                        </Alert>
                    )}
                </>
            )}
        </div>
    );
} 