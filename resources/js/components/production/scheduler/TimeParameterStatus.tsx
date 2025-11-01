import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Clock,
    Edit2,
    Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TimeParameterForm from './TimeParameterForm';

interface WorkCellRate {
    id: number | null;
    setup_time_minutes: number;
    production_rate_per_hour: number;
    unit_of_measure: string;
    cycle_time_minutes: number;
    is_default?: boolean;
}

interface Step {
    id: number;
    name: string;
    work_cell_id: number | null;
    work_cell: {
        id: number;
        name: string;
    } | null;
    has_step_time: boolean;
    setup_time_minutes: number | null;
    cycle_time_minutes: number | null;
    has_work_cell_rate: boolean;
    work_cell_rate: WorkCellRate | null;
    effective_time_source: 'step' | 'work_cell' | null;
    effective_setup_time: number | null;
    effective_cycle_time: number | null;
    effective_total_time: number | null;
}

interface OrderData {
    id: number;
    order_number: string;
    item: {
        id: number;
        name: string;
        item_number: string;
    };
    quantity: number;
    status: string;
    has_route: boolean;
    time_parameter_status: 'valid' | 'partial' | 'missing';
    steps: Step[];
    issues: Array<{
        type: string;
        step_id?: number;
        step_name?: string;
        message: string;
    }>;
}

interface TimeParameterStatusProps {
    orders: OrderData[];
    onRefresh?: () => void;
}

export default function TimeParameterStatus({ orders, onRefresh }: TimeParameterStatusProps) {
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [editingStep, setEditingStep] = useState<{
        orderId: number;
        stepId: number;
        step: Step;
    } | null>(null);

    const toggleOrder = (orderId: number) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
        }
        setExpandedOrders(newExpanded);
    };

    // const getStatusIcon = (status: 'valid' | 'partial' | 'missing') => {
    //     switch (status) {
    //         case 'valid':
    //             return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    //         case 'partial':
    //             return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    //         case 'missing':
    //             return <AlertCircle className="w-4 h-4 text-red-500" />;
    //     }
    // };

    const getStatusBadge = (status: 'valid' | 'partial' | 'missing') => {
        switch (status) {
            case 'valid':
                return <Badge variant="default" className="bg-green-500">All Times Configured</Badge>;
            case 'partial':
                return <Badge variant="default" className="bg-yellow-500">Partial Configuration</Badge>;
            case 'missing':
                return <Badge variant="destructive">Missing Times</Badge>;
        }
    };

    const formatTime = (minutes: number | null) => {
        if (minutes === null) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <Card key={order.id} className={cn(
                    "transition-all",
                    order.time_parameter_status === 'missing' && "border-red-200 dark:border-red-900",
                    order.time_parameter_status === 'partial' && "border-yellow-200 dark:border-yellow-900"
                )}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-base">
                                    {order.order_number}
                                </CardTitle>
                                <span className="text-sm text-muted-foreground">
                                    {order.item?.name} • Qty: {order.quantity}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(order.time_parameter_status)}
                                <Collapsible open={expandedOrders.has(order.id)}>
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleOrder(order.id)}
                                            className="p-1"
                                        >
                                            <ChevronDown className={cn(
                                                "h-4 w-4 transition-transform",
                                                expandedOrders.has(order.id) && "rotate-180"
                                            )} />
                                        </Button>
                                    </CollapsibleTrigger>
                                </Collapsible>
                            </div>
                        </div>
                    </CardHeader>

                    <Collapsible open={expandedOrders.has(order.id)}>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                {!order.has_route ? (
                                    <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        No manufacturing route defined
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {order.issues.length > 0 && (
                                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3">
                                                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Issues:</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {order.issues.map((issue, idx) => (
                                                        <li key={idx} className="text-sm text-red-700 dark:text-red-300">
                                                            {issue.message}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">Manufacturing Steps:</h4>
                                            {order.steps.map((step) => (
                                                <div
                                                    key={step.id}
                                                    className="border rounded-lg p-3 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm">{step.name}</span>
                                                            {step.work_cell && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({step.work_cell.name})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingStep({
                                                                orderId: order.id,
                                                                stepId: step.id,
                                                                step
                                                            })}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                                <Clock className="w-3 h-3" />
                                                                Step Times
                                                            </div>
                                                            {(step as any).use_workcell_throughput ? (
                                                                <div className="ml-5 text-blue-600">Using work cell throughput</div>
                                                            ) : step.has_step_time ? (
                                                                <div className="ml-5 space-y-1">
                                                                    <div>Setup: {formatTime(step.setup_time_minutes)}</div>
                                                                    <div>Cycle: {formatTime(step.cycle_time_minutes)}</div>
                                                                </div>
                                                            ) : (
                                                                <div className="ml-5 text-muted-foreground">Not configured</div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                                <Factory className="w-3 h-3" />
                                                                Work Cell Rate
                                                            </div>
                                                            {step.has_work_cell_rate && step.work_cell_rate ? (
                                                                <div className="ml-5 space-y-1">
                                                                    <div>Setup: {formatTime(step.work_cell_rate.setup_time_minutes)}</div>
                                                                    <div>Rate: {step.work_cell_rate.production_rate_per_hour} {step.work_cell_rate.unit_of_measure}/hr</div>
                                                                </div>
                                                            ) : (
                                                                <div className="ml-5 text-muted-foreground">Not configured</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {step.effective_time_source && (
                                                        <div className="pt-2 border-t">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                                    <span className="font-medium">
                                                                        Using {step.effective_time_source === 'step' ? 'Step Times' : 'Work Cell Rate'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-muted-foreground">
                                                                    Total: {formatTime(step.effective_total_time)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            ))}

            {editingStep && (
                <TimeParameterForm
                    open={true}
                    onOpenChange={(open) => !open && setEditingStep(null)}
                    step={editingStep.step as any}
                    orderQuantity={orders.find(o => o.id === editingStep.orderId)?.quantity || 1}
                    itemId={orders.find(o => o.id === editingStep.orderId)?.item?.id}
                    onSuccess={() => {
                        setEditingStep(null);
                        onRefresh?.();
                    }}
                />
            )}
        </div>
    );
}
