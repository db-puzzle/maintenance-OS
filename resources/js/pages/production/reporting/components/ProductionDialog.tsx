import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { MOStepExecutionDialog } from './MOStepExecutionDialog';
import { SimpleProductionDialog } from './SimpleProductionDialog';

interface ProductionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: (action: string, order: ManufacturingOrder) => void;
    canUpdate?: boolean;
}

/**
 * Unified production dialog that routes to the appropriate dialog type
 * based on whether the manufacturing order has a route or not.
 */
export function ProductionDialog(props: ProductionDialogProps) {
    if (!props.order) {
        return null;
    }

    // If order has a route, use the step execution dialog
    if (props.order.has_route) {
        return <MOStepExecutionDialog {...props} />;
    }

    // Otherwise, use the simple production dialog
    return <SimpleProductionDialog {...props} />;
}
