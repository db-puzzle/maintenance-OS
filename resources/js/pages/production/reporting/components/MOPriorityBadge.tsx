import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface MOPriorityBadgeProps {
    priority: number;
    className?: string;
}

export function MOPriorityBadge({ priority, className }: MOPriorityBadgeProps) {
    const getPriorityConfig = (priority: number) => {
        if (priority >= 80) {
            return {
                label: 'High',
                icon: AlertCircle,
                className: 'bg-red-100 text-red-800 hover:bg-red-200'
            };
        } else if (priority >= 40) {
            return {
                label: 'Medium',
                icon: AlertTriangle,
                className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            };
        } else {
            return {
                label: 'Low',
                icon: Info,
                className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            };
        }
    };

    const config = getPriorityConfig(priority);
    const Icon = config.icon;

    return (
        <Badge
            variant="secondary"
            className={cn(config.className, 'flex items-center gap-1', className)}
        >
            <Icon className="w-3 h-3" />
            {config.label} ({priority})
        </Badge>
    );
}
