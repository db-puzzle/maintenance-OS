import { AlertCircle, AlertTriangle, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
interface WorkOrderPriorityIndicatorProps {
    priorityScore: number;
    showLabel?: boolean;
    showScore?: boolean;
    className?: string;
}
// Map priority score ranges to visual indicators
const getPriorityConfig = (score: number) => {
    if (score >= 90) {
        return {
            label: 'Emergência',
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-300',
            icon: AlertCircle
        };
    } else if (score >= 70) {
        return {
            label: 'Urgente',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            borderColor: 'border-orange-300',
            icon: AlertTriangle
        };
    } else if (score >= 50) {
        return {
            label: 'Alta',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            borderColor: 'border-yellow-300',
            icon: ChevronUp
        };
    } else if (score >= 30) {
        return {
            label: 'Normal',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            borderColor: 'border-blue-300',
            icon: Minus
        };
    } else {
        return {
            label: 'Baixa',
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-300',
            icon: ChevronDown
        };
    }
};
export function WorkOrderPriorityIndicator({
    priorityScore,
    showLabel = true,
    showScore = false,
    className
}: WorkOrderPriorityIndicatorProps) {
    const config = getPriorityConfig(priorityScore);
    const Icon = config.icon;
    return (
        <div className={cn('flex items-center gap-1', config.color, className)}>
            <Icon className="h-4 w-4" />
            {showLabel && (
                <span className="text-sm font-medium">{config.label}</span>
            )}
            {showScore && (
                <span className="text-xs text-muted-foreground">({priorityScore})</span>
            )}
        </div>
    );
} 