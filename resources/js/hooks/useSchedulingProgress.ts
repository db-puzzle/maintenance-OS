import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

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

        const channel = (window as any).Echo.channel(`scheduling.${scheduleVersionId}`);

        // Handle scheduling started
        const handleStarted = (e: any) => {
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
        const handleProgress = (e: any) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    progress: {
                        percentage: e.percentage,
                        currentStep: e.currentStep,
                        totalSteps: e.totalSteps,
                        currentOperation: e.currentOperation,
                        estimatedTimeRemaining: e.estimatedSecondsRemaining,
                    },
                }));
            }
        };

        // Handle completion
        const handleComplete = (e: any) => {
            if (e.jobId === state.jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'completed',
                    completedAt: new Date(e.timestamp),
                    alerts: e.alertBreakdown,
                }));

                // Auto-refresh schedule data
                router.reload({
                    only: ['schedules', 'alerts', 'alertStats'],
                    preserveUrl: true,
                });
            }
        };

        // Handle failure
        const handleFailed = (e: any) => {
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
        const handleWarning = (e: any) => {
            if (e.jobId === state.jobId) {
                console.warn('Scheduling warning:', e.message);
            }
        };

        // Subscribe to events
        channel.listen('SchedulingStarted', handleStarted);
        channel.listen('SchedulingProgress', handleProgress);
        channel.listen('SchedulingComplete', handleComplete);
        channel.listen('SchedulingFailed', handleFailed);
        channel.listen('SchedulingWarning', handleWarning);

        // Cleanup
        return () => {
            channel.stopListening('SchedulingStarted');
            channel.stopListening('SchedulingProgress');
            channel.stopListening('SchedulingComplete');
            channel.stopListening('SchedulingFailed');
            channel.stopListening('SchedulingWarning');
            (window as any).Echo.leave(`scheduling.${scheduleVersionId}`);
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
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: error.message || 'Failed to start scheduling',
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
                    onSuccess: (page: any) => {
                        const data = page.props.flash?.data || page.props;
                        if (data.job_id) {
                            setState(prev => ({
                                ...prev,
                                jobId: data.job_id,
                                status: 'queued'
                            }));
                            // Set up Echo listener
                            setupEchoListener(params.versionId, data.job_id);
                        }
                    },
                    onError: (errors: any) => {
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
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: error.message || 'Failed to start scheduling',
            }));
        }
    }, []);

    const setupEchoListener = (versionId: number, jobId: string) => {
        const channel = (window as any).Echo.channel(`scheduling.${versionId}`);

        channel.listen('SchedulingStarted', (e: any) => {
            if (e.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'running',
                    startedAt: new Date(e.timestamp),
                    progress: {
                        ...prev.progress,
                        totalSteps: e.totalSteps,
                    },
                }));
            }
        });

        channel.listen('SchedulingProgress', (e: any) => {
            if (e.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    progress: {
                        percentage: e.percentage,
                        currentStep: e.currentStep,
                        totalSteps: e.totalSteps,
                        currentOperation: e.currentOperation,
                        estimatedTimeRemaining: e.estimatedSecondsRemaining,
                    },
                }));
            }
        });

        channel.listen('SchedulingComplete', (e: any) => {
            if (e.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'completed',
                    completedAt: new Date(e.timestamp),
                    alerts: e.alertBreakdown,
                }));

                // Cleanup listener
                (window as any).Echo.leave(`scheduling.${versionId}`);

                // Auto-refresh schedule data
                router.reload({
                    only: ['schedules', 'alerts', 'alertStats'],
                    preserveUrl: true,
                });
            }
        });

        channel.listen('SchedulingFailed', (e: any) => {
            if (e.jobId === jobId) {
                setState(prev => ({
                    ...prev,
                    status: 'failed',
                    error: e.error,
                    completedAt: new Date(e.timestamp),
                }));

                // Cleanup listener
                (window as any).Echo.leave(`scheduling.${versionId}`);
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
