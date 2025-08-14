import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MOStatusBadgeProps {
    status: string;
    className?: string;
}

export function MOStatusBadge({ status, className }: MOStatusBadgeProps) {
    const getStatusConfig = (status: string) => {
        const configs = {
            draft: {
                label: 'Draft',
                className: 'bg-gray-50/30 text-gray-800 hover:bg-gray-50/50 border-gray-200'
            },
            planned: {
                label: 'Planned',
                className: 'bg-blue-50/30 text-blue-600 hover:bg-blue-50/50 border-blue-200'
            },
            released: {
                label: 'Released',
                className: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
            },
            in_progress: {
                label: 'In Progress',
                className: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'
            },
            on_hold: {
                label: 'On Hold',
                className: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200'
            },
            completed: {
                label: 'Completed',
                className: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
            },
            cancelled: {
                label: 'Cancelled',
                className: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
            }
        };

        return configs[status as keyof typeof configs] || {
            label: status,
            className: 'bg-gray-100 text-gray-800'
        };
    };

    const config = getStatusConfig(status);

    return (
        <Badge
            variant="secondary"
            className={cn(config.className, className)}
        >
            {config.label}
        </Badge>
    );
}
