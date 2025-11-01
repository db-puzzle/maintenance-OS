import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, Users, AlertCircle } from 'lucide-react';

interface SchedulerProgressProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId: string;
    versionId: number;
    websocketChannel?: string;
    onComplete?: () => void;
}

interface SchedulingProgress {
    stage: 'validating' | 'scheduling' | 'finalizing';
    currentFamily?: {
        orderNumber: string;
        familyIndex: number;
        totalFamilies: number;
        stepsComplete: number;
        totalSteps: number;
    };
    overallProgress: number;
    message?: string;
}

export default function SchedulerProgress({
    open,
    onOpenChange,
    jobId,
    versionId,
    websocketChannel: _websocketChannel,
    onComplete,
}: SchedulerProgressProps) {
    const [progress, setProgress] = useState<SchedulingProgress>({
        stage: 'validating',
        overallProgress: 0,
        message: undefined
    });
    const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
    const [error, setError] = useState<string | null>(null);
    const [_result, _setResult] = useState<{ version_id: number; message: string } | null>(null);

    useEffect(() => {
        if (!open || !jobId || !versionId) return;

        let pollCount = 0;
        const maxPolls = 120; // Poll for max 2 minutes (120 * 1 second)
        let intervalId: NodeJS.Timeout | undefined;

        const pollProgress = async () => {
            try {
                const response = await fetch(route('production.scheduler.progress.old', { version: versionId }));
                if (!response.ok) throw new Error('Failed to fetch progress');

                const data = await response.json();

                // Update progress based on status
                switch (data.status) {
                    case 'queued':
                        setProgress({
                            stage: 'validating',
                            overallProgress: 5,
                            message: data.message || undefined
                        });
                        break;

                    case 'running':
                        setProgress({
                            stage: 'scheduling',
                            overallProgress: Math.min(50 + (pollCount * 0.5), 90), // Gradually increase progress
                            message: data.message || undefined
                        });
                        break;

                    case 'completed':
                        setStatus('completed');
                        setProgress({
                            stage: 'scheduling',
                            overallProgress: 100,
                            message: data.message || undefined
                        });

                        // Stop polling
                        if (intervalId) clearInterval(intervalId);

                        // Call onComplete callback after a short delay
                        setTimeout(() => {
                            if (onComplete) {
                                onComplete();
                            }
                            // Reload the page data
                            router.reload({
                                only: ['schedules', 'orders', 'alerts', 'alertStats', 'currentVersion'],
                                preserveUrl: true,
                            });
                            onOpenChange(false);
                        }, 2000);
                        break;

                    case 'failed': {
                        setStatus('failed');
                        // Try to get detailed error from response
                        let errorMessage = 'An error occurred during scheduling';
                        if (data.error) {
                            errorMessage = data.error;
                        } else if (data.message) {
                            errorMessage = data.message;
                        } else if (data.errorDetails) {
                            // If we have detailed error information
                            errorMessage = data.errorDetails.message || errorMessage;
                            if (data.errorDetails.alerts && data.errorDetails.alerts.length > 0) {
                                // Include first alert message for more context
                                const firstAlert = data.errorDetails.alerts[0];
                                errorMessage = firstAlert.message || errorMessage;
                            }
                        }
                        setError(errorMessage);
                        if (intervalId) clearInterval(intervalId);
                        break;
                    }
                }

                pollCount++;

                // Stop polling after max attempts
                if (pollCount >= maxPolls) {
                    if (intervalId) clearInterval(intervalId);
                    setStatus('failed');
                    setError('Scheduling is taking longer than expected. Please check the logs.');
                }
            } catch (err) {
                console.error('Error polling progress:', err);
                // Don't stop polling on error, might be temporary
            }
        };

        // Start polling immediately
        pollProgress();
        
        // Set up the interval
        intervalId = setInterval(pollProgress, 1000);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [versionId, jobId, open, onComplete, onOpenChange]);

    const getStageIcon = () => {
        switch (progress.stage) {
            case 'validating':
                return <Clock className="w-5 h-5" />;
            case 'scheduling':
                return <Users className="w-5 h-5" />;
            case 'finalizing':
                return <CheckCircle className="w-5 h-5" />;
        }
    };

    const getStageLabel = () => {
        switch (progress.stage) {
            case 'validating':
                return 'Validating orders and dependencies...';
            case 'scheduling':
                return 'Scheduling manufacturing orders...';
            case 'finalizing':
                return 'Finalizing schedule...';
        }
    };

    const handleClose = () => {
        if (status === 'running') {
            // Don't allow closing while running
            return;
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className="sm:max-w-2xl  flex flex-col"
            >
                <DialogHeader>
                    <DialogTitle>
                        <span>Scheduling Progress</span>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Monitor the progress of the scheduling operation
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    {/* Overall Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                                {getStageIcon()}
                                {getStageLabel()}
                            </span>
                            <span className="font-medium">{Math.round(progress.overallProgress)}%</span>
                        </div>
                        <Progress value={progress.overallProgress} className="h-3" />
                    </div>

                    {/* Backend Message Area */}
                    {status !== 'failed' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                            <div className="flex items-start gap-2">
                                {!progress.message && (
                                    <Loader2 className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                                )}
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    {progress.message || 'Working...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Family Progress */}
                    {progress.currentFamily && progress.stage === 'scheduling' && (
                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Current Family</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {progress.currentFamily.orderNumber}
                                    </p>
                                </div>
                                <Badge variant="outline">
                                    Family {progress.currentFamily.familyIndex} of {progress.currentFamily.totalFamilies}
                                </Badge>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Steps Progress</span>
                                    <span>
                                        {progress.currentFamily.stepsComplete} / {progress.currentFamily.totalSteps}
                                    </span>
                                </div>
                                <Progress
                                    value={(progress.currentFamily.stepsComplete / progress.currentFamily.totalSteps) * 100}
                                    className="h-2"
                                />
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {status === 'failed' && error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Scheduling failed:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Success State */}
                    {status === 'completed' && (
                        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                Scheduling completed successfully! Updating schedules...
                            </AlertDescription>
                        </Alert>
                    )}

                </div>

                {/* Fixed Footer Section */}
                <div className="pt-4">
                    {/* Actions */}
                    {status !== 'running' && (
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                            {status === 'failed' && (
                                <Button onClick={() => {
                                    onOpenChange(false);
                                    // Optionally trigger retry logic here
                                }}>
                                    Try Again
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
