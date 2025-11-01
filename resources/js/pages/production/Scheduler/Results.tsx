import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Calendar,
    Users,
    AlertTriangle,
    ArrowLeft,
    Download
} from 'lucide-react';
import FamilyScheduleView from './components/FamilyScheduleView';
import MetricsDisplay from './components/MetricsDisplay';
import AlertsList from './components/AlertsList';
import { ScheduleVersion, ScheduleAlert } from '@/types/scheduler';

interface ScheduleFamily {
    top_parent: string;
    [key: string]: unknown;
}

interface ScheduleMetrics {
    total_steps: number;
    families_processed: number;
    average_utilization: number;
    makespan: number;
    on_time_rate: number;
    fallbacks_used?: number;
}

interface ResultsPageProps {
    version: ScheduleVersion;
    metrics: ScheduleMetrics;
    families: ScheduleFamily[];
    alerts: ScheduleAlert[];
}

export default function Results({
    version,
    metrics,
    families,
    alerts
}: ResultsPageProps) {
    const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

    const criticalAlerts = alerts.filter(a => a.severity === 'error');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');
    const infoAlerts: ScheduleAlert[] = [];

    const handlePublish = () => {
        if (criticalAlerts.length > 0) {
            if (!confirm('There are critical alerts. Are you sure you want to publish this schedule?')) {
                return;
            }
        }

        router.post(route('production.scheduler.versions.publish', version.id), {}, {
            onSuccess: () => {
                alert('Schedule published successfully!');
            }
        });
    };

    const handleExport = () => {
        // TODO: Implement export functionality
        alert('Export functionality coming soon!');
    };

    return (
        <>
            <Head title="Scheduling Results" />

            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(route('production.scheduler.index'))}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Scheduler
                        </Button>
                        <h1 className="text-3xl font-bold">Scheduling Results</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={version.status === 'published'}
                        >
                            {version.status === 'published' ? 'Published' : 'Publish Schedule'}
                        </Button>
                    </div>
                </div>

                {/* Alerts Summary */}
                {alerts.length > 0 && (
                    <Alert className={criticalAlerts.length > 0 ? 'border-red-200' : 'border-yellow-200'}>
                        <AlertTriangle className="w-5 h-5" />
                        <AlertTitle>Schedule Alerts</AlertTitle>
                        <AlertDescription>
                            <div className="flex gap-4 mt-2">
                                {criticalAlerts.length > 0 && (
                                    <Badge variant="destructive">
                                        {criticalAlerts.length} Critical
                                    </Badge>
                                )}
                                {warningAlerts.length > 0 && (
                                    <Badge variant="secondary">
                                        {warningAlerts.length} Warnings
                                    </Badge>
                                )}
                                {infoAlerts.length > 0 && (
                                    <Badge variant="secondary">
                                        {infoAlerts.length} Info
                                    </Badge>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Metrics Overview */}
                <MetricsDisplay metrics={metrics} version={{
                    id: version.id,
                    version_number: version.version_number,
                    published_at: version.published_at,
                    published_by: version.published_by ? { name: 'Unknown' } : undefined,
                    created_at: version.created_at,
                    created_by: version.created_by ? { name: 'Unknown' } : undefined,
                }} />

                {/* Main Content Tabs */}
                <Tabs defaultValue="families" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="families">
                            <Users className="w-4 h-4 mr-2" />
                            Family View
                        </TabsTrigger>
                        <TabsTrigger value="timeline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Timeline View
                        </TabsTrigger>
                        <TabsTrigger value="alerts">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Alerts ({alerts.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="families" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Scheduled Families</span>
                                    <Badge variant="secondary">
                                        {families.length} families
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {families.map((family, index) => (
                                        <FamilyScheduleView
                                            key={family.top_parent}
                                            family={(family as unknown) as {
                                                top_parent: string;
                                                priority: number;
                                                orders: Array<{
                                                    order_number: string;
                                                    schedules: Array<{
                                                        id: number;
                                                        step_name: string;
                                                        work_cell: string;
                                                        scheduled_start: string;
                                                        scheduled_end: string;
                                                        is_locked: boolean;
                                                        conflicts: Array<{ id: string; description: string }>;
                                                    }>;
                                                }>;
                                                metrics: {
                                                    start_date: string;
                                                    end_date: string;
                                                    total_duration: number;
                                                    utilization: number;
                                                };
                                            }}
                                            index={index}
                                            isExpanded={selectedFamily === family.top_parent}
                                            onToggle={() => setSelectedFamily(
                                                selectedFamily === family.top_parent ? null : family.top_parent
                                            )}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timeline">
                        <Card>
                            <CardHeader>
                                <CardTitle>Timeline View</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-96 text-gray-500">
                                    <div className="text-center">
                                        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>Timeline visualization coming soon</p>
                                        <p className="text-sm mt-2">
                                            This will show Gantt-style view with family boundaries
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="alerts">
                        <AlertsList                         alerts={alerts.map(alert => ({
                            ...alert,
                            type: alert.alert_type || 'unknown',
                        })) as Array<{
                            id: number;
                            schedule_version_id?: number;
                            type: string;
                            severity: 'error' | 'warning' | 'info';
                            message: string;
                            details?: Record<string, unknown>;
                            actions?: Array<{
                                label: string;
                                action: string;
                                params: Record<string, unknown>;
                            }>;
                            resolved_at?: string;
                        }>} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
