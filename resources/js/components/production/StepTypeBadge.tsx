import { Badge } from '@/components/ui/badge';
import { ManufacturingStep } from '@/types/production';

interface StepTypeBadgeProps {
    type: ManufacturingStep['step_type'];
    className?: string;
}

const typeConfig = {
    standard: { label: 'Padrão', variant: 'default' as const },
    quality_check: { label: 'Checagem de Qualidade', variant: 'secondary' as const },
    rework: { label: 'Retrabalho', variant: 'outline' as const },
};

export function StepTypeBadge({ type, className }: StepTypeBadgeProps) {
    const config = typeConfig[type];

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
} 