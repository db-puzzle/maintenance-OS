import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Pause, AlertCircle, Lock, XCircle } from 'lucide-react';

interface Props {
    status: string;
    size?: 'sm' | 'default';
}

export function StepStatusBadge({ status, size = 'default' }: Props) {
    const getStatusConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending',
                    icon: Lock,
                    variant: 'secondary' as const,
                    className: 'text-muted-foreground'
                };
            case 'queued':
                return {
                    label: 'Ready',
                    icon: Clock,
                    variant: 'default' as const,
                    className: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'
                };
            case 'in_progress':
                return {
                    label: 'In Progress',
                    icon: Activity,
                    variant: 'default' as const,
                    className: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200 animate-pulse'
                };
            case 'on_hold':
                return {
                    label: 'On Hold',
                    icon: Pause,
                    variant: 'default' as const,
                    className: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    icon: CheckCircle,
                    variant: 'default' as const,
                    className: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
                };
            case 'failed':
                return {
                    label: 'Failed',
                    icon: XCircle,
                    variant: 'destructive' as const,
                    className: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                };
            case 'skipped':
                return {
                    label: 'Skipped',
                    icon: AlertCircle,
                    variant: 'outline' as const,
                    className: 'text-gray-500'
                };
            default:
                return {
                    label: status,
                    icon: AlertCircle,
                    variant: 'outline' as const,
                    className: ''
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <Badge
            variant={config.variant}
            className={cn(
                'gap-1',
                size === 'sm' && 'text-xs px-2 py-0',
                config.className
            )}
        >
            <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
            {config.label}
        </Badge>
    );
}

// Missing import fix
interface Activity {
    className?: string;
}

const Activity: React.FC<Activity> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);