import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    TrendingUp,
    Download,
    RefreshCw
} from 'lucide-react';
import { WorkCell, ManufacturingStep, ManufacturingOrder } from '@/types/production';
import { User } from '@/types';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
    workCell: WorkCell;
    currentWork: {
        queued?: ManufacturingStep[];
        in_progress?: ManufacturingStep[];
        on_hold?: ManufacturingStep[];
    };
    completedWork: {
        steps: ManufacturingStep[];
        byOrder: Record<string, {
            order: ManufacturingOrder;
            steps: ManufacturingStep[];
            total_duration: number;
            quality_pass_rate: number | null;
            completed_at: string;
        }>;
        totalCompleted: number;
        averageDuration: number;
    };
    incomingWork: {
        next_hour: ManufacturingStep[];
        today: ManufacturingStep[];
        tomorrow: ManufacturingStep[];
        later: ManufacturingStep[];
    };
    statistics: {
        oee: number;
        availability: number;
        performance: number;
        quality: number;
        totalCompleted: number;
        averageCycleTime: number;
        totalHoldTime: number;
        utilizationRate: number;
    };
    activeOperators: User[];
    canExecute: boolean;
    dateRange: {
        start: string;
        end: string;
    };
}

export default function WorkCellDashboard({
    workCell,
    currentWork,
    completedWork,
    incomingWork,
    statistics,
    activeOperators,
    canExecute,
    dateRange
}: Props) {
    const [activeTab, setActiveTab] = useState('current');
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Auto-refresh every 30 seconds
    React.useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({ only: ['currentWork', 'statistics', 'activeOperators'] });
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Células de Trabalho', href: '/production/work-cells' },
        { title: workCell.name, href: `/production/work-cells/${workCell.id}` },
    ];

    const handleExecuteStep = (step: ManufacturingStep) => {
        router.visit(window.route('production.steps.execute', step.id));
    };

    interface MetricCardProps {
        title: string;
        value: string | number;
        icon: React.ElementType;
        trend?: { value: number; label: string };
        color?: 'blue' | 'green' | 'yellow' | 'red';
    }

    const MetricCard = ({ title, value, icon: Icon, trend, color = 'blue' }: MetricCardProps) => (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold">{value}</p>
                        {trend && (
                            <p className={cn(
                                "text-xs flex items-center mt-1",
                                trend.value > 0 ? "text-green-600" : "text-red-600"
                            )}>
                                <TrendingUp className={cn(
                                    "h-3 w-3 mr-1",
                                    trend.value < 0 && "rotate-180"
                                )} />
                                {Math.abs(trend.value)}%
                            </p>
                        )}
                    </div>
                    <div className={cn(
                        "p-3 rounded-full",
                        `bg-${color}-100 text-${color}-600`,
                        `dark:bg-${color}-900/20 dark:text-${color}-400`
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const StepCard = ({ step, showActions = true }: { step: ManufacturingStep; showActions?: boolean }) => (
        <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                            {step.manufacturing_route?.manufacturing_order?.order_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            Step {step.step_number}
                        </Badge>

                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                        {step.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{step.manufacturing_route?.manufacturing_order?.item?.name}</span>
                        <span>•</span>
                        <span>{step.cycle_time_minutes || 0} min</span>
                        {step.form && (
                            <>
                                <span>•</span>
                                <span>Has form</span>
                            </>
                        )}
                    </div>
                    {step.current_execution && (
                        <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">Operator: </span>
                            <span>{step.current_execution.executed_by_user?.name || 'Unknown'}</span>
                        </div>
                    )}
                </div>
                {showActions && canExecute && (
                    <Button
                        size="sm"
                        onClick={() => handleExecuteStep(step)}
                        className="ml-4"
                    >
                        <Play className="h-4 w-4 mr-1" />
                        {step.status === 'queued' ? 'Start' : 'Continue'}
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${workCell.name} - Dashboard`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{workCell.name} Dashboard</h1>
                        <p className="text-muted-foreground">
                            {activeOperators.length} active operators • {statistics.utilizationRate}% utilization
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                        <Button
                            variant={autoRefresh ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            <Clock className="h-4 w-4 mr-1" />
                            Auto: {autoRefresh ? 'On' : 'Off'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="OEE"
                        value={`${statistics.oee}%`}
                        icon={Activity}
                        color="green"
                    />
                    <MetricCard
                        title="Availability"
                        value={`${statistics.availability}%`}
                        icon={Clock}
                        color="blue"
                    />
                    <MetricCard
                        title="Performance"
                        value={`${statistics.performance}%`}
                        icon={TrendingUp}
                        color="blue"
                    />
                    <MetricCard
                        title="Quality"
                        value={`${statistics.quality}%`}
                        icon={CheckCircle}
                        color="green"
                    />
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="current">Current Work</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                        <TabsTrigger value="incoming">Incoming</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    {/* Current Work Tab */}
                    <TabsContent value="current" className="space-y-4">
                        {Object.keys(currentWork).length > 0 ? (
                            <>
                                {currentWork.in_progress && currentWork.in_progress.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>In Progress ({currentWork.in_progress.length})</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {currentWork.in_progress.map((step) => (
                                                <StepCard key={step.id} step={step} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {currentWork.on_hold && currentWork.on_hold.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>On Hold ({currentWork.on_hold.length})</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {currentWork.on_hold.map((step) => (
                                                <StepCard key={step.id} step={step} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {currentWork.queued && currentWork.queued.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Queued ({currentWork.queued.length})</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {currentWork.queued.map((step) => (
                                                <StepCard key={step.id} step={step} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        ) : (
                            <Card>
                                <CardContent className="py-8">
                                    <p className="text-center text-muted-foreground">
                                        No work currently in this work cell
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Completed Work Tab */}
                    <TabsContent value="completed" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Completed Work</CardTitle>
                                <CardDescription>
                                    {completedWork.totalCompleted} steps completed •
                                    Average duration: {completedWork.averageDuration} minutes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.values(completedWork.byOrder).map((orderData) => (
                                        <div key={orderData.order.id} className="border rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-medium">
                                                        {orderData.order.order_number}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {orderData.order.item?.name}
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p>{orderData.steps.length} steps</p>
                                                    <p className="text-muted-foreground">
                                                        {orderData.steps.reduce((sum, step) => sum + (step.cycle_time_minutes || 0), 0)} min total
                                                    </p>
                                                </div>
                                            </div>
                                            {orderData.quality_pass_rate !== null && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>Quality Pass Rate</span>
                                                        <span>{orderData.quality_pass_rate}%</span>
                                                    </div>
                                                    <Progress value={orderData.quality_pass_rate} className="h-2" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Incoming Work Tab */}
                    <TabsContent value="incoming" className="space-y-4">
                        {incomingWork.next_hour.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Next Hour</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {incomingWork.next_hour.map((step: ManufacturingStep) => (
                                        <StepCard key={step.id} step={step} showActions={false} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {incomingWork.today.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Today</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {incomingWork.today.map((step: ManufacturingStep) => (
                                        <StepCard key={step.id} step={step} showActions={false} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {incomingWork.tomorrow.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tomorrow</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {incomingWork.tomorrow.map((step: ManufacturingStep) => (
                                        <StepCard key={step.id} step={step} showActions={false} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {Object.values(incomingWork).every(arr => arr.length === 0) && (
                            <Card>
                                <CardContent className="py-8">
                                    <p className="text-center text-muted-foreground">
                                        No incoming work scheduled for this work cell
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Performance Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Availability</span>
                                            <span>{statistics.availability}%</span>
                                        </div>
                                        <Progress value={statistics.availability} className="h-3" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Performance</span>
                                            <span>{statistics.performance}%</span>
                                        </div>
                                        <Progress value={statistics.performance} className="h-3" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Quality</span>
                                            <span>{statistics.quality}%</span>
                                        </div>
                                        <Progress value={statistics.quality} className="h-3" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Time Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Average Cycle Time</span>
                                            <span className="font-medium">{statistics.averageCycleTime} min</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total Hold Time</span>
                                            <span className="font-medium">{statistics.totalHoldTime} min</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Completed Steps</span>
                                            <span className="font-medium">{statistics.totalCompleted}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Current Utilization</span>
                                            <span className="font-medium">{statistics.utilizationRate}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Analytics are based on data from {format(new Date(dateRange.start), 'MMM d')} to {format(new Date(dateRange.end), 'MMM d, yyyy')}
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
