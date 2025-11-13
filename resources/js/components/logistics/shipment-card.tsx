import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shipment } from '@/types/logistics';
import { ShipmentStatusBadge } from './shipment-status-badge';
import { Package, Calendar, MapPin, AlertTriangle } from 'lucide-react';

interface ShipmentCardProps {
    shipment: Shipment;
}

/**
 * Card component for displaying shipment information in lists.
 *
 * Shows shipment number, destination, status, and key details
 * with visual indicators for overdue shipments.
 */
export function ShipmentCard({ shipment }: ShipmentCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">
                            <Link
                                href={route('logistics.shipments.show', shipment.id)}
                                className="hover:underline"
                            >
                                {shipment.shipment_number}
                            </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {shipment.destination_name || (shipment.destination && 'name' in shipment.destination ? String(shipment.destination.name) : '')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {shipment.is_overdue && (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        <ShipmentStatusBadge status={shipment.status} />
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{shipment.total_items} items</span>
                    </div>

                    {shipment.planned_ship_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(shipment.planned_ship_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                    )}

                    {shipment.tracking_number && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{shipment.tracking_number}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

