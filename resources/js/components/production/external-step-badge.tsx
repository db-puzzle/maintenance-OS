import { Badge } from '@/components/ui/badge';
import { ExternalStatus } from '@/types/production';
import { EXTERNAL_STATUSES, EXTERNAL_STATUS_COLORS } from '@/constants/production';
import { cn } from '@/lib/utils';

interface ExternalStepBadgeProps {
    status: ExternalStatus;
    className?: string;
}

/**
 * Badge component for displaying external step status.
 *
 * Shows the current status of a step at an external manufacturer
 * (awaiting_shipment, shipped, in_process).
 */
export function ExternalStepBadge({ status, className }: ExternalStepBadgeProps) {
    return (
        <Badge
            className={cn(
                EXTERNAL_STATUS_COLORS[status],
                className
            )}
        >
            {EXTERNAL_STATUSES[status]}
        </Badge>
    );
}

