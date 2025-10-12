import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    BarChart3,
    Clock,
    Users,
    CheckCircle,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';

interface MetricsDisplayProps {
    metrics: {
        total_steps: number;
        families_processed: number;
        average_utilization: number;
        makespan: number;
        on_time_rate: number;
        fallbacks_used?: number;
    };
    version: any;
}

export default function MetricsDisplay({ metrics, version }: MetricsDisplayProps) {
    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h ${mins}m`;
        }
        return `${hours}h ${mins}m`;
    };

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 80) return 'text-green-600 bg-green-100';
        if (utilization >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getOnTimeColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600 bg-green-100';
        if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Steps */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Steps</p>
                            <p className="text-2xl font-bold">{metrics.total_steps}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across {metrics.families_processed} families
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Makespan */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Duration</p>
                            <p className="text-2xl font-bold">{formatDuration(metrics.makespan)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Start to finish
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Utilization */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Avg Utilization</p>
                            <p className="text-2xl font-bold">{metrics.average_utilization.toFixed(1)}%</p>
                            <Progress
                                value={metrics.average_utilization}
                                className="mt-2 h-2"
                            />
                        </div>
                        <div className={`p-3 rounded-lg ml-4 ${getUtilizationColor(metrics.average_utilization)}`}>
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* On-Time Rate */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">On-Time Rate</p>
                            <p className="text-2xl font-bold">{metrics.on_time_rate.toFixed(1)}%</p>
                            <Progress
                                value={metrics.on_time_rate}
                                className="mt-2 h-2"
                            />
                        </div>
                        <div className={`p-3 rounded-lg ml-4 ${getOnTimeColor(metrics.on_time_rate)}`}>
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Algorithm Info */}
            {version.last_algorithm_used && (
                <Card className="md:col-span-2 lg:col-span-4">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Algorithm Used</p>
                                <p className="text-lg font-semibold mt-1">
                                    {version.last_algorithm_used === 'asap' ? 'ASAP (Forward)' : 'Due Date (Backward)'}
                                </p>
                                {metrics.fallbacks_used !== undefined && metrics.fallbacks_used > 0 && (
                                    <div className="flex items-center gap-2 mt-2 text-yellow-600">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm">
                                            {metrics.fallbacks_used} families required forward fallback
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <p>Execution time: {version.algorithm_execution_time?.toFixed(2)}s</p>
                                <p>Completed: {new Date(version.last_scheduled_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
