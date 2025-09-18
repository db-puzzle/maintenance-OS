import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface SchedulingProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string | null;
    scheduleVersionId: number;
    algorithm: string;
    onComplete?: () => void;
    onError?: (error: string) => void;
}

interface ProgressState {
    status: 'queued' | 'running' | 'completed' | 'failed';
    percentage: number;
    currentStep: number;
    totalSteps: number;
    currentOperation: string;
    estimatedTimeRemaining?: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    alerts?: {
        errors: number;
        warnings: number;
    };
}

export default function SchedulingProgressModal({
    isOpen,
    onClose,
    jobId,
    scheduleVersionId: _scheduleVersionId,
    algorithm,
    onComplete,
    onError,
}: SchedulingProgressModalProps) {
    const [progress, _setProgress] = useState<ProgressState>({
        status: 'queued',
        percentage: 0,
        currentStep: 0,
        totalSteps: 0,
        currentOperation: 'Initializing...',
    });
    const [canBackground, setCanBackground] = useState(false);
    const [canCancel, setCanCancel] = useState(true);

    // Format algorithm name for display
    const algorithmDisplayName = {
        asap: 'ASAP (As Soon As Possible)',
        due_date: 'Due Date Backward Pass',
        balanced: 'Balanced Loading',
    }[algorithm] || algorithm;

    // Format estimated time
    const formatTime = (seconds?: number): string => {
        if (!seconds) return '';
        if (seconds < 60) return `${seconds} seconds`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Get status icon
    const getStatusIcon = () => {
        switch (progress.status) {
            case 'queued':
                return <Clock className="h-5 w-5 text-muted-foreground" />;
            case 'running':
                return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
        }
    };

    // Get status color
    const getStatusColor = () => {
        switch (progress.status) {
            case 'queued':
                return 'default';
            case 'running':
                return 'primary';
            case 'completed':
                return 'success';
            case 'failed':
                return 'destructive';
            default:
                return 'default';
        }
    };

    const handleClose = () => {
        if (progress.status === 'running' && !canBackground) {
            return; // Prevent closing while running unless background is allowed
        }
        onClose();
    };

    const handleCancel = async () => {
        if (!canCancel || progress.status !== 'running') return;

        // TODO: Implement job cancellation
        console.log('Cancelling job:', jobId);
    };

    const handleBackground = () => {
        if (!canBackground) return;
        onClose();
    };

    useEffect(() => {
        // Update background capability based on status
        setCanBackground(progress.status === 'running');
        setCanCancel(progress.status === 'queued' || progress.status === 'running');
    }, [progress.status]);

    // This component will be integrated with the useSchedulingProgress hook
    // For now, we'll just render the UI structure

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <DialogTitle>Scheduling in Progress</DialogTitle>
                        </div>
                        <Badge variant={getStatusColor() as 'default' | 'destructive' | 'outline' | 'secondary'}>
                            {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Algorithm: {algorithmDisplayName}
                        {progress.startedAt && (
                            <span className="block text-xs mt-1">
                                Started: {formatDistanceToNow(progress.startedAt, { addSuffix: true })}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Progress Bar */}
                    {progress.status === 'running' && (
                        <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{progress.percentage.toFixed(1)}%</span>
                                {progress.estimatedTimeRemaining && (
                                    <span>
                                        Est. remaining: {formatTime(progress.estimatedTimeRemaining)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current Operation */}
                    {progress.status === 'running' && (
                        <div className="text-sm">
                            <div className="font-medium">Processing:</div>
                            <div className="text-muted-foreground">{progress.currentOperation}</div>
                            {progress.totalSteps > 0 && (
                                <div className="text-xs mt-1">
                                    Step {progress.currentStep} of {progress.totalSteps}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completion Summary */}
                    {progress.status === 'completed' && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-medium mb-1">Scheduling completed successfully!</div>
                                {progress.completedAt && progress.startedAt && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                        Duration: {formatDistanceToNow(progress.startedAt, { includeSeconds: true })}
                                    </div>
                                )}
                                {progress.alerts && (
                                    <div className="flex gap-4 text-sm">
                                        {progress.alerts.errors > 0 && (
                                            <span className="text-red-600">
                                                {progress.alerts.errors} error{progress.alerts.errors !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {progress.alerts.warnings > 0 && (
                                            <span className="text-yellow-600">
                                                {progress.alerts.warnings} warning{progress.alerts.warnings !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {progress.alerts.errors === 0 && progress.alerts.warnings === 0 && (
                                            <span className="text-green-600">No issues found</span>
                                        )}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Error Message */}
                    {progress.status === 'failed' && progress.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-medium mb-1">Scheduling failed</div>
                                <div className="text-sm">{progress.error}</div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Queued Message */}
                    {progress.status === 'queued' && (
                        <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                                Scheduling job queued. Waiting for processing...
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between gap-2 mt-6">
                    <div className="flex gap-2">
                        {canBackground && (
                            <Button variant="outline" onClick={handleBackground}>
                                Run in Background
                            </Button>
                        )}
                        {canCancel && (
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {progress.status === 'completed' && (
                            <>
                                {progress.alerts && progress.alerts.errors > 0 && (
                                    <Button variant="outline" onClick={() => {/* TODO: View alerts */ }}>
                                        View Alerts
                                    </Button>
                                )}
                                <Button onClick={() => {
                                    onComplete?.();
                                    onClose();
                                }}>
                                    View Schedule
                                </Button>
                            </>
                        )}
                        {progress.status === 'failed' && (
                            <Button variant="outline" onClick={() => {
                                onError?.(progress.error || 'Unknown error');
                                onClose();
                            }}>
                                Close
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
