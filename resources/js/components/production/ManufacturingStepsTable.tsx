import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { StepStatusBadge } from './StepStatusBadge';
import { ManufacturingStep } from '@/types/production';
import { Play, Pause, Eye, Lock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    steps: ManufacturingStep[];
    canExecute: boolean;
}

export function ManufacturingStepsTable({ steps, canExecute }: Props) {
    // Calculate status summary
    const statusSummary = steps.reduce((acc, step) => {
        const status = step.status === 'queued' && step.dependencies?.some(d => d.status !== 'completed')
            ? 'pending'
            : step.status;

        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalSteps = steps.length;
    const completedSteps = statusSummary.completed || 0;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const getStepActions = (step: ManufacturingStep) => {
        // Check if dependencies are met
        const dependenciesNotMet = step.dependencies?.some(d => d.status !== 'completed');
        const actualStatus = dependenciesNotMet ? 'pending' : step.status;

        switch (actualStatus) {
            case 'queued':
                return canExecute ? (
                    <Button
                        size="sm"
                        onClick={() => router.visit(route('production.steps.execute', step.id))}
                    >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                    </Button>
                ) : null;

            case 'in_progress':
            case 'on_hold':
                return canExecute ? (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.visit(route('production.steps.execute', step.id))}
                    >
                        <Pause className="h-4 w-4 mr-1" />
                        Continue
                    </Button>
                ) : null;

            case 'completed':
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.visit(route('production.steps.execute', step.id))}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                    </Button>
                );

            case 'pending':
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" disabled>
                                    <Lock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Dependencies not met</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );

            default:
                return null;
        }
    };

    const getRowClassName = (step: ManufacturingStep) => {
        const dependenciesNotMet = step.dependencies?.some(d => d.status !== 'completed');

        if (dependenciesNotMet) {
            return 'opacity-50';
        }

        switch (step.status) {
            case 'queued':
                return 'bg-blue-50/30 hover:bg-blue-50/50';
            case 'in_progress':
                return 'bg-amber-50/30 hover:bg-amber-50/50';
            case 'completed':
                return 'bg-green-50/30 hover:bg-green-50/50';
            case 'on_hold':
                return 'bg-yellow-50/30 hover:bg-yellow-50/50';
            default:
                return '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card variant="compact">
                    <CardContent variant="compact" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Ready to Start
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {statusSummary.queued || 0}
                                </p>
                            </div>
                            <Play className="h-8 w-8 text-blue-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card variant="compact">
                    <CardContent variant="compact" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    In Progress
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {statusSummary.in_progress || 0}
                                </p>
                            </div>
                            <Pause className="h-8 w-8 text-amber-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card variant="compact">
                    <CardContent variant="compact" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    On Hold
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {statusSummary.on_hold || 0}
                                </p>
                            </div>
                            <Lock className="h-8 w-8 text-yellow-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card variant="compact">
                    <CardContent variant="compact" className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Completed
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {completedSteps} of {totalSteps}
                                </p>
                            </div>
                            <Eye className="h-8 w-8 text-green-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Steps Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">Step #</TableHead>
                            <TableHead>Step Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Work Cell</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {steps.map((step) => {
                            const dependenciesNotMet = step.dependencies?.some(d => d.status !== 'completed');
                            const actualStatus = dependenciesNotMet ? 'pending' : step.status;

                            return (
                                <TableRow
                                    key={step.id}
                                    className={cn('transition-colors', getRowClassName(step))}
                                >
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono">
                                            {step.step_number}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{step.name}</span>
                                            {step.description && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">{step.description}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">
                                            {step.step_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {step.work_cell?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <StepStatusBadge status={actualStatus} />
                                    </TableCell>
                                    <TableCell>
                                        {step.current_execution?.executed_by_user?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        {step.status === 'in_progress' && step.current_execution && (
                                            <div className="w-24">
                                                <Progress
                                                    value={step.current_execution.progress_percentage || 0}
                                                    className="h-2"
                                                />
                                            </div>
                                        )}
                                        {step.status === 'completed' && (
                                            <span className="text-sm text-green-600">100%</span>
                                        )}
                                        {step.status === 'queued' && (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {getStepActions(step)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
