import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useScheduler } from '@/hooks/production/useScheduler';
import { X, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
    onClose: () => void;
}

export function AlertsPanel({ onClose }: AlertsPanelProps) {
    const scheduler = useScheduler();
    
    const unresolvedAlerts = scheduler.alerts?.filter(a => !a.resolved) || [];
    const resolvedAlerts = scheduler.alerts?.filter(a => a.resolved) || [];

    const getAlertIcon = (type: string, severity: string) => {
        if (severity === 'error') {
            return <XCircle className="h-4 w-4 text-destructive" />;
        }
        return <AlertTriangle className="h-4 w-4 text-warning" />;
    };

    const getAlertTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            capacity_overrun: 'Capacity Overrun',
            dependency_violation: 'Dependency Violation',
            late_delivery: 'Late Delivery',
        };
        return labels[type] || type;
    };

    const handleResolveAlert = async (alertId: number) => {
        await scheduler.resolveAlert(alertId);
    };

    const handleNavigateToItem = (alert: any) => {
        onClose();
        
        if (alert.manufacturing_order_id) {
            scheduler.highlightItem('order', alert.manufacturing_order_id);
        } else if (alert.manufacturing_step_id) {
            scheduler.highlightItem('step', alert.manufacturing_step_id);
        }
    };

    return (
        <div className="absolute top-0 right-0 h-full w-96 bg-background border-l shadow-lg z-20">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <h3 className="font-semibold">Schedule Alerts</h3>
                        {unresolvedAlerts.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {unresolvedAlerts.length}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {/* Unresolved Alerts */}
                        {unresolvedAlerts.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-muted-foreground">
                                    Unresolved Alerts ({unresolvedAlerts.length})
                                </h4>
                                {unresolvedAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "border rounded-lg p-3 space-y-2",
                                            alert.severity === 'error' && "border-destructive/50 bg-destructive/5"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                                {getAlertIcon(alert.alert_type, alert.severity)}
                                                <div className="space-y-1">
                                                    <div className="font-medium text-sm">
                                                        {getAlertTypeLabel(alert.alert_type)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {alert.message}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={alert.severity === 'error' ? 'destructive' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {alert.severity}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleNavigateToItem(alert)}
                                            >
                                                View Item
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleResolveAlert(alert.id)}
                                            >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Resolve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* No alerts message */}
                        {unresolvedAlerts.length === 0 && (
                            <div className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <p className="text-muted-foreground">
                                    No unresolved alerts
                                </p>
                            </div>
                        )}

                        {/* Resolved Alerts */}
                        {resolvedAlerts.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="font-medium text-sm text-muted-foreground">
                                    Resolved Alerts ({resolvedAlerts.length})
                                </h4>
                                {resolvedAlerts.slice(0, 5).map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="border rounded-lg p-3 opacity-60"
                                    >
                                        <div className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                            <div className="space-y-1 flex-1">
                                                <div className="font-medium text-sm line-through">
                                                    {getAlertTypeLabel(alert.alert_type)}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {alert.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {resolvedAlerts.length > 5 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        And {resolvedAlerts.length - 5} more resolved alerts
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}