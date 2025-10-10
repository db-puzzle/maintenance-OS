import React, { useState, useMemo, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { ScheduleVersion, ProductionSchedule, ScheduleAlert } from '@/types/scheduler';
import { ScrollSyncProvider } from '@/components/production/scheduler-v2/contexts/ScrollSyncContext';
import { ProductionScheduler } from '@/components/production/scheduler-v2/ProductionScheduler';
import { formatNumber } from '@/utils/number';
import { getCleanDummyData } from './clean-dummy-data';

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
}: Props) {
    // Use dummy data instead of props
    const dummyData = getCleanDummyData();

    // Force use dummy data - ignore props
    const currentVersion = dummyData.currentVersion;
    const publishedVersion = dummyData.publishedVersion;
    const workCells = dummyData.workCells;
    const filters = dummyData.filters;
    const schedulingAlgorithms = dummyData.schedulingAlgorithms;

    const [schedules, setSchedules] = useState(dummyData.schedules);
    const [alerts] = useState(dummyData.alerts);
    const [alertStats] = useState(dummyData.alertStats);

    // Track expanded state for orders
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(
        new Set(dummyData.orders.map((o: any) => o.id)) // All expanded by default
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Scheduler', href: '' },
    ];

    // Transform data for the scheduler component
    const schedulerData = useMemo(() => {
        // Get orders from dummy data
        const orders = dummyData.orders;

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
                predecessors: (step as any).dependencies?.map((d: any) => d.predecessor_step_id) || [],
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
        const transformedOrders = orders.map((order: any) => {
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
                        manufacturing_order_id: orders.find((o: any) =>
                            orderStepsMap.get(o.id)?.some(s => s.id === step.id)
                        )?.id,
                        status: step.status,
                    })),
            })),
        };
    }, [dummyData.orders, schedules, workCells, expandedOrders]);

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Scheduler v2" />

            <ScrollSyncProvider>
                <ProductionScheduler
                    steps={schedulerData.orders}
                    workCells={schedulerData.workCells}
                    currentVersion={currentVersion}
                    publishedVersion={publishedVersion}
                    alerts={alerts}
                    alertStats={alertStats}
                    schedulingAlgorithms={schedulingAlgorithms}
                    filters={filters}
                    onUpdate={handleScheduleUpdate}
                    onOrderToggle={handleOrderToggle}
                />
            </ScrollSyncProvider>
        </AppLayout>
    );
}

