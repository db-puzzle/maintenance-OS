import React, { useState, useMemo, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { ScheduleVersion, ProductionSchedule, ScheduleAlert } from '@/types/scheduler';
import { ScrollSyncProvider } from '@/components/production/scheduler-v2/contexts/ScrollSyncContext';
import { ProductionScheduler } from '@/components/production/scheduler-v2/ProductionScheduler';

interface Props extends PageProps {
    currentVersion: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    orders: ManufacturingOrder[];
    schedules: ProductionSchedule[];
    alerts: ScheduleAlert[];
    alertStats: {
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
    workCells: WorkCell[];
    filters: {
        plant_id?: string;
        area_id?: string;
        start_date: string;
        end_date: string;
        search?: string;
    };
    schedulingAlgorithms: Record<string, string>;
}

export default function SchedulerV2Index({
    auth,
    currentVersion,
    publishedVersion,
    orders,
    schedules: initialSchedules,
    alerts: initialAlerts,
    alertStats: initialAlertStats,
    workCells,
    filters,
    schedulingAlgorithms,
}: Props) {
    const [schedules, setSchedules] = useState(initialSchedules);
    const [alerts, setAlerts] = useState(initialAlerts);
    const [alertStats, setAlertStats] = useState(initialAlertStats);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Production', href: '/production/orders' },
        { title: 'Scheduler v2', href: '' },
    ];

    // Transform data for the scheduler component
    const schedulerData = useMemo(() => {
        // Group schedules by manufacturing order and transform to steps
        const orderStepsMap = new Map<number, any[]>();

        schedules.forEach(schedule => {
            const step = schedule.manufacturing_step;
            const route = step.manufacturing_route;
            const orderId = route.manufacturing_order_id;

            if (!orderStepsMap.has(orderId)) {
                orderStepsMap.set(orderId, []);
            }

            orderStepsMap.get(orderId)!.push({
                id: schedule.id,
                manufacturing_step_id: step.id,
                sequence_number: step.step_number,
                name: step.name,
                description: step.description,
                work_cell_id: schedule.work_cell_id,
                work_cell: workCells.find(wc => wc.id === schedule.work_cell_id),

                // Scheduling fields
                planned_start_date: schedule.scheduled_start,
                planned_end_date: schedule.scheduled_end,
                actual_start_date: step.actual_start_date,
                actual_end_date: step.actual_end_date,
                duration_hours: step.estimated_duration,
                setup_time_hours: step.setup_time,

                // Progress tracking
                status: step.status,
                percent_complete: step.progress_percentage || 0,
                quantity_completed: step.quantity_completed || 0,
                quantity_remaining: step.quantity_remaining || 0,

                // Hierarchy
                parent_step_id: null, // Will be set based on BOM structure if needed
                is_milestone: false,
                level: 1,
                expanded: true,

                // Manufacturing specifics
                operation_type: step.step_type || 'production',
                required_resources: [],

                // Dependencies
                predecessors: step.dependencies?.map((d: any) => d.predecessor_step_id) || [],
                successors: step.dependents?.map((d: any) => d.dependent_step_id) || [],

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
        const transformedOrders = orders.map(order => {
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
                parent_order_id: order.parent_order_id,
                children: [], // Will be populated based on parent_order_id relationships
                steps: orderSteps,
                expanded: true,
                level: 0,
            };
        });

        // Build parent-child relationships
        const orderMap = new Map(transformedOrders.map(o => [o.id, o]));
        transformedOrders.forEach(order => {
            if (order.parent_order_id) {
                const parent = orderMap.get(order.parent_order_id);
                if (parent) {
                    parent.children.push(order);
                    order.level = parent.level + 1;
                }
            }
        });

        // Filter out child orders from root level
        const rootOrders = transformedOrders.filter(o => !o.parent_order_id);

        return {
            orders: rootOrders,
            workCells: workCells.map(wc => ({
                ...wc,
                scheduled_steps: orderStepsMap.values()
                    .flat()
                    .filter(step => step.work_cell_id === wc.id)
                    .map(step => ({
                        step_id: step.id,
                        start_time: step.planned_start_date,
                        end_time: step.planned_end_date,
                        manufacturing_order_id: orders.find(o =>
                            orderStepsMap.get(o.id)?.some(s => s.id === step.id)
                        )?.id,
                        status: step.status,
                    })),
            })),
        };
    }, [orders, schedules, workCells]);

    const handleScheduleUpdate = useCallback((updatedSchedule: any) => {
        // Update local state
        setSchedules(prev => prev.map(s =>
            s.id === updatedSchedule.id ? updatedSchedule : s
        ));

        // Here you would typically make an API call to update the backend
        // router.put(route('production.scheduler.update', updatedSchedule.id), updatedSchedule);
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
                />
            </ScrollSyncProvider>
        </AppLayout>
    );
}

