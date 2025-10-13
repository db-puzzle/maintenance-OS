import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Play, Clock, Calendar, Package, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ReviewStepProps {
    data: any;
    selectedOrders: number[];
    orders: any[];
    families: any[];
    algorithms: Array<{ value: string; label: string }>;
    processing: boolean;
    errors: any;
    onBack: () => void;
    onRunScheduler: () => void;
}

export function ReviewStep({
    data,
    selectedOrders,
    orders,
    families,
    algorithms,
    processing,
    errors: _errors,
    onBack,
    onRunScheduler,
}: ReviewStepProps) {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
    const algorithmLabel = algorithms.find(a => a.value === data.algorithm)?.label || data.algorithm;

    // Group orders by status
    const ordersByStatus = selectedOrdersData.reduce((acc, order) => {
        const status = order.status || 'pending';
        if (!acc[status]) acc[status] = [];
        acc[status].push(order);
        return acc;
    }, {} as Record<string, any[]>);

    // Calculate total quantity
    const totalQuantity = selectedOrdersData.reduce((sum, order) => sum + (order.quantity || 0), 0);

    return (
        <div className="space-y-6">
            {/* Summary Alert */}
            <Alert className="border-blue-500">
                <AlertTitle className="text-blue-700 dark:text-blue-400">Ready to Schedule</AlertTitle>
                <AlertDescription>
                    Review your configuration before starting the scheduler. The scheduler will process {selectedOrders.length} orders
                    using the {algorithmLabel} algorithm.
                </AlertDescription>
            </Alert>

            {/* Configuration Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Configuration Summary</CardTitle>
                    <CardDescription>
                        Review the scheduling parameters
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Algorithm</p>
                                    <p className="text-sm text-muted-foreground">{algorithmLabel}</p>
                                    {data.algorithm === 'due_date' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Backward scheduling with auto-forward fallback
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Date Range</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(data.start_date), 'MMM dd, yyyy')} - {format(new Date(data.end_date), 'MMM dd, yyyy')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Total Orders</p>
                                    <p className="text-sm text-muted-foreground">{selectedOrders.length} orders</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total quantity: {totalQuantity.toLocaleString()} units
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Family Groups</p>
                                    <p className="text-sm text-muted-foreground">
                                        {families.length} {families.length === 1 ? 'family' : 'families'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Orders grouped by dependencies
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center space-x-2">
                            <Badge variant={data.respect_locked_schedules ? "default" : "secondary"}>
                                {data.respect_locked_schedules ? 'Respecting' : 'Ignoring'} Locked Schedules
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Selected Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>Selected Orders ({selectedOrders.length})</CardTitle>
                    <CardDescription>
                        Orders to be scheduled in this run
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Orders by Status */}
                    {Object.entries(ordersByStatus).map(([status, statusOrders]) => (
                        <div key={status} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">
                                    {status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {statusOrders.length} {statusOrders.length === 1 ? 'order' : 'orders'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {statusOrders.map((order: any) => (
                                    <div key={order.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                        <Badge variant="outline" className="text-xs">
                                            {order.order_number}
                                        </Badge>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {order.item?.name || 'Unknown Item'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Important Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Important Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>The scheduler will run in the background and may take several minutes depending on the number of orders</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>You will be redirected to the scheduler view to monitor progress</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Once complete, you can review and adjust the generated schedule</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>The schedule will be saved as a draft version until you publish it</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={processing}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="text-sm text-muted-foreground">
                    Ready to schedule {selectedOrders.length} {selectedOrders.length === 1 ? 'order' : 'orders'}
                </div>
                <Button
                    onClick={onRunScheduler}
                    disabled={processing || selectedOrders.length === 0}
                    className="min-w-[140px]"
                >
                    {processing ? (
                        <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Starting...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Scheduler
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
