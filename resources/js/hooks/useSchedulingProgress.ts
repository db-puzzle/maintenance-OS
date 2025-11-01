import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

// Echo types
interface EchoChannel {
    listen: (event: string, callback: (data: unknown) => void) => void;
    stopListening: (event: string) => void;
}

interface Echo {
    channel: (name: string) => EchoChannel;
    leave: (name: string) => void;
}

interface WindowWithEcho extends Window {
    Echo: Echo;
}

// Echo event types
interface SchedulingStartedEvent {
    jobId: string;
    timestamp: string;
    totalSteps: number;
}

interface SchedulingProgressEvent {
    jobId: string;
    percentage: number;
    currentStep: number;
    totalSteps: number;
    currentOperation: string;
    estimatedTimeRemaining?: number;
}

interface SchedulingCompletedEvent {
    jobId: string;
    timestamp: string;
    stats: {
        ordersScheduled: number;
        stepsScheduled: number;
        duration: number;
        alerts: {
            errors: number;
            warnings: number;
        };
    };
}

interface SchedulingFailedEvent {
    jobId: string;
    error: string;
    timestamp: string;
}

// interface SchedulingApiResponse {
//     success?: boolean;
//     job_id?: string;
//     websocket_channel?: string;
//     version_id?: number;
//     error?: string;
// }

interface SchedulingProgressState {
    isOpen: boolean;
    jobId: string | null;
    algorithm: string;
    status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
    progress: {
        percentage: number;
        currentStep: number;
        totalSteps: number;
        currentOperation: string;
        estimatedTimeRemaining?: number;
    };
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    alerts?: {
        errors: number;
        warnings: number;
    };
}

interface SchedulingProgressHook {
    state: SchedulingProgressState;
    startScheduling: (versionId: number, algorithm: string) => void;
    closeModal: () => void;
}

export function useSchedulingProgress(scheduleVersionId: number): SchedulingProgressHook {
    const [state, setState] = useState<SchedulingProgressState>({
        isOpen: false,
        jobId: null,
        algorithm: '',
        status: 'idle',
        progress: {
            percentage: 0,
            currentStep: 0,
            totalSteps: 0,
            currentOperation: 'Initializing...',
        },
    });

    // Listen to Echo events
    useEffect(() => {
        if (!state.jobId || state.status === 'idle') return;

        const channel = (window as WindowWithEcho).Echo?.channel(`scheduling.${scheduleVersionId}`);
        if (!channel) return;

        // Handle scheduling started
        const handleStarted = (e: SchedulingStartedEvent) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'running',
                    startedAt: new Date(e.timestamp),
                    progress: {
                        ...prev.progress,
                        totalSteps: e.totalSteps,
                        currentOperation: 'Starting scheduling process...',
                    },
                }));
            }
        };

        // Handle progress updates
        const handleProgress = (e: SchedulingProgressEvent) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    progress: {
                        percentage: e.percentage,
                        currentStep: e.currentStep,
                        totalSteps: e.totalSteps,
                        currentOperation: e.currentOperation,
                        estimatedTimeRemaining: e.estimatedTimeRemaining,
                    },
                }));
            }
        };

        // Handle completion
        const handleComplete = (e: SchedulingCompletedEvent) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'completed',
                    completedAt: new Date(e.timestamp),
                    alerts: e.stats?.alerts || { errors: 0, warnings: 0 },
                }));

                // Auto-refresh schedule data
                router.reload({
                    only: ['schedules', 'alerts', 'alertStats'],
                    preserveUrl: true,
                });
            }
        };

        // Handle failure
        const handleFailed = (e: SchedulingFailedEvent) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'failed',
                    error: e.error,
                    completedAt: new Date(e.timestamp),
                }));
            }
        };

        // Handle warnings
        const handleWarning = (e: { jobId: string; message: string; type: string }) => {
            if (e.jobId === state.jobId) {
                console.warn('Scheduling warning:', e.message);
            }
        };

        // Subscribe to events
        channel.listen('SchedulingStarted', (e: unknown) => handleStarted(e as SchedulingStartedEvent));
        channel.listen('SchedulingProgress', (e: unknown) => handleProgress(e as SchedulingProgressEvent));
        channel.listen('SchedulingComplete', (e: unknown) => handleComplete(e as SchedulingCompletedEvent));
        channel.listen('SchedulingFailed', (e: unknown) => handleFailed(e as SchedulingFailedEvent));
        channel.listen('SchedulingWarning', (e: unknown) => handleWarning(e as { jobId: string; message: string; type: string; }));

        // Cleanup
        return () => {
            channel.stopListening('SchedulingStarted');
            channel.stopListening('SchedulingProgress');
            channel.stopListening('SchedulingComplete');
            channel.stopListening('SchedulingFailed');
            channel.stopListening('SchedulingWarning');
            (window as WindowWithEcho).Echo?.leave(`scheduling.${scheduleVersionId}`);
        };
    }, [scheduleVersionId, state.jobId, state.status]);

    // Start scheduling
    const startScheduling = useCallback(async (versionId: number, algorithm: string) => {
        // Reset state
        setState({
            isOpen: true,
            jobId: null,
            algorithm,
            status: 'queued',
            progress: {
                percentage: 0,
                currentStep: 0,
                totalSteps: 0,
                currentOperation: 'Initializing...',
            },
        });

        try {
            // Call API to start scheduling
            const response = await fetch(route('production.scheduler.run'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    version_id: versionId,
                    algorithm,
                    // These will be passed from the component
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start scheduling');
            }

            const data = await response.json();

            setState(prev => ({
                ...prev,
                jobId: data.job_id,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Failed to start scheduling',
            }));
        }
    }, []);

    // Close modal
    const closeModal = useCallback(() => {
        setState(prev => ({
            ...prev,
            isOpen: false,
        }));
    }, []);

    return {
        state,
        startScheduling,
        closeModal,
    };
}

// Alternative hook that accepts more parameters
export function useSchedulingProgressWithParams() {
    const [state, setState] = useState<SchedulingProgressState>({
        isOpen: false,
        jobId: null,
        algorithm: '',
        status: 'idle',
        progress: {
            percentage: 0,
            currentStep: 0,
            totalSteps: 0,
            currentOperation: 'Initializing...',
        },
    });

    const startScheduling = useCallback(async (params: {
        versionId: number;
        algorithm: string;
        startDate: string;
        endDate: string;
        manufacturingOrderIds?: number[];
    }) => {
        setState({
            isOpen: true,
            jobId: null,
            algorithm: params.algorithm,
            status: 'queued',
            progress: {
                percentage: 0,
                currentStep: 0,
                totalSteps: 0,
                currentOperation: 'Initializing...',
            },
        });

        try {
            await router.post(
                route('production.scheduler.run'),
                {
                    version_id: params.versionId,
                    algorithm: params.algorithm,
                    start_date: params.startDate,
                    end_date: params.endDate,
                    manufacturing_order_ids: params.manufacturingOrderIds,
                },
                {
                    preserveState: true,
                    preserveUrl: true,
                    onSuccess: (page) => {
                        const pageWithProps = page as { props?: { flash?: { data?: { job_id?: string } } } };
                        const pageProps = pageWithProps.props;
                        const flashData = pageProps?.flash?.data;
                        const jobId = flashData?.job_id || (pageProps as { job_id?: string } | undefined)?.job_id;
                        if (jobId) {
                            setState(prev => ({
                                ...prev,
                                jobId: jobId,
                                status: 'queued'
                            }));
                            // Set up Echo listener
                            setupEchoListener(params.versionId, jobId);
                        }
                    },
                    onError: (errors: { message?: string }) => {
                        const errorMessage = errors.message || 'Failed to start scheduling job.';
                        setState(prev => ({
                            ...prev,
                            status: 'failed',
                            error: errorMessage,
                            completedAt: new Date(),
                        }));
                    },
                }
            );
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Failed to start scheduling',
            }));
        }
    }, []);

    const setupEchoListener = (versionId: number, jobId: string) => {
        const channel = (window as WindowWithEcho).Echo?.channel(`scheduling.${versionId}`);
        if (!channel) {
            console.error('Echo channel not available');
            return;
        }

        channel.listen('SchedulingStarted', (e: unknown) => {
            const event = e as SchedulingStartedEvent;
            if (event.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'running',
                    startedAt: new Date(event.timestamp),
                    progress: {
                        ...prev.progress,
                        totalSteps: event.totalSteps,
                    },
                }));
            }
        });

        channel.listen('SchedulingProgress', (e: unknown) => {
            const event = e as SchedulingProgressEvent;
            if (event.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    progress: {
                        percentage: event.percentage,
                        currentStep: event.currentStep,
                        totalSteps: event.totalSteps,
                        currentOperation: event.currentOperation,
                        estimatedTimeRemaining: event.estimatedTimeRemaining,
                    },
                }));
            }
        });

        channel.listen('SchedulingComplete', (e: unknown) => {
            const event = e as SchedulingCompletedEvent;
            if (event.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'completed',
                    completedAt: new Date(event.timestamp),
                    alerts: event.stats.alerts,
                }));

                // Cleanup listener
                (window as WindowWithEcho).Echo?.leave(`scheduling.${versionId}`);

                // Auto-refresh schedule data
                router.reload({
                    only: ['schedules', 'alerts', 'alertStats'],
                    preserveUrl: true,
                });
            }
        });

        channel.listen('SchedulingFailed', (e: unknown) => {
            const event = e as SchedulingFailedEvent;
            if (event.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'failed',
                    error: event.error,
                    completedAt: new Date(event.timestamp),
                }));

                // Cleanup listener
                (window as WindowWithEcho).Echo?.leave(`scheduling.${versionId}`);
            }
        });
    };

    const closeModal = useCallback(() => {
        setState(prev => ({
            ...prev,
            isOpen: false,
        }));
    }, []);

    return {
        state,
        startScheduling,
        closeModal,
    };
}
