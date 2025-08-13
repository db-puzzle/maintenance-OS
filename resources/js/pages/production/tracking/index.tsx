import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StepStatusBadge } from '@/components/production/StepStatusBadge';
import { ManufacturingStep, WorkCell } from '@/types/production';
import { Play, Clock, User, Search, RefreshCw } from 'lucide-react';

interface Props {
    myWork: ManufacturingStep[];
    readyToStart: ManufacturingStep[];
    inProgress: ManufacturingStep[];
    workCells: WorkCell[];
    canExecute: boolean;
}

export default function ProductionTracking({ myWork, readyToStart, inProgress, workCells, canExecute }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkCell, setSelectedWorkCell] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeTab, setActiveTab] = useState('ready');

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['myWork', 'readyToStart', 'inProgress']
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Tracking', href: '/production/tracking' }
    ];

    const handleExecuteStep = (step: ManufacturingStep) => {
        router.visit(route('production.steps.execute', step.id));
    };

    const filterSteps = (steps: ManufacturingStep[]) => {
        return steps.filter(step => {
            const matchesSearch = searchTerm === '' ||
                step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                step.manufacturing_route?.manufacturing_order?.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                step.manufacturing_route?.manufacturing_order?.item?.name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesWorkCell = selectedWorkCell === 'all' ||
                step.work_cell_id?.toString() === selectedWorkCell;

            return matchesSearch && matchesWorkCell;
        });
    };

    const StepCard = ({ step, showOperator = false }: { step: ManufacturingStep; showOperator?: boolean }) => (
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
                    <p className="text-sm font-medium mb-1">
                        {step.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{step.manufacturing_route?.manufacturing_order?.item?.name}</span>
                        {step.work_cell && (
                            <>
                                <span>•</span>
                                <span>{step.work_cell.name}</span>
                            </>
                        )}
                        {showOperator && step.current_execution?.executed_by && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {step.current_execution.executed_by_user?.name || 'Unknown'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StepStatusBadge status={step.status} />
                    {canExecute && ['queued', 'in_progress', 'on_hold'].includes(step.status) && (
                        <Button
                            size="sm"
                            onClick={() => handleExecuteStep(step)}
                        >
                            <Play className="h-4 w-4 mr-1" />
                            {step.status === 'queued' ? 'Start' : 'Continue'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Tracking" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold">Production Tracking</h1>
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
                            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search by order, item, or step name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        value={selectedWorkCell}
                        onChange={(e) => setSelectedWorkCell(e.target.value)}
                        className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">All Work Cells</option>
                        {workCells.map(cell => (
                            <option key={cell.id} value={cell.id.toString()}>
                                {cell.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* My Work Queue - Only show if user has assigned work */}
                {myWork.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>My Work Queue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {filterSteps(myWork).map((step) => (
                                    <StepCard key={step.id} step={step} />
                                ))}
                                {filterSteps(myWork).length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No matching work found
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="ready">
                            Ready to Start ({filterSteps(readyToStart).length})
                        </TabsTrigger>
                        <TabsTrigger value="in-progress">
                            In Progress ({filterSteps(inProgress).length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ready" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ready to Start</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {filterSteps(readyToStart).map((step) => (
                                        <StepCard key={step.id} step={step} />
                                    ))}
                                    {filterSteps(readyToStart).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No steps ready to start
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="in-progress" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>In Progress Work</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {filterSteps(inProgress).map((step) => (
                                        <StepCard key={step.id} step={step} showOperator />
                                    ))}
                                    {filterSteps(inProgress).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No work in progress
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
