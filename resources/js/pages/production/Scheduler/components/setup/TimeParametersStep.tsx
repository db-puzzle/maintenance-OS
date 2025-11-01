import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TimeParametersGanttView, type TimeParameterOrder } from './TimeParametersGanttView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TimeParameterForm from '@/components/production/scheduler/TimeParameterForm';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';

interface OrderWithTimeParams extends ManufacturingOrder {
    time_parameter_status?: string;
    children?: OrderWithTimeParams[];
}

interface StepEditState {
    orderId: number;
    stepId: number;
    step: ManufacturingStep;
}

interface TimeParametersStepProps {
    orders: OrderWithTimeParams[];
    selectedOrders: number[];
    loading: boolean;
    startDate: string;
    endDate: string;
    onNext: () => void;
    onBack: () => void;
    onRefresh: () => void;
}

export function TimeParametersStep({
    orders,
    selectedOrders,
    loading,
    startDate,
    endDate,
    onNext,
    onBack,
    onRefresh,
}: TimeParametersStepProps) {
    const [editingStep, setEditingStep] = useState<StepEditState | null>(null);
    // Check if all orders have valid time parameters
    const checkAllOrdersValid = (orderList: OrderWithTimeParams[]): boolean => {
        return orderList.every(order => {
            const isValid = order.time_parameter_status === 'valid';
            const childrenValid = order.children ? checkAllOrdersValid(order.children) : true;
            return isValid && childrenValid;
        });
    };

    const countInvalidOrders = (orderList: OrderWithTimeParams[]): number => {
        return orderList.reduce((count, order) => {
            const orderInvalid = order.time_parameter_status !== 'valid' ? 1 : 0;
            const childrenInvalid = order.children ? countInvalidOrders(order.children) : 0;
            return count + orderInvalid + childrenInvalid;
        }, 0);
    };

    const allValid = checkAllOrdersValid(orders);
    const invalidCount = countInvalidOrders(orders);

    // Transform OrderWithTimeParams to TimeParameterOrder format
    const transformOrder = useCallback((order: OrderWithTimeParams): TimeParameterOrder => {
        return {
            id: order.id,
            order_number: order.order_number,
            item: order.item ? {
                id: order.item.id,
                name: order.item.name,
            } : null,
            quantity: order.quantity,
            status: order.status,
            has_route: order.has_route ?? false,
            time_parameter_status: (order.time_parameter_status as 'valid' | 'partial' | 'missing') || 'missing',
            steps: (order.manufacturing_route?.steps || []).map(step => ({
                id: step.id,
                name: step.name,
                work_cell_id: step.work_cell_id ?? null,
                work_cell: step.work_cell || null,
                has_step_time: !!(step.setup_time_minutes && step.cycle_time_minutes),
                setup_time_minutes: step.setup_time_minutes ?? null,
                cycle_time_minutes: step.cycle_time_minutes ?? null,
                use_workcell_throughput: step.use_workcell_throughput ?? null,
                has_work_cell_rate: false, // This would need to be determined from actual data
                work_cell_rate: null, // This would need to be populated from actual data
                effective_time_source: null, // This would need to be calculated
                effective_setup_time: step.setup_time_minutes ?? null,
                effective_cycle_time: step.cycle_time_minutes ?? null,
                effective_total_time: step.setup_time_minutes && step.cycle_time_minutes 
                    ? step.setup_time_minutes + step.cycle_time_minutes 
                    : null,
            })),
            issues: [], // This would need to be populated from validation
            children: order.children?.map(transformOrder),
        };
    }, []);

    const transformedOrders = useMemo(() => orders.map(transformOrder), [orders, transformOrder]);

    // Handle step editing
    const handleEditStep = (orderId: number, stepId: number, step: ManufacturingStep) => {
        setEditingStep({ orderId, stepId, step });
    };

    // Get the current order being edited
    const getEditingOrder = () => {
        if (!editingStep) return null;

        const findOrder = (orderList: OrderWithTimeParams[]): OrderWithTimeParams | null => {
            for (const order of orderList) {
                if (order.id === editingStep.orderId) return order;
                if (order.children) {
                    const found = findOrder(order.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findOrder(orders);
    };

    const editingOrder = getEditingOrder();

    return (
        <div className="space-y-6">
            {/* Status Alert */}
            {!loading && (
                <Alert className={`${allValid ? 'border-green-500' : 'border-yellow-500'}`}>
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

            {/* Time Parameter Gantt View */}
            <div className="h-[600px]">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Loading time parameters...</p>
                        </div>
                    </div>
                ) : orders.length > 0 ? (
                    <TimeParametersGanttView
                        orders={transformedOrders}
                        startDate={startDate}
                        endDate={endDate}
                        onEditStep={(orderId, stepId) => {
                            // Find the original step from the order
                            const order = orders.find(o => o.id === orderId);
                            const originalStep = order?.manufacturing_route?.steps?.find(s => s.id === stepId);
                            if (originalStep) {
                                handleEditStep(orderId, stepId, originalStep);
                            }
                        }}
                        onRefresh={onRefresh}
                    />
                ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                        No orders to configure
                    </div>
                )}
            </div>

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

            {/* Edit Dialog */}
            {editingStep && editingOrder && (
                <TimeParameterForm
                    open={true}
                    onOpenChange={(open) => !open && setEditingStep(null)}
                    step={{
                        ...editingStep.step,
                        has_step_time: !!(editingStep.step.setup_time_minutes || editingStep.step.cycle_time_minutes)
                    } as ManufacturingStep & { has_step_time: boolean }}
                    orderQuantity={editingOrder.quantity}
                    itemId={editingOrder.item?.id}
                    onSuccess={() => {
                        setEditingStep(null);
                        onRefresh?.();
                    }}
                />
            )}
        </div>
    );
}
