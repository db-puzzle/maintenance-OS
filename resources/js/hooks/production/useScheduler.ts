import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { useSchedulerContext } from '@/contexts/SchedulerContext';
import { format } from 'date-fns';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface ManufacturingOrder {
    id: number;
    order_number: string;
    item: {
        name: string;
        code: string;
    };
    quantity: number;
    quantity_completed: number;
    status: string;
    priority: number;
    requested_date: string | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    children: ManufacturingOrder[];
    steps: ManufacturingStep[];
}

interface ManufacturingStep {
    id: number;
    name: string;
    step_number: number;
    status: string;
    setup_time_minutes: number;
    cycle_time_minutes: number;
    order_quantity?: number;
    depends_on_step_id?: number;
    can_start_when_dependency?: 'completed' | 'in_progress';
    work_cell?: {
        id: number;
        name: string;
    };
    schedule?: {
        id: number;
        scheduled_start: string;
        scheduled_end: string;
        is_locked: boolean;
    };
}

interface WorkCell {
    id: number;
    name: string;
    cell_type: string;
    available_hours_per_day: number;
    efficiency_percentage: number;
    plant?: {
        id: number;
        name: string;
    };
    area?: {
        id: number;
        name: string;
    };
    shift?: {
        id: number;
        name: string;
    };
}

interface ScheduleAlert {
    id: number;
    alert_type: string;
    severity: 'warning' | 'error';
    message: string;
    resolved: boolean;
    manufacturing_order_id?: number;
    manufacturing_step_id?: number;
    work_cell_id?: number;
}

interface ScheduleVersion {
    id: number;
    version_number: number;
    status: 'draft' | 'published';
    created_by: {
        id: number;
        name: string;
    };
    published_by?: {
        id: number;
        name: string;
    };
    published_at?: string;
    created_at: string;
}

export function useScheduler(versionId?: number | null) {
    const context = useSchedulerContext();
    const currentVersionId = versionId ?? context.versionId;

    const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
    const [workCells, setWorkCells] = useState<WorkCell[]>([]);
    const [alerts, setAlerts] = useState<ScheduleAlert[]>([]);
    const [currentVersion, setCurrentVersion] = useState<ScheduleVersion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [zoomLevel, setZoomLevel] = useState('day');
    const [dateRange, setDateRange] = useState({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    });
    const [highlightedItem, setHighlightedItem] = useState<{ type: 'order' | 'step'; id: number } | null>(null);
    const [filteredOrders, setFilteredOrders] = useState<ManufacturingOrder[]>([]);

    // Load initial data
    useEffect(() => {
        if (currentVersionId) {
            loadScheduleData();
        }
    }, [currentVersionId]);

    // Apply search filter to orders
    useEffect(() => {
        setFilteredOrders(orders);
    }, [orders]);

    const loadScheduleData = useCallback(async () => {
        if (!currentVersionId) return;

        setIsLoading(true);
        try {
            // Load version info
            const versionResponse = await fetch(
                route('scheduler.versions.show', { version: currentVersionId }),
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                }
            );
            const versionData = await versionResponse.json();
            setCurrentVersion(versionData.version);

            // Load schedule data
            const scheduleResponse = await fetch(
                route('scheduler.versions.data', { version: currentVersionId }) + 
                `?start_date=${dateRange.start}&end_date=${dateRange.end}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                }
            );
            const scheduleData = await scheduleResponse.json();
            setOrders(scheduleData.orders || []);
            setWorkCells(scheduleData.workCells || []);
            setAlerts(scheduleData.alerts || []);

        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentVersionId, dateRange]);

    const runScheduler = async (algorithm: string) => {
        if (!currentVersionId) return;

        try {
            const response = await fetch(
                route('scheduler.versions.schedule', { version: currentVersionId }),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        algorithm,
                        start_date: dateRange.start,
                        end_date: dateRange.end,
                    }),
                }
            );

            if (response.ok) {
                // Reload data after a short delay to allow the job to process
                setTimeout(() => {
                    loadScheduleData();
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to run scheduler:', error);
        }
    };

    const publishVersion = async () => {
        if (!currentVersionId) return;

        try {
            const response = await fetch(
                route('scheduler.versions.publish', { version: currentVersionId }),
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setCurrentVersion(data.version);
            }
        } catch (error) {
            console.error('Failed to publish version:', error);
        }
    };

    const updateSchedule = async (stepId: number, data: {
        scheduled_start: string;
        scheduled_end: string;
        work_cell_id: number;
    }) => {
        const schedule = getScheduleForStep(stepId);
        if (!schedule) return;

        try {
            const response = await fetch(
                route('scheduler.schedules.update', { schedule: schedule.id }),
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify(data),
                }
            );

            if (response.ok) {
                // Reload data to get updated schedule
                await loadScheduleData();
            }
        } catch (error) {
            console.error('Failed to update schedule:', error);
        }
    };

    const lockSchedule = async (stepId: number) => {
        const schedule = getScheduleForStep(stepId);
        if (!schedule) return;

        try {
            const response = await fetch(
                route('scheduler.schedules.lock', { schedule: schedule.id }),
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                }
            );

            if (response.ok) {
                await loadScheduleData();
            }
        } catch (error) {
            console.error('Failed to lock schedule:', error);
        }
    };

    const unlockSchedule = async (stepId: number) => {
        const schedule = getScheduleForStep(stepId);
        if (!schedule) return;

        try {
            const response = await fetch(
                route('scheduler.schedules.unlock', { schedule: schedule.id }),
                {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                }
            );

            if (response.ok) {
                await loadScheduleData();
            }
        } catch (error) {
            console.error('Failed to unlock schedule:', error);
        }
    };

    const resolveAlert = async (alertId: number) => {
        try {
            const response = await fetch(
                route('scheduler.alerts.resolve', { alert: alertId }),
                {
                    method: 'PUT',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                }
            );

            if (response.ok) {
                setAlerts(alerts.map(a => 
                    a.id === alertId ? { ...a, resolved: true } : a
                ));
            }
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const highlightItem = (type: 'order' | 'step', id: number) => {
        setHighlightedItem({ type, id });
    };

    const searchOrders = (query: string) => {
        if (!query) {
            setFilteredOrders(orders);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = orders.filter(order => 
            order.order_number.toLowerCase().includes(lowerQuery) ||
            order.item.name.toLowerCase().includes(lowerQuery) ||
            order.item.code.toLowerCase().includes(lowerQuery)
        );
        setFilteredOrders(filtered);
    };

    const fitToScreen = () => {
        // This would calculate the optimal zoom level based on the data
        // For now, just set to day view
        setZoomLevel('day');
    };

    // Helper functions
    const getStepById = (stepId: number): ManufacturingStep | null => {
        for (const order of orders) {
            const step = findStepInOrder(order, stepId);
            if (step) return step;
        }
        return null;
    };

    const findStepInOrder = (order: ManufacturingOrder, stepId: number): ManufacturingStep | null => {
        const step = order.steps.find(s => s.id === stepId);
        if (step) return step;

        for (const child of order.children) {
            const childStep = findStepInOrder(child, stepId);
            if (childStep) return childStep;
        }
        return null;
    };

    const getScheduleForStep = (stepId: number) => {
        const step = getStepById(stepId);
        return step?.schedule;
    };

    const getStepsForOrder = (orderId: number): ManufacturingStep[] => {
        const order = findOrderById(orders, orderId);
        if (!order) return [];
        
        const steps: ManufacturingStep[] = [...order.steps];
        
        // Add order quantity to each step for duration calculations
        steps.forEach(step => {
            step.order_quantity = order.quantity;
        });
        
        return steps;
    };

    const findOrderById = (orderList: ManufacturingOrder[], orderId: number): ManufacturingOrder | null => {
        for (const order of orderList) {
            if (order.id === orderId) return order;
            const child = findOrderById(order.children, orderId);
            if (child) return child;
        }
        return null;
    };

    const getSchedulesForWorkCell = (workCellId: number) => {
        const schedules: any[] = [];
        
        const collectSchedules = (orderList: ManufacturingOrder[]) => {
            for (const order of orderList) {
                for (const step of order.steps) {
                    if (step.schedule && step.work_cell?.id === workCellId) {
                        schedules.push({
                            ...step.schedule,
                            manufacturing_step_id: step.id,
                            step_name: step.name,
                            order_number: order.order_number,
                        });
                    }
                }
                collectSchedules(order.children);
            }
        };
        
        collectSchedules(orders);
        return schedules;
    };

    return {
        // State
        orders: filteredOrders,
        workCells,
        alerts,
        currentVersion,
        isLoading,
        zoomLevel,
        dateRange,
        highlightedItem,
        isPublished: currentVersion?.status === 'published',
        
        // Actions
        loadScheduleData,
        runScheduler,
        publishVersion,
        updateSchedule,
        lockSchedule,
        unlockSchedule,
        resolveAlert,
        highlightItem,
        searchOrders,
        fitToScreen,
        setZoomLevel,
        setDateRange,
        
        // Helpers
        getStepById,
        getStepsForOrder,
        getSchedulesForWorkCell,
    };
}