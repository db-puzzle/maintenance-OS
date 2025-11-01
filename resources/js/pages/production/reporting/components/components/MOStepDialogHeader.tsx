import React from 'react';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/utils/number';

interface MOStepDialogHeaderProps {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep | null;
}

export function MOStepDialogHeader({ order, currentStep }: MOStepDialogHeaderProps) {
    return (
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
            <div className="flex items-start justify-between">
                <div>
                    <DialogTitle className="text-2xl font-semibold">{order.order_number}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Manufacturing order step execution dialog
                    </DialogDescription>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">
                            {order.item?.name || 'Unknown Item'} · Qty: {formatNumber(order.quantity)}
                        </span>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                        {currentStep?.work_cell?.name || 'No work cell assigned'}
                    </div>
                </div>
            </div>
        </DialogHeader>
    );
}
