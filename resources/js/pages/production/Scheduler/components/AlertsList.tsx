import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertCircle,
    AlertTriangle,
    Info,
    Search,
    ExternalLink
} from 'lucide-react';
import { router } from '@inertiajs/react';

interface ScheduleAlert {
    id: number;
    schedule_version_id?: number;
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    details?: {
        family?: string;
        orders?: string[];
        steps?: number[];
        conflicts?: Array<{ id: string; description: string }>;
        validationErrors?: Array<{ field: string; message: string }>;
    };
    actions?: Array<{
        label: string;
        action: string;
        params: Record<string, unknown>;
    }>;
    resolved_at?: string;
}

interface AlertsListProps {
    alerts: ScheduleAlert[];
}

export default function AlertsList({ alerts }: AlertsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [typeFilter, _setTypeFilter] = useState<string>('all');

    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = searchTerm === '' ||
            alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.type.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
        const matchesType = typeFilter === 'all' || alert.type === typeFilter;

        return matchesSearch && matchesSeverity && matchesType && !alert.resolved_at;
    });

    const _alertTypes = [...new Set(alerts.map(a => a.type))];

    const getAlertIcon = (severity: string) => {
        switch (severity) {
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default:
                return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getAlertVariant = (severity: string) => {
        switch (severity) {
            case 'error':
                return 'destructive';
            case 'warning':
                return 'warning';
            default:
                return 'default';
        }
    };

    const handleAction = (action: { action: string; params: Record<string, unknown> }) => {
        switch (action.action) {
            case 'edit_step':
                window.open(action.params.url as string, '_blank');
                break;
            case 'edit_work_cell':
                window.open(action.params.url as string, '_blank');
                break;
            case 'adjust_dates':
                router.visit(route('production.scheduler.index'), action.params as any);
                break;
            default:
                console.log('Unknown action:', action);
        }
    };

    const resolveAlert = (alertId: number) => {
        router.post(route('production.scheduler.alerts.resolve', [alerts[0]?.schedule_version_id || 0, alertId]), {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Alert resolved
            }
        });
    };

    const alertCounts = {
        error: alerts.filter(a => a.severity === 'error' && !a.resolved_at).length,
        warning: alerts.filter(a => a.severity === 'warning' && !a.resolved_at).length,
        info: alerts.filter(a => a.severity === 'info' && !a.resolved_at).length,
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Schedule Alerts</span>
                        <div className="flex gap-2">
                            {alertCounts.error > 0 && (
                                <Badge variant="destructive">{alertCounts.error} Errors</Badge>
                            )}
                            {alertCounts.warning > 0 && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{alertCounts.warning} Warnings</Badge>
                            )}
                            {alertCounts.info > 0 && (
                                <Badge variant="secondary">{alertCounts.info} Info</Badge>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search alerts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={severityFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSeverityFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                variant={severityFilter === 'error' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSeverityFilter('error')}
                            >
                                Errors
                            </Button>
                            <Button
                                variant={severityFilter === 'warning' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSeverityFilter('warning')}
                            >
                                Warnings
                            </Button>
                            <Button
                                variant={severityFilter === 'info' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSeverityFilter('info')}
                            >
                                Info
                            </Button>
                        </div>
                    </div>

                    {/* Alert List */}
                    <div className="space-y-3">
                        {filteredAlerts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchTerm || severityFilter !== 'all' || typeFilter !== 'all'
                                    ? 'No alerts match your filters'
                                    : 'No active alerts'}
                            </div>
                        ) : (
                            filteredAlerts.map(alert => (
                                <Alert key={alert.id} variant={getAlertVariant(alert.severity) as 'default' | 'destructive'}>
                                    <div className="flex items-start gap-3">
                                        {getAlertIcon(alert.severity)}
                                        <div className="flex-1">
                                            <AlertTitle className="flex items-center justify-between">
                                                <span>{alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                                                <Badge variant="outline">{alert.severity}</Badge>
                                            </AlertTitle>
                                            <AlertDescription className="mt-2 space-y-2">
                                                <p>{alert.message}</p>

                                                {alert.details && (
                                                    <div className="text-sm space-y-1">
                                                        {alert.details.family && (
                                                            <p>Family: <strong>{alert.details.family}</strong></p>
                                                        )}
                                                        {alert.details.orders && (
                                                            <p>Orders: {alert.details.orders.join(', ')}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {alert.actions && alert.actions.length > 0 && (
                                                    <div className="flex gap-2 mt-3">
                                                        {alert.actions.map((action, idx) => (
                                                            <Button
                                                                key={idx}
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleAction(action)}
                                                            >
                                                                <ExternalLink className="w-4 h-4 mr-1" />
                                                                {action.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex justify-end mt-3">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => resolveAlert(alert.id)}
                                                    >
                                                        Mark as Resolved
                                                    </Button>
                                                </div>
                                            </AlertDescription>
                                        </div>
                                    </div>
                                </Alert>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
