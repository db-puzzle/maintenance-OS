import { Badge } from '@/components/ui/badge';
import { ManufacturingStep } from '@/types/production';

interface StepStatusBadgeProps {
    status: ManufacturingStep['status'];
    className?: string;
}

const statusConfig = {
    pending: { label: 'Pendente', variant: 'outline' as const },
    queued: { label: 'Na Fila', variant: 'secondary' as const },
    in_progress: { label: 'Em Progresso', variant: 'default' as const },
    on_hold: { label: 'Em Espera', variant: 'destructive' as const },
    completed: { label: 'Concluído', variant: 'default' as const },
    skipped: { label: 'Pulado', variant: 'secondary' as const },
};

export function StepStatusBadge({ status, className }: StepStatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
} 