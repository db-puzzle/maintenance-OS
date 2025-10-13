import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import TimeParameterHierarchicalView from '@/components/production/scheduler/TimeParameterHierarchicalView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TimeParametersStepProps {
    orders: any[];
    selectedOrders: number[];
    loading: boolean;
    onNext: () => void;
    onBack: () => void;
    onRefresh: () => void;
}

export function TimeParametersStep({
    orders,
    selectedOrders,
    loading,
    onNext,
    onBack,
    onRefresh,
}: TimeParametersStepProps) {
    // Check if all orders have valid time parameters
    const checkAllOrdersValid = (orderList: any[]): boolean => {
        return orderList.every(order => {
            const isValid = order.time_parameter_status === 'valid';
            const childrenValid = order.children ? checkAllOrdersValid(order.children) : true;
            return isValid && childrenValid;
        });
    };

    const countInvalidOrders = (orderList: any[]): number => {
        return orderList.reduce((count, order) => {
            const orderInvalid = order.time_parameter_status !== 'valid' ? 1 : 0;
            const childrenInvalid = order.children ? countInvalidOrders(order.children) : 0;
            return count + orderInvalid + childrenInvalid;
        }, 0);
    };

    const allValid = checkAllOrdersValid(orders);
    const invalidCount = countInvalidOrders(orders);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Time Parameter Configuration</CardTitle>
                            <CardDescription>
                                Verify and configure time parameters for the selected orders
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Status Alert */}
                    {!loading && (
                        <Alert className={`mb-4 ${allValid ? 'border-green-500' : 'border-yellow-500'}`}>
                            <AlertTitle className={allValid ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}>
                                {allValid ? 'All Time Parameters Valid' : 'Configuration Required'}
                            </AlertTitle>
                            <AlertDescription>
                                {allValid
                                    ? `All ${selectedOrders.length} orders have valid time parameters and are ready for scheduling.`
                                    : `${invalidCount} order${invalidCount !== 1 ? 's' : ''} require${invalidCount === 1 ? 's' : ''} time parameter configuration before scheduling.`}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Time Parameter View */}
                    <div className="border rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                    <p className="text-sm text-muted-foreground">Loading time parameters...</p>
                                </div>
                            </div>
                        ) : orders.length > 0 ? (
                            <TimeParameterHierarchicalView
                                orders={orders}
                                showThumbnails={true}
                                onRefresh={onRefresh}
                                expandLevel={1}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                                No orders to configure
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Orders with missing time parameters are highlighted in yellow</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Click on an order to configure its time parameters</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>All orders must have valid time parameters before scheduling</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Use the refresh button to update the status after making changes</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onBack}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="text-sm text-muted-foreground">
                    {!loading && (
                        invalidCount > 0
                            ? `Configure ${invalidCount} order${invalidCount !== 1 ? 's' : ''} to continue`
                            : 'All time parameters configured'
                    )}
                </div>
                <Button
                    onClick={onNext}
                    disabled={!allValid || loading}
                >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
