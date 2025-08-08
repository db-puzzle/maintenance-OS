import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
interface WorkOrderApprovalFormProps {
    workOrderId: number;
    discipline: 'maintenance' | 'quality';
    canApprove: boolean;
    onDecisionChange: (decision: string) => void;
}
export function WorkOrderApprovalForm({
    workOrderId,
    discipline,
    canApprove,
    onDecisionChange
}: WorkOrderApprovalFormProps) {
    const [decision, setDecision] = React.useState<'approve' | 'reject' | 'request_info' | ''>('');
    const { data, setData, post, processing, errors } = useForm({
        decision: '',
        notes: '',
        rejection_reason: '',
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (decision === 'approve') {
            post(route(`${discipline}.work-orders.approve.store`, workOrderId));
        } else if (decision === 'reject') {
            post(route(`${discipline}.work-orders.reject`, workOrderId));
        } else if (decision === 'request_info') {
            post(route(`${discipline}.work-orders.request-info`, workOrderId));
        }
    };
    const handleDecisionChange = (value: string) => {
        setDecision(value as 'approve' | 'reject' | 'request_info' | '');
        setData('decision', value);
        onDecisionChange(value);
    };
    return (
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
                        onValueChange={handleDecisionChange}
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
                            type="submit"
                            disabled={!decision || processing || !canApprove}
                            variant={decision === 'reject' ? 'destructive' : 'default'}
                        >
                            {processing ? 'Processando...' : 'Confirmar Decisão'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
} 