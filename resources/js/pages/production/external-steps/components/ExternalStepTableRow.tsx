import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ManufacturingStep } from '@/types/production';
import { ExternalStepBadge } from '@/components/production/external-step-badge';
import { Truck, Package, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/utils/number';
import { TableCell, TableRow } from '@/components/ui/table';

interface ExternalStepTableRowProps {
    step: ManufacturingStep;
    onAction: (step: ManufacturingStep, action: 'ship' | 'in-process' | 'record-receipt') => void;
}

/**
 * Table row component for displaying external step in table view.
 * Shows step details in a compact tabular format.
 */
export function ExternalStepTableRow({ step, onAction }: ExternalStepTableRowProps) {
    const order = step.manufacturing_route?.manufacturing_order;
    const isAwaitingShipment = step.external_status === 'awaiting_shipment';
    const isAtManufacturer = step.external_status === 'at_manufacturer';

    return (
        <TableRow>
            {/* Step Name */}
            <TableCell>
                <div className="font-medium">{step.name}</div>
                <div className="text-sm text-muted-foreground">
                    Etapa {step.display_position || step.id}
                </div>
            </TableCell>

            {/* Order Number & Item */}
            <TableCell>
                <div className="font-medium">{order?.order_number}</div>
                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {order?.item?.name}
                </div>
            </TableCell>

            {/* Manufacturer */}
            <TableCell>
                <div className="flex items-center gap-2">
                    {step.manufacturer?.name || (
                        <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Não atribuído
                        </Badge>
                    )}
                </div>
            </TableCell>

            {/* Status */}
            <TableCell>
                {step.external_status && (
                    <ExternalStepBadge status={step.external_status} />
                )}
            </TableCell>

            {/* Quantity Info */}
            <TableCell>
                {isAwaitingShipment && (
                    <div className="text-sm">
                        <div className="font-medium">
                            {formatNumber(step.remaining_quantity_to_ship || 0)}
                        </div>
                        <div className="text-muted-foreground">para enviar</div>
                    </div>
                )}
                {isAtManufacturer && (
                    <div className="text-sm">
                        <div className="font-medium">
                            {formatNumber(step.total_quantity_received || 0)} /{' '}
                            {formatNumber(step.total_quantity_shipped || 0)}
                        </div>
                        <div className="text-muted-foreground">recebido / enviado</div>
                    </div>
                )}
            </TableCell>

            {/* Lead Time / Dates */}
            <TableCell>
                {isAwaitingShipment && step.expected_lead_time_days && (
                    <div className="text-sm">
                        {step.expected_lead_time_days} dias
                    </div>
                )}
                {isAtManufacturer && step.last_shipped_date && (
                    <div className="text-sm">
                        {new Date(step.last_shipped_date).toLocaleDateString('pt-BR')}
                    </div>
                )}
            </TableCell>

            {/* Actions */}
            <TableCell>
                <div className="flex gap-2">
                    {isAwaitingShipment && (
                        <Button
                            onClick={() => onAction(step, 'ship')}
                            disabled={!step.manufacturer_id}
                            size="sm"
                            variant="outline"
                        >
                            <Truck className="h-4 w-4 mr-1" />
                            Enviar
                        </Button>
                    )}

                    {isAtManufacturer && (
                        <Button
                            onClick={() => onAction(step, 'record-receipt')}
                            size="sm"
                            variant="outline"
                        >
                            <Package className="h-4 w-4 mr-1" />
                            Receber
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

