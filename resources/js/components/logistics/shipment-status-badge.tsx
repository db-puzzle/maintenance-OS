import { Badge } from '@/components/ui/badge';
import { ShipmentStatus } from '@/types/logistics';
import { SHIPMENT_STATUSES } from '@/constants/logistics';
import { cn } from '@/lib/utils';

interface ShipmentStatusBadgeProps {
    status: ShipmentStatus;
    className?: string;
}

/**
 * Badge component for displaying shipment status.
 *
 * Shows the current status of a shipment in the logistics workflow
 * (planned, packed, shipped, in_transit, delivered, received).
 */
export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
    const statusConfig = SHIPMENT_STATUSES[status];
    
    return (
        <Badge
            className={cn(
                statusConfig.color,
                className
            )}
        >
            {statusConfig.label}
        </Badge>
    );
}

