import React, { useState, useMemo, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { ScheduleVersion, ProductionSchedule, ScheduleAlert } from '@/types/scheduler';
import { ScrollSyncProvider } from '@/components/production/scheduler-v2/contexts/ScrollSyncContext';
import { ProductionScheduler } from '@/components/production/scheduler-v2/ProductionScheduler';
import { formatNumber } from '@/utils/number';
import SchedulerOrderSelection from '@/components/production/SchedulerOrderSelection';
import { toast } from 'sonner';

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
    activeScheduleVersion?: any;
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
    const orders = propsOrders || [];
    const workCells = propsWorkCells || [];
    const filters = propsFilters || { start_date: '', end_date: '' };
    const schedulingAlgorithms = propsSchedulingAlgorithms || {};
    const algorithms = propsAlgorithms || [];
    const defaultStartDate = propsDefaultStartDate || new Date().toISOString().split('T')[0];
    const activeScheduleVersion = propsActiveScheduleVersion;

    const [schedules, setSchedules] = useState(propsSchedules || []);
    const [alerts] = useState(propsAlerts || []);
    const [alertStats] = useState(propsAlertStats || {
        total: 0,
        unresolved: 0,
        by_type: { capacity_overrun: 0, dependency_violation: 0, late_delivery: 0 },
        by_severity: { error: 0, warning: 0 }
    });

    // State for order selection modal
    const [showOrderSelection, setShowOrderSelection] = useState(false);

    // Track expanded state for orders
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(
        new Set(orders.map((o: any) => o.id)) // All expanded by default
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Scheduler', href: '' },
    ];

    // Transform data for the scheduler component
    const schedulerData = useMemo(() => {
        // Get orders from real props
        const ordersData = orders;

        // Group schedules by manufacturing order and transform to steps
        const orderStepsMap = new Map<number, any[]>();

        schedules.forEach((schedule: any) => {
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
                sequence_number: (step as any).step_number || 0,
                name: step.name,
                description: step.description,
                work_cell_id: schedule.work_cell_id,
                work_cell: workCells.find((wc: any) => wc.id === schedule.work_cell_id),

                // Scheduling fields
                planned_start_date: schedule.scheduled_start,
                planned_end_date: schedule.scheduled_end,
                actual_start_date: (step as any).actual_start_date,
                actual_end_date: (step as any).actual_end_date,
                duration_hours: (step as any).estimated_duration || 0,
                setup_time_hours: (step as any).setup_time || 0,

                // Progress tracking
                status: step.status,
                percent_complete: (step as any).progress_percentage || 0,
                quantity_completed: formatNumber((step as any).quantity_completed || 0),
                quantity_remaining: formatNumber((step as any).quantity_remaining || 0),

                // Hierarchy
                parent_step_id: null, // Will be set based on BOM structure if needed
                is_milestone: false,
                level: 1,
                expanded: true,

                // Manufacturing specifics
                operation_type: (step as any).step_type || 'production',
                required_resources: [],

                // Dependencies
                predecessors: (step as any).depends_on_step_id ? [(step as any).depends_on_step_id] : [],
                successors: (step as any).dependents?.map((d: any) => d.dependent_step_id) || [],

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
        const transformedOrders = ordersData.map((order: any) => {
            const orderSteps = orderStepsMap.get(order.id) || [];

            return {
                id: order.id,
                order_number: order.order_number,
                name: order.item?.name || order.order_number,
                status: order.status,
                priority: order.priority,
                requested_date: order.requested_date,
                quantity: formatNumber(order.quantity),
                unit_of_measure: order.unit_of_measure,
                parent_order_id: (order as any).parent_id,
                children: [] as any[], // Will be populated based on parent_order_id relationships
                steps: orderSteps,
                expanded: expandedOrders.has(order.id), // Use expandedOrders state
                level: 0,
            };
        });

        // Build parent-child relationships
        const orderMap = new Map(transformedOrders.map((o: any) => [o.id, o]));
        transformedOrders.forEach((order: any) => {
            if (order.parent_order_id) {
                const parent = orderMap.get(order.parent_order_id);
                if (parent) {
                    parent.children.push(order);
                    order.level = parent.level + 1;
                }
            }
        });

        // Filter out child orders from root level
        const rootOrders = transformedOrders.filter((o: any) => !o.parent_order_id);


        return {
            orders: rootOrders,
            workCells: workCells.map((wc: any) => ({
                ...wc,
                scheduled_steps: Array.from(orderStepsMap.values())
                    .flat()
                    .filter((step: any) => step.work_cell_id === wc.id)
                    .map((step: any) => ({
                        step_id: step.id,
                        start_time: step.planned_start_date,
                        end_time: step.planned_end_date,
                        manufacturing_order_id: ordersData.find((o: any) =>
                            orderStepsMap.get(o.id)?.some(s => s.id === step.id)
                        )?.id,
                        status: step.status,
                    })),
            })),
        };
    }, [orders, schedules, workCells, expandedOrders]);

    const handleScheduleUpdate = useCallback((updatedSchedule: any) => {
        // Update local state
        setSchedules((prev: any) => prev.map((s: any) =>
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

    // Handle running scheduler from order selection modal
    const handleRunScheduler = useCallback((data: any) => {
        router.post(route('production.scheduler.run'), data, {
            onSuccess: () => {
                toast.success('Scheduling started');
            },
            onError: () => {
                toast.error('Failed to start scheduling');
            },
        });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Scheduler v2" />

            <ScrollSyncProvider>
                <ProductionScheduler
                    steps={schedulerData.orders}
                    workCells={schedulerData.workCells}
                    currentVersion={currentVersion!}
                    publishedVersion={publishedVersion}
                    alerts={alerts}
                    alertStats={alertStats}
                    schedulingAlgorithms={schedulingAlgorithms}
                    filters={filters}
                    onUpdate={handleScheduleUpdate}
                    onOrderToggle={handleOrderToggle}
                    onOpenOrderSelection={() => setShowOrderSelection(true)}
                />
            </ScrollSyncProvider>

            {/* Order Selection Modal */}
            <SchedulerOrderSelection
                open={showOrderSelection}
                onOpenChange={setShowOrderSelection}
                onRunScheduler={handleRunScheduler}
                algorithms={algorithms}
                defaultStartDate={defaultStartDate}
                activeScheduleVersion={activeScheduleVersion}
                currentVersion={currentVersion}
                orders={orders}
                workCells={workCells}
                filters={filters}
            />
        </AppLayout>
    );
}
