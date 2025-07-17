import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import EmptyCard from '@/components/ui/empty-card';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
    workOrder: any;
}

export default function WorkOrderHistoryTab({ workOrder }: Props) {
    return (
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
    );
} 