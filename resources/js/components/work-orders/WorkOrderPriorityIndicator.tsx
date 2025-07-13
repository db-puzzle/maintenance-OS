import { AlertCircle, AlertTriangle, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { PRIORITY_CONFIG } from '@/types/work-order';
import { cn } from '@/lib/utils';

type Priority = 'emergency' | 'urgent' | 'high' | 'normal' | 'low';

interface WorkOrderPriorityIndicatorProps {
    priority: Priority;
    showLabel?: boolean;
    className?: string;
}

const iconMap = {
    emergency: AlertCircle,
    urgent: AlertTriangle,
    high: ChevronUp,
    normal: Minus,
    low: ChevronDown,
};

const colorMap: Record<string, string> = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600',
};

export function WorkOrderPriorityIndicator({
    priority,
    showLabel = true,
    className
}: WorkOrderPriorityIndicatorProps) {
    const config = PRIORITY_CONFIG[priority];

    if (!config) {
        return null;
    }

    const Icon = iconMap[priority];
    const colorClass = colorMap[config.color] || 'text-gray-600';

    return (
        <div className={cn('flex items-center gap-1', colorClass, className)}>
            <Icon className="h-4 w-4" />
            {showLabel && (
                <span className="text-sm font-medium">{config.label}</span>
            )}
        </div>
    );
} 