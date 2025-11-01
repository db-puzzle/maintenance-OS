import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell, ManufacturingStep } from '@/types/production';
import { ScheduleVersion, ProductionSchedule, ScheduleAlert } from '@/types/scheduler';
import { ScrollSyncProvider } from '@/components/production/scheduler-v2/contexts/ScrollSyncContext';
import { ProductionScheduler } from '@/components/production/scheduler-v2/ProductionScheduler';
import { formatNumber } from '@/utils/number';
import SchedulerProgress from '@/components/production/SchedulerProgress';

interface ScheduleStep {
    id: string;
    manufacturing_step_id: number;
    sequence_number: number;
    name: string;
    description?: string;
    work_cell_id?: number;
    work_cell?: WorkCell;
    planned_start_date?: string;
    planned_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    duration_hours: number;
    setup_time_hours: number;
    status: string;
    percent_complete: number;
    quantity_completed: string;
    quantity_remaining: string;
    parent_step_id: number | null;
    is_milestone: boolean;
    level: number;
    expanded: boolean;
    operation_type: string;
    required_resources: unknown[];
    predecessors: number[];
    successors: number[];
    can_start: boolean;
    is_critical_path: boolean;
    slack_hours: number;
    is_locked?: boolean;
    locked_by?: number;
    locked_at?: string;
}

interface TransformedOrder {
    id: number;
    order_number: string;
    name: string;
    status: string;
    priority: number;
    requested_date?: string;
    quantity: number;
    unit_of_measure?: string;
    parent_order_id?: number;
    children: TransformedOrder[];
    steps: ScheduleStep[];
    expanded: boolean;
    level: number;
}

interface FlashData {
    success?: boolean;
    schedulingJob?: {
        job_id: string;
        websocket_channel: string;
        version_id: number;
    };
    job_id?: string;
    [key: string]: unknown;
}

interface Props extends PageProps {
    currentVersion?: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    orders?: ManufacturingOrder[];
    schedules?: ProductionSchedule[];
    alerts?: ScheduleAlert[];
    alertStats?: {
        total: number;
        unresolved: number;
        by_type: {
            capacity_overrun: number;
            dependency_violation: number;
            late_delivery: number;
        };
        by_severity: {
            error: number;
            warning: number;
        };
    };
    workCells?: WorkCell[];
    filters?: {
        plant_id?: string;
        area_id?: string;
        start_date: string;
        end_date: string;
        search?: string;
    };
    schedulingAlgorithms?: Record<string, string>;
    algorithms?: Array<{ value: string; label: string }>;
    defaultStartDate?: string;
    activeScheduleVersion?: ScheduleVersion;
}

export default function SchedulerV2Index({
    auth: _auth,
    currentVersion: propsCurrentVersion,
    publishedVersion: propsPublishedVersion,
    orders: propsOrders,
    schedules: propsSchedules,
    alerts: propsAlerts,
    alertStats: propsAlertStats,
    workCells: propsWorkCells,
    filters: propsFilters,
    schedulingAlgorithms: propsSchedulingAlgorithms,
    algorithms: propsAlgorithms,
    defaultStartDate: propsDefaultStartDate,
    activeScheduleVersion: propsActiveScheduleVersion,
}: Props) {
    // Use real props data from backend
    const currentVersion = propsCurrentVersion;
    const publishedVersion = propsPublishedVersion;
    const orders = useMemo(() => propsOrders || [], [propsOrders]);
    const workCells = useMemo(() => propsWorkCells || [], [propsWorkCells]);
    const filters = useMemo(() => propsFilters || { start_date: '', end_date: '' }, [propsFilters]);
    const schedulingAlgorithms = propsSchedulingAlgorithms || {};
    const _algorithms = propsAlgorithms || [];
    const _defaultStartDate = propsDefaultStartDate || new Date().toISOString().split('T')[0];
    const _activeScheduleVersion = propsActiveScheduleVersion;

    // Get flash data from page props
    const pageProps = usePage<PageProps>().props;
    const flash = pageProps.flash as FlashData | undefined;


    const [schedules, setSchedules] = useState(propsSchedules || []);
    const [_alerts] = useState(propsAlerts || []);
    const [alertStats] = useState({
        totalAlerts: propsAlertStats?.total || 0,
        criticalAlerts: propsAlertStats?.by_severity?.error || 0,
        warningAlerts: propsAlertStats?.by_severity?.warning || 0,
    });

    // State for order selection modal - now replaced with navigation to setup page

    // State for progress modal
    const [showProgress, setShowProgress] = useState(false);
    const [progressData, setProgressData] = useState<{
        job_id: string;
        websocket_channel: string;
        version_id: number;
    } | null>(null);

    // Track expanded state for orders
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(
        new Set(orders.map((o) => o.id)) // All expanded by default
    );

    // Track if scheduling is in progress
    const [_isScheduling, setIsScheduling] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Scheduler', href: '' },
    ];

    // Transform data for the scheduler component
    const schedulerData = useMemo(() => {
        // Get orders from real props
        const ordersData = orders;

        // Group schedules by manufacturing order and transform to steps
        const orderStepsMap = new Map<number, ScheduleStep[]>();

        schedules.forEach((schedule) => {
            const step = schedule.manufacturing_step;
            const route = step?.manufacturing_route;
            const orderId = route?.manufacturing_order_id;


            if (!orderId || !step) return;

            if (!orderStepsMap.has(orderId)) {
                orderStepsMap.set(orderId, []);
            }

            orderStepsMap.get(orderId)!.push({
                id: `${orderId}-${schedule.id}`, // Create unique ID by combining order ID and schedule ID
                manufacturing_step_id: step.id,
                sequence_number: (step as ManufacturingStep & { step_number?: number }).step_number || 0,
                name: step.name,
                description: step.description,
                work_cell_id: schedule.work_cell_id,
                work_cell: workCells.find((wc) => wc.id === schedule.work_cell_id),

                // Scheduling fields
                planned_start_date: schedule.scheduled_start,
                planned_end_date: schedule.scheduled_end,
                actual_start_date: (step as ManufacturingStep & { actual_start_date?: string }).actual_start_date,
                actual_end_date: (step as ManufacturingStep & { actual_end_date?: string }).actual_end_date,
                duration_hours: (step as ManufacturingStep & { estimated_duration?: number }).estimated_duration || 0,
                setup_time_hours: (step as ManufacturingStep & { setup_time?: number }).setup_time || 0,

                // Progress tracking
                status: step.status,
                percent_complete: (step as ManufacturingStep & { progress_percentage?: number }).progress_percentage || 0,
                quantity_completed: formatNumber((step as ManufacturingStep & { quantity_completed?: number }).quantity_completed || 0),
                quantity_remaining: formatNumber((step as ManufacturingStep & { quantity_remaining?: number }).quantity_remaining || 0),

                // Hierarchy
                parent_step_id: null, // Will be set based on BOM structure if needed
                is_milestone: false,
                level: 1,
                expanded: true,

                // Manufacturing specifics
                operation_type: (step as ManufacturingStep & { step_type?: string }).step_type || 'production',
                required_resources: [],

                // Dependencies
                predecessors: (step as ManufacturingStep & { depends_on_step_id?: number }).depends_on_step_id ? [(step as ManufacturingStep & { depends_on_step_id?: number }).depends_on_step_id!] : [],
                successors: (step as ManufacturingStep & { dependents?: Array<{ dependent_step_id: number }> }).dependents?.map((d) => d.dependent_step_id) || [],

                // UI helpers
                can_start: step.status !== 'pending',
                is_critical_path: false,
                slack_hours: 0,

                // Lock status
                is_locked: schedule.is_locked,
                locked_by: schedule.locked_by,
                locked_at: schedule.locked_at,
            });
        });

        // Transform orders with their steps
        const transformedOrders: TransformedOrder[] = ordersData.map((order) => {
            const orderSteps = orderStepsMap.get(order.id) || [];

            return {
                id: order.id,
                order_number: order.order_number,
                name: order.item?.name || order.order_number,
                status: order.status,
                priority: order.priority,
                requested_date: order.requested_date,
                quantity: order.quantity,
                unit_of_measure: order.unit_of_measure,
                parent_order_id: (order as ManufacturingOrder & { parent_id?: number }).parent_id,
                children: [] as TransformedOrder[], // Will be populated based on parent_order_id relationships
                steps: orderSteps,
                expanded: expandedOrders.has(order.id), // Use expandedOrders state
                level: 0,
            };
        });

        // Build parent-child relationships
        const orderMap = new Map(transformedOrders.map((o) => [o.id, o]));
        transformedOrders.forEach((order) => {
            if (order.parent_order_id) {
                const parent = orderMap.get(order.parent_order_id);
                if (parent) {
                    parent.children.push(order);
                    order.level = parent.level + 1;
                }
            }
        });

        // Filter out child orders from root level
        const rootOrders = transformedOrders.filter((o) => !o.parent_order_id);


        return {
            orders: rootOrders,
            workCells: workCells.map((wc) => ({
                ...wc,
                scheduled_steps: Array.from(orderStepsMap.values())
                    .flat()
                    .filter((step) => step.work_cell_id === wc.id)
                    .map((step) => ({
                        step_id: step.id,
                        start_time: step.planned_start_date,
                        end_time: step.planned_end_date,
                        manufacturing_order_id: ordersData.find((o) =>
                            orderStepsMap.get(o.id)?.some(s => s.id === step.id)
                        )?.id,
                        status: step.status,
                    })),
            })),
        };
    }, [orders, schedules, workCells, expandedOrders]);

    const _handleScheduleUpdate = useCallback((updatedSchedule: ProductionSchedule) => {
        // Update local state
        setSchedules((prev) => prev.map((s) =>
            s.id === updatedSchedule.id ? updatedSchedule : s
        ));

        // Here you would typically make an API call to update the backend
        // router.put(route('production.scheduler.update', updatedSchedule.id), updatedSchedule);
    }, []);

    const handleOrderToggle = useCallback((orderId: number) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    }, []);

    // Handle scheduler started event from order selection modal
    const handleSchedulerStarted = useCallback((jobData: {
        job_id: string;
        websocket_channel: string;
        version_id: number;
    }) => {
        // Set the progress data and show the progress modal
        setProgressData(jobData);
        setShowProgress(true);
        setIsScheduling(true);
    }, []);

    // Handle scheduler completion
    const handleSchedulerComplete = useCallback(() => {
        setShowProgress(false);
        setProgressData(null);
        setIsScheduling(false);
        // The SchedulerProgress component already handles the page reload
    }, []);

    // Handle flash data for scheduling
    useEffect(() => {
        // Check if we have scheduling job info from flash
        if (flash?.schedulingJob) {
            handleSchedulerStarted({
                job_id: flash.schedulingJob.job_id,
                websocket_channel: flash.schedulingJob.websocket_channel,
                version_id: flash.schedulingJob.version_id,
            });
        }
    }, [flash, handleSchedulerStarted]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Scheduler v2" />

            <ScrollSyncProvider>
                <ProductionScheduler
                    steps={schedulerData.orders.map(order => ({
                        id: order.id,
                        order_number: order.order_number,
                        family_id: undefined,
                        family_name: undefined,
                        item_number: undefined,
                        item_name: order.name,
                        quantity: order.quantity,
                        scheduled_start: order.steps.length > 0 ? order.steps[0].planned_start_date : undefined,
                        scheduled_end: order.steps.length > 0 ? order.steps[order.steps.length - 1].planned_end_date : undefined,
                        steps: order.steps.map((step, _index) => ({
                            id: Number(step.id),
                            order_id: order.id,
                            order_number: order.order_number,
                            step_id: step.manufacturing_step_id,
                            step_name: step.name,
                            workcell_id: step.work_cell_id || 0,
                            scheduled_start: step.planned_start_date || '',
                            scheduled_end: step.planned_end_date || '',
                            duration: step.duration_hours * 60, // Convert hours to minutes
                            is_locked: step.is_locked || false
                        })),
                        is_expanded: order.expanded
                    }))}
                    workCells={schedulerData.workCells}
                    currentVersion={currentVersion!}
                    publishedVersion={publishedVersion}
                    alertStats={alertStats}
                    schedulingAlgorithms={schedulingAlgorithms}
                    filters={filters}
                    onUpdate={(data) => {
                        // TODO: Convert data format to ProductionSchedule format
                        console.log('Schedule update:', data);
                    }}
                    onOrderToggle={handleOrderToggle}
                    onOpenOrderSelection={() => router.visit(route('production.scheduler.setup'))}
                />
            </ScrollSyncProvider>

            {/* Order Selection Modal - replaced with navigation to setup page */}

            {/* Progress Modal */}
            {progressData && (
                <SchedulerProgress
                    open={showProgress}
                    onOpenChange={setShowProgress}
                    jobId={progressData.job_id}
                    versionId={progressData.version_id}
                    websocketChannel={progressData.websocket_channel}
                    onComplete={handleSchedulerComplete}
                />
            )}
        </AppLayout>
    );
}
