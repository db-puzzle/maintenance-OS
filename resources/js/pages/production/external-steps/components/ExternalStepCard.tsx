import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageZoom } from '@/components/ui/image-zoom';
import { ManufacturingStep, Item } from '@/types/production';
import { ExternalStepBadge } from '@/components/production/external-step-badge';
import { cn } from '@/lib/utils';
import {
    Factory,
    Calendar,
    Package,
    TrendingUp,
    Truck,
    AlertCircle
} from 'lucide-react';
import { formatNumber } from '@/utils/number';

interface ExternalStepCardProps {
    step: ManufacturingStep;
    onAction: (step: ManufacturingStep, action: 'ship' | 'in-process' | 'record-receipt') => void;
}

/**
 * Card component for displaying external step in grid view.
 * Shows step details, manufacturer, quantities, and action buttons.
 */
export function ExternalStepCard({ step, onAction }: ExternalStepCardProps) {
    // Get item image URL
    const getItemImageUrl = (item?: Item) => {
        if (!item) return null;
        return item.primary_image_url || item.primary_image_thumbnail_url || item.thumbnail_url;
    };

    const order = step.manufacturing_route?.manufacturing_order;
    const imageUrl = getItemImageUrl(order?.item);
    const isAwaitingShipment = step.external_status === 'awaiting_shipment';
    const isAtManufacturer = step.external_status === 'at_manufacturer';

    // Card border color based on status
    const getBorderColor = () => {
        if (isAwaitingShipment && !step.manufacturer_id) {
            return 'border-orange-500 dark:border-orange-700';
        }
        if (isAwaitingShipment) {
            return 'border-blue-500 dark:border-blue-700';
        }
        if (isAtManufacturer) {
            return 'border-green-500 dark:border-green-700';
        }
        return '';
    };

    return (
        <Card
            className={cn(
                "hover:shadow-lg transition-all duration-200 border-2",
                getBorderColor()
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{step.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            OM: {order?.order_number}
                        </p>
                        {!step.manufacturer_id && (
                            <Badge variant="outline" className="mt-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Fabricante não atribuído
                            </Badge>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                        {step.external_status && (
                            <ExternalStepBadge status={step.external_status} />
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Item info with image */}
                <div className="flex gap-3">
                    {imageUrl && (
                        <ImageZoom
                            src={imageUrl}
                            alt={order?.item?.name || ''}
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{order?.item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Quantidade: {formatNumber(order?.quantity || 0)} {order?.unit_of_measure}
                        </p>
                    </div>
                </div>

                {/* Manufacturer info */}
                <div className="flex items-start gap-2 text-sm">
                    <Factory className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <span className="text-muted-foreground">Fabricante: </span>
                        <span className="font-medium">
                            {step.manufacturer?.name || 'Não atribuído'}
                        </span>
                    </div>
                </div>

                {/* Quantity info based on status */}
                {isAwaitingShipment && (
                    <div className="flex items-start gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <span className="text-muted-foreground">Para Enviar: </span>
                            <span className="font-medium">
                                {formatNumber(step.remaining_quantity_to_ship || 0)} unidades
                            </span>
                        </div>
                    </div>
                )}

                {isAtManufacturer && (
                    <>
                        <div className="flex items-start gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <span className="text-muted-foreground">Enviado em: </span>
                                <span className="font-medium">
                                    {step.last_shipped_date
                                        ? new Date(step.last_shipped_date).toLocaleDateString('pt-BR')
                                        : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <span className="text-muted-foreground">Progresso: </span>
                                <span className="font-medium">
                                    {formatNumber(step.total_quantity_received || 0)} /{' '}
                                    {formatNumber(step.total_quantity_shipped || 0)}
                                </span>
                            </div>
                        </div>
                        {step.remaining_quantity_to_receive !== undefined &&
                            step.remaining_quantity_to_receive > 0 && (
                                <div className="bg-muted rounded-lg p-2">
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">
                                            Aguardando recebimento:
                                        </span>{' '}
                                        <span className="font-medium">
                                            {formatNumber(step.remaining_quantity_to_receive)} unidades
                                        </span>
                                    </p>
                                </div>
                            )}
                    </>
                )}

                {/* Lead time if available */}
                {step.expected_lead_time_days && (
                    <div className="text-sm text-muted-foreground">
                        Lead Time: {step.expected_lead_time_days} dias
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                    {isAwaitingShipment && (
                        <Button
                            onClick={() => onAction(step, 'ship')}
                            disabled={!step.manufacturer_id}
                            size="sm"
                            className="w-full"
                        >
                            <Truck className="h-4 w-4 mr-2" />
                            Marcar como Enviado
                        </Button>
                    )}

                    {isAtManufacturer && (
                        <>
                            <Button
                                onClick={() => onAction(step, 'record-receipt')}
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Registrar Recebimento Direto
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Normalmente, use o Módulo de Logística
                            </p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

