import React, { useState, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { toast } from 'sonner';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import SchedulerToolbar from '@/components/production/scheduler/SchedulerToolbar';
import SchedulerGrid from '@/components/production/scheduler/SchedulerGrid';
import SchedulerTimeline from '@/components/production/scheduler/SchedulerTimeline';
import ResourceTimeline from '@/components/production/scheduler/ResourceTimeline';
import AlertsPanel from '@/components/production/scheduler/AlertsPanel';
import SchedulingProgressModal from '@/components/production/scheduler/SchedulingProgressModal';
import { ScheduleVersion, ProductionSchedule, ScheduleAlert } from '@/types/scheduler';
import { useSchedulingProgressWithParams } from '@/hooks/useSchedulingProgress';

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

export default function SchedulerIndex({
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
    const [schedules, _setSchedules] = useState(initialSchedules);
    const [alerts, setAlerts] = useState(initialAlerts);
    const [_alertStats, _setAlertStats] = useState(initialAlertStats);
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null);
    const [showAlerts, setShowAlerts] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [timeRange, setTimeRange] = useState({
        start: new Date(filters.start_date),
        end: new Date(filters.end_date),
    });
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    // Use scheduling progress hook
    const { state: schedulingState, startScheduling, closeModal } = useSchedulingProgressWithParams();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Production', href: '/production/orders' },
        { title: 'Scheduler', href: '' },
    ];

    // Group schedules by manufacturing order
    const scheduledOrders = useMemo(() => {
        const orderMap = new Map<number, {
            order: ManufacturingOrder;
            schedules: ProductionSchedule[];
        }>();

        // First, add all orders to the map
        orders.forEach(order => {
            orderMap.set(order.id, { order, schedules: [] });
        });

        // Then, add schedules to their respective orders
        schedules.forEach(schedule => {
            const orderId = schedule.manufacturing_step.manufacturing_route.manufacturing_order_id;
            if (orderMap.has(orderId)) {
                orderMap.get(orderId)!.schedules.push(schedule);
            }
        });

        return Array.from(orderMap.values());
    }, [schedules, orders]);

    const handleRunScheduler = useCallback(async (algorithm: string) => {
        // Check if version can be scheduled
        if (currentVersion.status === 'published') {
            toast.error('Cannot run scheduler on published version');
            return;
        }

        if (currentVersion.scheduling_status === 'running' || currentVersion.scheduling_status === 'queued') {
            toast.error('A scheduling job is already running for this version');
            return;
        }

        // Start scheduling with progress tracking
        await startScheduling({
            versionId: currentVersion.id,
            algorithm,
            startDate: filters.start_date,
            endDate: filters.end_date,
            manufacturingOrderIds: selectedOrders.length > 0 ? selectedOrders : undefined,
        });
    }, [currentVersion, filters, selectedOrders, startScheduling]);

    const handleScheduleUpdate = useCallback(async (
        scheduleId: number,
        newStart: Date,
        newEnd: Date
    ) => {
        try {
            await router.put(
                route('production.scheduler.update', scheduleId),
                {
                    scheduled_start: newStart.toISOString(),
                    scheduled_end: newEnd.toISOString(),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Schedule will be refreshed through Inertia
                        router.reload({ only: ['schedules'] });
                        toast.success('Schedule updated successfully');
                    },
                    onError: (errors) => {
                        toast.error(errors.message || 'Failed to update schedule');
                    },
                }
            );
        } catch (error) {
            console.error('Failed to update schedule:', error);
        }
    }, []);

    const handleToggleLock = useCallback(async (scheduleId: number) => {
        try {
            await router.post(
                route('production.scheduler.toggle-lock', scheduleId),
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Schedule will be refreshed through Inertia
                        router.reload({ only: ['schedules'] });
                        toast.success('Lock status updated');
                    },
                }
            );
        } catch (error) {
            console.error('Failed to toggle lock:', error);
        }
    }, []);

    const handlePublish = useCallback(async () => {
        if (_alertStats.by_severity.error > 0) {
            toast.error('Cannot publish schedule with unresolved errors');
            return;
        }

        try {
            await router.post(
                route('production.scheduler.versions.publish', currentVersion.id),
                {},
                {
                    preserveState: false,
                    onSuccess: () => {
                        toast.success('Schedule published successfully');
                    },
                    onError: (errors) => {
                        toast.error(errors.message || 'Failed to publish schedule');
                    },
                }
            );
        } catch (error) {
            console.error('Failed to publish schedule:', error);
        }
    }, [currentVersion.id]);

    const canPublish = auth.user.permissions?.includes('production.schedule.publish') || false;

    const handleDateRangeChange = useCallback((range: { start: Date; end: Date }) => {
        setTimeRange(range);
        // Reload the page with new date filters
        router.get(route('production.scheduler.index'), {
            ...filters,
            start_date: range.start.toISOString().split('T')[0],
            end_date: range.end.toISOString().split('T')[0],
            search: searchQuery,
        }, {
            preserveState: false,
            preserveScroll: true,
        });
    }, [filters, searchQuery]);

    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        // Debounce search
        const timer = setTimeout(() => {
            router.get(route('production.scheduler.index'), {
                ...filters,
                search: query,
            }, {
                preserveState: false,
                preserveScroll: true,
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title="Production Scheduler" />

            <div className="flex flex-col h-full">
                <SchedulerToolbar
                    currentVersion={currentVersion}
                    publishedVersion={publishedVersion}
                    schedulingAlgorithms={schedulingAlgorithms}
                    alertStats={_alertStats}
                    canPublish={canPublish}
                    isRunningScheduler={schedulingState.status === 'running' || schedulingState.status === 'queued'}
                    zoomLevel={zoomLevel}
                    dateRange={timeRange}
                    searchQuery={searchQuery}
                    onRunScheduler={handleRunScheduler}
                    onPublish={handlePublish}
                    onShowAlerts={() => setShowAlerts(!showAlerts)}
                    onZoomIn={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}
                    onZoomOut={() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))}
                    onZoomFit={() => setZoomLevel(1)}
                    onDateRangeChange={handleDateRangeChange}
                    onSearchChange={handleSearchChange}
                />

                <ResizablePanelGroup
                    direction="vertical"
                    className="flex-1 min-h-0"
                >
                    <ResizablePanel defaultSize={70} minSize={50}>
                        <ResizablePanelGroup direction="horizontal">
                            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                                <SchedulerGrid
                                    orders={scheduledOrders}
                                    selectedOrders={selectedOrders}
                                    onOrderSelect={setSelectedOrders}
                                    onScheduleSelect={setSelectedSchedule}
                                />
                            </ResizablePanel>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={70}>
                                <SchedulerTimeline
                                    schedules={schedules}
                                    orders={scheduledOrders}
                                    workCells={workCells}
                                    timeRange={timeRange}
                                    zoomLevel={zoomLevel}
                                    selectedSchedule={selectedSchedule}
                                    onScheduleUpdate={handleScheduleUpdate}
                                    onScheduleSelect={setSelectedSchedule}
                                    onToggleLock={handleToggleLock}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={30} minSize={20}>
                        <ResourceTimeline
                            workCells={workCells}
                            schedules={schedules}
                            timeRange={timeRange}
                            zoomLevel={zoomLevel}
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>

                {showAlerts && (
                    <AlertsPanel
                        alerts={alerts}
                        alertStats={_alertStats}
                        onClose={() => setShowAlerts(false)}
                        onResolveAlert={(alertId) => {
                            // Handle alert resolution
                            router.post(
                                route('production.scheduler.alerts.resolve', [currentVersion.id, alertId]),
                                {},
                                {
                                    preserveState: true,
                                    onSuccess: () => {
                                        setAlerts(prev => prev.map(a =>
                                            a.id === alertId ? { ...a, resolved: true } : a
                                        ));
                                        toast.success('Alert resolved');
                                    },
                                }
                            );
                        }}
                    />
                )}

                {/* Scheduling Progress Modal */}
                <SchedulingProgressModal
                    isOpen={schedulingState.isOpen}
                    onClose={closeModal}
                    jobId={schedulingState.jobId}
                    scheduleVersionId={currentVersion.id}
                    algorithm={schedulingState.algorithm}
                    onComplete={() => {
                        toast.success('Schedule generated successfully');
                        // Data will be auto-refreshed by the hook
                    }}
                    onError={(error) => {
                        toast.error(error);
                    }}
                />
            </div>
        </AppLayout>
    );
}
