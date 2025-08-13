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
                className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            },
            planned: {
                label: 'Planned',
                className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            },
            released: {
                label: 'Released',
                className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
            },
            in_progress: {
                label: 'In Progress',
                className: 'bg-green-100 text-green-800 hover:bg-green-200'
            },
            completed: {
                label: 'Completed',
                className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            },
            cancelled: {
                label: 'Cancelled',
                className: 'bg-red-100 text-red-800 hover:bg-red-200'
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
