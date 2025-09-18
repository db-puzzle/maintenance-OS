import React, { useState } from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { ScheduleAlert } from '@/types/scheduler';

interface Props {
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
    onClose: () => void;
    onResolveAlert: (alertId: number) => void;
}

export default function AlertsPanel({
    alerts,
    alertStats,
    onClose,
    onResolveAlert,
}: Props) {
    const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'resolved'>('all');

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return !alert.resolved;
        if (filter === 'resolved') return alert.resolved;
        return alert.severity === filter && !alert.resolved;
    });

    const getAlertIcon = (alert: ScheduleAlert) => {
        if (alert.resolved) return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (alert.severity === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
        return <AlertTriangle className="h-4 w-4 text-warning" />;
    };

    const getAlertTypeLabel = (type: string) => {
        switch (type) {
            case 'capacity_overrun':
                return 'Capacity Overrun';
            case 'dependency_violation':
                return 'Dependency Violation';
            case 'late_delivery':
                return 'Late Delivery';
            default:
                return type;
        }
    };

    const renderAlert = (alert: ScheduleAlert) => (
        <div
            key={alert.id}
            className={cn(
                "p-3 border rounded-lg mb-2",
                alert.resolved && "opacity-60",
                !alert.resolved && alert.severity === 'error' && "border-destructive/50 bg-destructive/5",
                !alert.resolved && alert.severity === 'warning' && "border-warning/50 bg-warning/5"
            )}
        >
            <div className="flex items-start gap-2">
                {getAlertIcon(alert)}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                            {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                        {alert.manufacturing_order && (
                            <span className="text-sm font-medium">
                                {alert.manufacturing_order.order_number}
                            </span>
                        )}
                        {alert.manufacturing_step && (
                            <span className="text-sm text-muted-foreground">
                                - {alert.manufacturing_step.name}
                            </span>
                        )}
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    {alert.work_cell && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Work Cell: {alert.work_cell.name}
                        </p>
                    )}
                </div>
                {!alert.resolved && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResolveAlert(alert.id)}
                    >
                        Resolve
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <Sheet open onOpenChange={onClose}>
            <SheetContent className="w-[500px] sm:max-w-[500px]">
                <SheetHeader>
                    <SheetTitle>Schedule Alerts</SheetTitle>
                    <SheetDescription>
                        Review and resolve scheduling conflicts and warnings
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold text-destructive">
                                {alertStats.by_severity.error}
                            </div>
                            <div className="text-xs text-muted-foreground">Errors</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold text-warning">
                                {alertStats.by_severity.warning}
                            </div>
                            <div className="text-xs text-muted-foreground">Warnings</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold text-green-500">
                                {alerts.filter(a => a.resolved).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Resolved</div>
                        </div>
                    </div>

                    {/* Alert type breakdown */}
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span>Capacity Overruns</span>
                            <Badge variant="outline">{alertStats.by_type.capacity_overrun}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Dependency Violations</span>
                            <Badge variant="outline">{alertStats.by_type.dependency_violation}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Late Deliveries</span>
                            <Badge variant="outline">{alertStats.by_type.late_delivery}</Badge>
                        </div>
                    </div>

                    {/* Tabs for filtering */}
                    <Tabs value={filter} onValueChange={setFilter as any}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">
                                Active ({alertStats.unresolved})
                            </TabsTrigger>
                            <TabsTrigger value="error">
                                Errors ({alertStats.by_severity.error})
                            </TabsTrigger>
                            <TabsTrigger value="warning">
                                Warnings ({alertStats.by_severity.warning})
                            </TabsTrigger>
                            <TabsTrigger value="resolved">
                                Resolved ({alerts.filter(a => a.resolved).length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={filter}>
                            <ScrollArea className="h-[400px] mt-4">
                                {filteredAlerts.length > 0 ? (
                                    filteredAlerts.map(renderAlert)
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No alerts to display
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}
