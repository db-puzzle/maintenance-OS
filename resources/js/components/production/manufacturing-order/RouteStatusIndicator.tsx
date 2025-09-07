import React from 'react';
import {
    List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RouteStatus } from './types';

interface RouteStatusIndicatorProps {
    status?: RouteStatus;
    className?: string;
}

export function RouteStatusIndicator({ status: _status, className }: RouteStatusIndicatorProps) {
    // Always show the list icon, regardless of status
    return (
        <List className={cn("h-4 w-4 text-gray-600", className)} />
    );
}
