import React from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RouteStatus } from './types';

interface RouteStatusIndicatorProps {
    status: RouteStatus;
    className?: string;
}

export function RouteStatusIndicator({ status, className }: RouteStatusIndicatorProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'complete': return CheckCircle2;
            case 'in-progress': return Clock;
            case 'no-route': return AlertCircle;
            case 'empty': return FileText;
            default: return Route;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'complete': return 'text-green-600';
            case 'in-progress': return 'text-yellow-600';
            case 'no-route': return 'text-red-600';
            case 'empty': return 'text-orange-600';
            default: return 'text-gray-600';
        }
    };

    const StatusIcon = getStatusIcon();

    return (
        <StatusIcon className={cn("h-4 w-4", getStatusColor(), className)} />
    );
}
