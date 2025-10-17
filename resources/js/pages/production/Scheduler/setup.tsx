import React, { useState, useEffect } from 'react';
import { Head, usePage, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { OrderSelectionStep } from './components/setup/OrderSelectionStep';
import { AlgorithmSelectionStep } from './components/setup/AlgorithmSelectionStep';
import { TimeParametersStep } from './components/setup/TimeParametersStep';
import { ReviewStep } from './components/setup/ReviewStep';
import { toast } from 'sonner';

// Declare the global route function
declare const route: (name: string, params?: any) => string;

interface Props {
    currentVersion?: any;
    publishedVersion?: any;
    orders: any[];
    workCells: any[];
    filters: any;
    algorithms: Array<{ value: string; label: string }>;
    defaultStartDate: string;
    activeScheduleVersion?: any;
    schedulingConfig?: any;
}

type Step = 'order-selection' | 'time-parameters' | 'algorithm-selection' | 'review';

const steps: { id: Step; title: string }[] = [
    {
        id: 'order-selection',
        title: 'Select Orders',
    },
    {
        id: 'time-parameters',
        title: 'Configure Time',
    },
    {
        id: 'algorithm-selection',
        title: 'Choose Algorithm',
    },
    {
        id: 'review',
        title: 'Review & Start',
    },
];

export default function SchedulerSetup({
    currentVersion,
    publishedVersion: _publishedVersion,
    orders,
    workCells,
    filters,
    algorithms,
    defaultStartDate,
    activeScheduleVersion,
    schedulingConfig: _schedulingConfig,
}: Props) {
    const { flash } = usePage().props as any;
    const [currentStep, setCurrentStep] = useState<Step>('order-selection');
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<any[]>([]);
    const [timeParameterData, setTimeParameterData] = useState<any[]>([]);
    const [loadingTimeParams, setLoadingTimeParams] = useState(false);

    // Initialize form with useForm hook
    const { data, setData, post, processing, errors } = useForm({
        version_id: currentVersion?.id || 0,
        algorithm: algorithms[0]?.value || 'asap',
        start_date: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'),
        manufacturing_order_ids: [] as number[],
        respect_locked_schedules: true,
    });

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Scheduler', href: route('production.scheduler.index') },
        { title: 'Setup', href: '#' },
    ];

    // Monitor flash data for scheduling job response
    useEffect(() => {
        const schedulingJob = flash?.schedulingJob ||
            (flash?.success && flash?.job_id ? flash : null);

        if (schedulingJob) {
            // Redirect to scheduler with job info
            const jobData = schedulingJob.schedulingJob || schedulingJob;
            window.location.href = route('production.scheduler.index', {
                job_id: jobData.job_id,
                websocket_channel: jobData.websocket_channel,
                version_id: jobData.version_id
            });
        }
    }, [flash]);

    const fetchFamilies = async (orderIds: number[]) => {
        if (orderIds.length === 0) {
            setFamilies([]);
            return;
        }

        try {
            // Build query string with array parameters
            const params = new URLSearchParams();
            orderIds.forEach(id => params.append('order_ids[]', id.toString()));

            const response = await fetch(route('production.scheduler.families') + '?' + params.toString());
            const data = await response.json();
            setFamilies(data.families || []);
        } catch (error) {
            // Failed to fetch families
            toast.error('Failed to fetch order families');
        }
    };

    const fetchTimeParameters = async (orderIds: number[]) => {
        if (orderIds.length === 0) {
            setTimeParameterData([]);
            return;
        }

        setLoadingTimeParams(true);

        try {
            const response = await axios.post(route('production.scheduler.validate-time-parameters'), {
                manufacturing_order_ids: orderIds
            });
            setTimeParameterData(response.data || []);
        } catch (error) {
            // Failed to fetch time parameters
            toast.error('Failed to fetch time parameters');
        } finally {
            setLoadingTimeParams(false);
        }
    };

    const handleOrderSelectionComplete = (orderIds: number[], dateRange: any) => {
        setSelectedOrders(orderIds);
        setData({
            ...data,
            manufacturing_order_ids: orderIds,
            start_date: dateRange.start_date,
            end_date: dateRange.end_date,
        });

        // Fetch families and time parameters for the next step
        fetchFamilies(orderIds);
        fetchTimeParameters(orderIds);
        setCurrentStep('time-parameters');
    };

    const handleTimeParametersComplete = () => {
        setCurrentStep('algorithm-selection');
    };

    const handleAlgorithmSelectionComplete = (algorithm: string, respectLockedSchedules: boolean) => {
        setData({
            ...data,
            algorithm: algorithm,
            respect_locked_schedules: respectLockedSchedules,
        });

        setCurrentStep('review');
    };

    const handleRunScheduler = () => {
        post(route('production.scheduler.run'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Scheduler started successfully');
            },
            onError: (errors) => {
                // Error starting scheduler
                toast.error('Failed to start scheduling. Please try again.');
            }
        });
    };

    const handleBack = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1].id);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scheduler Setup" />

            <div className="relative flex h-[calc(100vh-3rem)] flex-col">
                <div className="bg-background border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scheduler Setup</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Configure scheduling parameters, select manufacturing orders, and run the production scheduler
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="bg-background px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-x-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full min-w-0">
                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;
                            const isLast = index === steps.length - 1;

                            return (
                                <div key={step.id} className={cn(
                                    "flex flex-col md:flex-row md:items-center",
                                    !isLast && "md:flex-1"
                                )}>
                                    <div className="flex items-center">
                                        <div
                                            className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 transition-colors',
                                                {
                                                    'bg-primary text-primary-foreground ring-2 ring-primary/20': isActive || isCompleted,
                                                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600': !isActive && !isCompleted,
                                                }
                                            )}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <div className="ml-3">
                                            <p className={cn('text-sm font-medium whitespace-nowrap', {
                                                'text-gray-900 dark:text-gray-100': isActive || isCompleted,
                                                'text-gray-500 dark:text-gray-400': !isActive && !isCompleted,
                                            })}>
                                                {step.title}
                                            </p>
                                        </div>
                                    </div>
                                    {!isLast && (
                                        <>
                                            {/* Vertical connector for mobile */}
                                            <div className="ml-4 h-8 w-0.5 bg-gray-200 dark:bg-gray-700 md:hidden" />
                                            {/* Horizontal connector for desktop */}
                                            <div className="hidden md:block flex-1 mx-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-background">
                    {currentStep === 'order-selection' && (
                        <OrderSelectionStep
                            orders={orders}
                            defaultStartDate={defaultStartDate}
                            currentVersion={currentVersion}
                            activeScheduleVersion={activeScheduleVersion}
                            onNext={handleOrderSelectionComplete}
                        />
                    )}

                    {currentStep === 'time-parameters' && (
                        <TimeParametersStep
                            orders={timeParameterData}
                            selectedOrders={selectedOrders}
                            loading={loadingTimeParams}
                            startDate={data.start_date}
                            endDate={data.end_date}
                            onNext={handleTimeParametersComplete}
                            onBack={handleBack}
                            onRefresh={() => {
                                // Refreshing with dates
                                fetchTimeParameters(selectedOrders);
                            }}
                        />
                    )}

                    {currentStep === 'algorithm-selection' && (
                        <AlgorithmSelectionStep
                            algorithms={algorithms}
                            initialAlgorithm={data.algorithm}
                            initialRespectLockedSchedules={data.respect_locked_schedules}
                            onNext={handleAlgorithmSelectionComplete}
                            onBack={handleBack}
                        />
                    )}

                    {currentStep === 'review' && (
                        <ReviewStep
                            data={data}
                            selectedOrders={selectedOrders}
                            orders={orders}
                            families={families}
                            algorithms={algorithms}
                            processing={processing}
                            errors={errors}
                            onBack={handleBack}
                            onRunScheduler={handleRunScheduler}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
