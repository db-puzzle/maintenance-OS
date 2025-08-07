import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
// Generic types for status progress
export interface StatusStep {
    id: string;
    name: string;
    description: string;
}
export interface StatusProgressProps {
    steps: StatusStep[];
    currentStepId: string;
    onStepClick?: (stepId: string) => void;
    clickableSteps?: string[];
    className?: string;
    showBranchStatus?: boolean;
    branchStatus?: {
        type: 'rejected' | 'cancelled' | 'on_hold';
        name: string;
        description: string;
    };
}
export function StatusProgress({
    steps,
    currentStepId,
    onStepClick,
    clickableSteps = [],
    className,
    showBranchStatus = false,
    branchStatus
}: StatusProgressProps) {
    // Handle branch states (rejected, cancelled, on_hold)
    if (showBranchStatus && branchStatus) {
        return (
            <div className={cn("", className)}>
                <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 border-2 border-red-300">
                        <span className="text-red-600 font-medium text-lg">!</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-red-800">{branchStatus.name}</h3>
                        <p className="text-sm text-red-600 mt-1">{branchStatus.description}</p>
                    </div>
                </div>
            </div>
        );
    }
    // Find current step index
    const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
    // If status not found in main flow, don't render
    if (currentStepIndex === -1) {
        return null;
    }
    const handleStepClick = (stepId: string) => {
        if (clickableSteps.includes(stepId) && onStepClick) {
            onStepClick(stepId);
        }
    };
    return (
        <div className={cn("", className)}>
            <nav aria-label="Progress">
                <ol role="list" className="overflow-hidden">
                    {steps.map((step, stepIdx) => {
                        // Forward the display by one: show completed steps and next step as current
                        const isComplete = stepIdx <= currentStepIndex;
                        const isCurrent = stepIdx === currentStepIndex + 1;
                        const isClickable = clickableSteps.includes(step.id);
                        let stepStatus: 'complete' | 'current' | 'upcoming';
                        if (isComplete) stepStatus = 'complete';
                        else if (isCurrent) stepStatus = 'current';
                        else stepStatus = 'upcoming';
                        return (
                            <li
                                key={step.id}
                                className={cn(
                                    stepIdx !== steps.length - 1 ? 'pb-10' : '',
                                    'relative'
                                )}
                            >
                                {stepIdx !== steps.length - 1 ? (
                                    <div
                                        aria-hidden="true"
                                        className={cn(
                                            "absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5",
                                            stepStatus === 'complete' ? "bg-primary" : "bg-border"
                                        )}
                                    />
                                ) : null}
                                <StatusStepItem
                                    step={step}
                                    status={stepStatus}
                                    isClickable={isClickable}
                                    onClick={() => handleStepClick(step.id)}
                                />
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}
interface StatusStepItemProps {
    step: StatusStep;
    status: 'complete' | 'current' | 'upcoming';
    isClickable: boolean;
    onClick: () => void;
}
function StatusStepItem({ step, status, isClickable, onClick }: StatusStepItemProps) {
    const content = (
        <>
            <span className="flex h-9 items-center" aria-hidden="true">
                <StatusIcon status={status} isClickable={isClickable} />
            </span>
            <span className="ml-4 flex min-w-0 flex-col">
                <span className={cn(
                    "text-sm font-medium",
                    status === 'current' ? "text-primary" : "",
                    status === 'upcoming' ? "text-muted-foreground" : ""
                )}>
                    {step.name}
                </span>
                <span className="text-sm text-muted-foreground">{step.description}</span>
            </span>
        </>
    );
    const divProps = {
        className: cn(
            "group relative flex items-start",
            isClickable && "cursor-pointer transition-colors"
        ),
        ...(status === 'current' ? { 'aria-current': 'step' as const } : {}),
        ...(isClickable ? { onClick } : {})
    };
    return <div {...divProps}>{content}</div>;
}
interface StatusIconProps {
    status: 'complete' | 'current' | 'upcoming';
    isClickable: boolean;
}
function StatusIcon({ status, isClickable }: StatusIconProps) {
    if (status === 'complete') {
        return (
            <span className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full transition-colors",
                isClickable
                    ? "bg-primary group-hover:bg-background group-hover:border-2 group-hover:border-foreground"
                    : "bg-primary"
            )}>
                <CheckIcon
                    aria-hidden="true"
                    className={cn(
                        "size-5 transition-colors",
                        isClickable
                            ? "text-primary-foreground group-hover:text-foreground"
                            : "text-primary-foreground"
                    )}
                />
            </span>
        );
    }
    return (
        <span className={cn(
            "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors",
            status === 'current'
                ? "border-primary bg-background group-hover:bg-foreground group-hover:border-foreground"
                : isClickable
                    ? "border-border bg-background group-hover:bg-foreground group-hover:border-foreground"
                    : "border-border bg-background"
        )}>
            <span className={cn(
                "size-2.5 rounded-full transition-colors",
                status === 'current'
                    ? "bg-primary group-hover:bg-background"
                    : isClickable
                        ? "bg-transparent group-hover:bg-background"
                        : "bg-transparent"
            )} />
        </span>
    );
} 