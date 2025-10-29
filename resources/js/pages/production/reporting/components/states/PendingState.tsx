import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Clock, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { cn } from '@/lib/utils';

// Type helper to map action variants to button variants
type ButtonVariant = React.ComponentProps<typeof Button>['variant'];
const getButtonVariant = (variant: StateTransitionAction['variant']): ButtonVariant => {
    if (variant === 'success') return 'default';
    return variant as ButtonVariant;
};

interface PendingStateProps {
    stateInfo: StepStateInfo;
    onAction: (action: StateTransitionAction) => void;
}

export function PendingState({ stateInfo, onAction }: PendingStateProps) {
    const actions: StateTransitionAction[] = [
        {
            action: 'force_start',
            label: 'Force Start (Override Dependencies)',
            icon: 'AlertTriangle',
            variant: 'warning',
            confirmMessage: 'Are you sure you want to override dependencies and force start this step?',
            requiresPermission: 'force_start_steps',
        },
        {
            action: 'refresh_dependencies',
            label: 'Check Dependencies',
            icon: 'RefreshCw',
            variant: 'ghost',
        },
        {
            action: 'view_dependencies',
            label: 'View Dependency Details',
            icon: 'Info',
            variant: 'outline',
        },
    ];

    const calculateOverallProgress = () => {
        if (!stateInfo.dependencies) return 0;

        const allDeps = [
            ...stateInfo.dependencies.stepDependencies,
            ...stateInfo.dependencies.childOrderDependencies,
        ];

        if (allDeps.length === 0) return 100;

        const metCount = allDeps.filter(d => d.status === 'met').length;
        return Math.round((metCount / allDeps.length) * 100);
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Step Pending</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                    Waiting for dependencies to be met
                </p>

                {/* Dependencies Status */}
                {stateInfo.dependencies && (
                    <div className="w-full max-w-md space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Overall Progress</span>
                                <span className="font-medium">{calculateOverallProgress()}%</span>
                            </div>
                            <Progress value={calculateOverallProgress()} className="h-2" />
                        </div>

                        {/* Step Dependencies */}
                        {stateInfo.dependencies.stepDependencies.length > 0 && (
                            <Card className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Step Dependencies</h4>
                                <div className="space-y-2">
                                    {stateInfo.dependencies.stepDependencies.map((dep) => (
                                        <div key={dep.id} className="flex items-center justify-between">
                                            <span className="text-sm">{dep.name}</span>
                                            <div className="flex items-center gap-2">
                                                {dep.progress !== undefined && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {dep.progress}%
                                                    </span>
                                                )}
                                                <div
                                                    className={cn(
                                                        'w-2 h-2 rounded-full',
                                                        dep.status === 'met' && 'bg-green-500',
                                                        dep.status === 'pending' && 'bg-yellow-500',
                                                        dep.status === 'failed' && 'bg-red-500'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Child Order Dependencies */}
                        {stateInfo.dependencies.childOrderDependencies.length > 0 && (
                            <Card className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Child Order Dependencies</h4>
                                <div className="space-y-2">
                                    {stateInfo.dependencies.childOrderDependencies.map((dep) => (
                                        <div key={dep.id} className="flex items-center justify-between">
                                            <span className="text-sm">{dep.name}</span>
                                            <div className="flex items-center gap-2">
                                                {dep.progress !== undefined && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {dep.progress}%
                                                    </span>
                                                )}
                                                <div
                                                    className={cn(
                                                        'w-2 h-2 rounded-full',
                                                        dep.status === 'met' && 'bg-green-500',
                                                        dep.status === 'pending' && 'bg-yellow-500',
                                                        dep.status === 'failed' && 'bg-red-500'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full gap-2"
                    variant={getButtonVariant(actions[0].variant)}
                    onClick={() => onAction(actions[0])}
                >
                    <AlertTriangle className="h-4 w-4" />
                    {actions[0].label}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={getButtonVariant(actions[1].variant)}
                        onClick={() => onAction(actions[1])}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {actions[1].label}
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[2].variant)}
                        onClick={() => onAction(actions[2])}
                        className="gap-2"
                    >
                        <Info className="h-4 w-4" />
                        {actions[2].label}
                    </Button>
                </div>
            </div>
        </div>
    );
}
