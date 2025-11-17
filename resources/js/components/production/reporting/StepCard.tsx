import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingDown,
} from 'lucide-react';

interface RouteStep {
    id: number;
    name: string;
    display_position?: number;
    status: string;
    work_cell: {
        id: number;
        name: string;
    } | null;
    quantity_completed: number;
    quantity_scrapped: number;
    quantity_total: number;
    rejection_rate: number;
    has_quality_issue: boolean;
    has_delay: boolean;
}

interface StepCardProps {
    step: RouteStep;
    stepNumber: number;
    totalSteps: number;
    isCurrent: boolean;
    onClick: () => void;
    className?: string;
}

/**
 * Visual card representing a single route step in the step navigator
 * Displays step status, progress, work cell, and various indicators
 */
export function StepCard({
    step,
    stepNumber,
    totalSteps: _totalSteps,
    isCurrent,
    onClick,
    className
}: StepCardProps) {
    // Calculate progress percentage
    const progressPercent = step.quantity_total > 0
        ? Math.round((step.quantity_completed / step.quantity_total) * 100)
        : 0;

    // Get status-based styling
    const getStatusStyles = () => {
        switch (step.status) {
            case 'completed':
                return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
            case 'in_progress':
                return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
            case 'queued':
                return 'border-l-gray-400 bg-background';
            case 'pending':
                return 'border-l-gray-300 bg-muted/50';
            case 'on_hold':
                return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
            case 'skipped':
                return 'border-l-gray-400 bg-muted';
            default:
                return 'border-l-gray-300 bg-muted/50';
        }
    };

    return (
        <div
            className={cn(
                "w-full max-w-sm border-l-4 rounded-lg p-2 transition-all duration-200 cursor-pointer",
                "hover:bg-accent/50",
                getStatusStyles(),
                isCurrent && "scale-105 border-2 shadow-md ring-2 ring-ring/20",
                className
            )}
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-label={`Navigate to step ${stepNumber}: ${step.name}`}
            aria-current={isCurrent ? 'step' : undefined}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Header Row - Step Number and Work Cell */}
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                    #{step.display_position || stepNumber}
                </span>
                {step.work_cell && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {step.work_cell.name}
                    </Badge>
                )}
            </div>

            {/* Step Name */}
            <div className="mb-1">
                <p className={cn(
                    "text-sm font-medium truncate",
                    step.status === 'skipped' && "line-through opacity-60"
                )}>
                    {step.name}
                </p>
            </div>

            {/* Progress Summary - Compact */}
            {step.status !== 'pending' && step.status !== 'skipped' && (
                <div className="flex items-center justify-end mb-1">
                    <span className="text-xs font-semibold text-foreground/70">{progressPercent}%</span>
                </div>
            )}

            {/* Status Indicators */}
            <div className="flex items-center gap-1.5 mt-1">
                {step.status === 'completed' && (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
                {step.status === 'in_progress' && (
                    <Clock className="h-3 w-3 text-blue-600 animate-pulse" />
                )}
                {step.has_quality_issue && (
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                )}
                {step.has_delay && (
                    <TrendingDown className="h-3 w-3 text-orange-600" />
                )}
            </div>

            {/* Current Step Indicator */}
            {isCurrent && (
                <div className="mt-1.5 pt-1.5 border-t border-border/50">
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                        Etapa Atual
                    </p>
                </div>
            )}
        </div>
    );
}

