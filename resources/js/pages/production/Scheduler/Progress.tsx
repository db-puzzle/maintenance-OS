import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import Echo from 'laravel-echo';

interface ProgressPageProps {
    jobId: string;
    websocketChannel: string;
    version: any;
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
}

export default function ProgressPage({
    jobId,
    websocketChannel,
    version
}: ProgressPageProps) {
    const [progress, setProgress] = useState<SchedulingProgress>({
        stage: 'validating',
        overallProgress: 0
    });
    const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        // Check if WebSocket is enabled
        if (!window.Echo) {
            console.warn('WebSocket not configured, using polling instead');
            startPolling();
            return;
        }

        // Subscribe to WebSocket channel
        const channel = window.Echo.channel(websocketChannel);

        channel.listen('.scheduling.progress', (data: any) => {
            setProgress(data.progress);
        });

        channel.listen('.scheduling.completed', (data: any) => {
            setStatus('completed');
            setResult(data.result);
            setTimeout(() => {
                router.visit(route('production.scheduler.results', data.versionId));
            }, 2000);
        });

        channel.listen('.scheduling.failed', (data: any) => {
            setStatus('failed');
            setError(data.error);
        });

        return () => {
            window.Echo.leave(websocketChannel);
        };
    }, [websocketChannel]);

    const startPolling = () => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(route('production.scheduler.progress.old', version.id));
                const data = await response.json();

                if (data.status === 'completed') {
                    setStatus('completed');
                    clearInterval(interval);
                    setTimeout(() => {
                        router.visit(route('production.scheduler.results', version.id));
                    }, 2000);
                } else if (data.status === 'failed') {
                    setStatus('failed');
                    setError(data.error);
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Failed to fetch progress:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    };

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

    return (
        <>
            <Head title="Scheduling in Progress" />

            <div className="container mx-auto p-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Scheduling Progress</span>
                            <Badge variant={status === 'running' ? 'default' : status === 'completed' ? 'success' : 'destructive'}>
                                {status === 'running' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                                {status === 'completed' && <CheckCircle className="w-4 h-4 mr-1" />}
                                {status === 'failed' && <XCircle className="w-4 h-4 mr-1" />}
                                {status.toUpperCase()}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
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

                        {/* Family Progress */}
                        {progress.currentFamily && progress.stage === 'scheduling' && (
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Current Family</h4>
                                        <p className="text-sm text-gray-600">
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
                                <AlertDescription>
                                    <strong>Scheduling failed:</strong> {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Success State */}
                        {status === 'completed' && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Scheduling completed successfully! Redirecting to results...
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            {status === 'running' && (
                                <Button variant="outline" disabled>
                                    Cancel
                                </Button>
                            )}
                            {status === 'failed' && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.visit(route('production.scheduler.index'))}
                                    >
                                        Back to Scheduler
                                    </Button>
                                    <Button onClick={() => window.location.reload()}>
                                        Retry
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Job Info */}
                <div className="mt-4 text-center text-sm text-gray-500">
                    Job ID: {jobId}
                </div>
            </div>
        </>
    );
}
