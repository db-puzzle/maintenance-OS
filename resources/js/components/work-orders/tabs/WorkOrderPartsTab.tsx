import React from 'react';
import { Separator } from '@/components/ui/separator';
import EmptyCard from '@/components/ui/empty-card';
import { Package } from 'lucide-react';

interface Props {
    workOrder: any;
}

export default function WorkOrderPartsTab({ workOrder }: Props) {
    return (
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
    );
} 