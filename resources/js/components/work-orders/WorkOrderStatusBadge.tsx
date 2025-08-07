import { Badge } from '@/components/ui/badge';
import { WorkOrderStatus, STATUS_CONFIG } from '@/types/work-order';
import { cn } from '@/lib/utils';
interface WorkOrderStatusBadgeProps {
    status: WorkOrderStatus;
    className?: string;
}
const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    gray: 'secondary',
    blue: 'default',
    red: 'destructive',
    indigo: 'default',
    purple: 'default',
    violet: 'default',
    yellow: 'outline',
    orange: 'outline',
    green: 'default',
    emerald: 'default',
};
export function WorkOrderStatusBadge({ status, className }: WorkOrderStatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    if (!config) {
        return <Badge variant="outline" className={className}>{status}</Badge>;
    }
    const variant = variantMap[config.color] || 'default';
    // Custom color classes based on the status
    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        red: 'bg-red-100 text-red-800 hover:bg-red-200',
        indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
        purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
        violet: 'bg-violet-100 text-violet-800 hover:bg-violet-200',
        yellow: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300',
        orange: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300',
        green: 'bg-green-100 text-green-800 hover:bg-green-200',
        emerald: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    };
    return (
        <Badge
            variant={variant}
            className={cn(
                colorClasses[config.color],
                'font-medium',
                className
            )}
        >
            {config.label}
        </Badge>
    );
} 