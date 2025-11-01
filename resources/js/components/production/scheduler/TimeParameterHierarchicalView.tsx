import React, { useState, useCallback } from 'react';
import { GenericHierarchicalTreeView, GenericTreeNode, NodeRenderProps } from '../shared/GenericHierarchicalTreeView';
import { HierarchicalViewHeader } from '../shared/HierarchicalViewHeader';
import { useTreeExpansion } from '../shared/useTreeExpansion';
import { TimeParameterOrderCard } from './TimeParameterOrderCard';
import TimeParameterForm from './TimeParameterForm';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

// Extend TimeParameterData with tree structure
export interface TimeParameterTreeNode extends GenericTreeNode {
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
    steps: Array<{
        id: number;
        name: string;
        work_cell_id: number | null;
        work_cell: {
            id: number;
            name: string;
            production_rate_per_hour?: number;
        } | null;
        has_step_time: boolean;
        setup_time_minutes: number | null;
        cycle_time_minutes: number | null;
        use_workcell_throughput: boolean | null;
        has_work_cell_rate: boolean;
        work_cell_rate: {
            production_rate_per_hour?: number;
        } | null;
        effective_time_source: 'step' | 'work_cell' | null;
        effective_setup_time: number | null;
        effective_cycle_time: number | null;
        effective_total_time: number | null;
    }>;
    issues: Array<{
        type: string;
        step_id?: number;
        step_name?: string;
        message: string;
    }>;
    children?: TimeParameterTreeNode[];
    [key: string]: unknown; // Index signature for GenericTreeNode compatibility
}

interface TimeParameterHierarchicalViewProps {
    orders: TimeParameterTreeNode[];
    showThumbnails?: boolean;
    onRefresh?: () => void;
    expandLevel?: number;
}

export default function TimeParameterHierarchicalView({
    orders,
    showThumbnails = true,
    onRefresh,
    expandLevel = 1,
}: TimeParameterHierarchicalViewProps) {
    const [editingStep, setEditingStep] = useState<{
        orderId: number;
        stepId: number;
        step: TimeParameterTreeNode['steps'][0];
    } | null>(null);

    // Use tree expansion hook - start with collapsed state
    const {
        expanded,
        currentLevel,
        maxDepth,
        toggleNode,
        expandToLevel,
    } = useTreeExpansion(orders, false);

    // Initialize to expand level 1 on first render
    React.useEffect(() => {
        if (orders.length > 0 && expandLevel !== undefined && expandLevel >= 0) {
            expandToLevel(expandLevel);
        }
    }, [orders.length, expandLevel, expandToLevel]); // Include all dependencies

    // Calculate statistics
    const calculateStats = useCallback(() => {
        let total = 0;
        let valid = 0;
        let partial = 0;
        let missing = 0;

        const countOrders = (orderList: TimeParameterTreeNode[]) => {
            orderList.forEach(order => {
                total++;
                switch (order.time_parameter_status) {
                    case 'valid':
                        valid++;
                        break;
                    case 'partial':
                        partial++;
                        break;
                    case 'missing':
                        missing++;
                        break;
                }
                if (order.children) {
                    countOrders(order.children);
                }
            });
        };

        countOrders(orders);
        return { total, valid, partial, missing };
    }, [orders]);

    const stats = calculateStats();
    const completionPercentage = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;

    // Handle step editing
    const handleEditStep = (orderId: number, stepId: number, step: TimeParameterTreeNode['steps'][0]) => {
        setEditingStep({ orderId, stepId, step });
    };

    // Calculate the maximum depth of the tree
    const calculateMaxDepth = (nodes: TimeParameterTreeNode[], currentDepth: number = 0): number => {
        let maxDepth = currentDepth;
        for (const node of nodes) {
            if (node.children && node.children.length > 0) {
                const childDepth = calculateMaxDepth(node.children, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        }
        return maxDepth;
    };

    const treeMaxDepth = calculateMaxDepth(orders);

    // Custom node renderer
    const renderOrderNode = (node: TimeParameterTreeNode, props: NodeRenderProps) => {
        const { depth } = props;
        const isExpanded = expanded[node.id] || false;

        // Calculate card width for staircase effect
        const treeLineWidth = 24;
        const minCardWidth = 600;
        const depthFromDeepest = treeMaxDepth - depth;
        const widthOffset = depthFromDeepest * treeLineWidth;

        return (
            <div
                style={{
                    width: `calc(100% - ${widthOffset}px)`,
                    minWidth: `${minCardWidth}px`,
                }}
            >
                <TimeParameterOrderCard
                    order={node}
                    isSelected={false}
                    showThumbnails={showThumbnails}
                    onEditStep={handleEditStep}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleNode(node.id)}
                    depth={depth}
                />
            </div>
        );
    };

    // Empty state
    const emptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No orders to configure</h3>
            <p className="text-muted-foreground">
                No manufacturing orders were selected for scheduling.
            </p>
        </div>
    );

    // Get the current order being edited
    const getEditingOrder = () => {
        if (!editingStep) return null;

        const findOrder = (orderList: TimeParameterTreeNode[]): TimeParameterTreeNode | null => {
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
        <div className="flex flex-col h-full">
            {/* Status Summary */}
            <div className="mb-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Time Parameter Configuration</h3>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="text-sm text-primary hover:underline"
                        >
                            Refresh Status
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Configuration Progress</span>
                        <span className="font-medium">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">
                            <span className="font-medium">{stats.valid}</span>
                            <span className="text-muted-foreground"> configured</span>
                        </span>
                    </div>
                    {stats.partial > 0 && (
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">
                                <span className="font-medium">{stats.partial}</span>
                                <span className="text-muted-foreground"> partial</span>
                            </span>
                        </div>
                    )}
                    {stats.missing > 0 && (
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">
                                <span className="font-medium">{stats.missing}</span>
                                <span className="text-muted-foreground"> missing</span>
                            </span>
                        </div>
                    )}
                    <div className="ml-auto text-sm text-muted-foreground">
                        Total: {stats.total} order{stats.total !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Warning for missing configurations */}
                {stats.missing > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <div className="text-sm text-red-600 dark:text-red-400">
                            <p className="font-medium">
                                {stats.missing} order{stats.missing > 1 ? 's have' : ' has'} missing time parameters
                            </p>
                            <p className="text-xs mt-1">
                                All orders must have time parameters configured before scheduling can proceed.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Header with Level Controls */}
            <div className="border-b pb-3 mb-3">
                <HierarchicalViewHeader
                    title=""
                    subtitle=""
                    maxDepth={maxDepth}
                    currentLevel={currentLevel}
                    onLevelChange={expandToLevel}
                    showImages={showThumbnails}
                    onToggleImages={() => { }} // We don't need to toggle images in this view
                    showLevelControls={maxDepth > 0}
                    compact={true}
                    showImageToggle={false}
                />
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto">
                <GenericHierarchicalTreeView
                    data={orders}
                    renderNode={renderOrderNode}
                    emptyState={emptyState}
                    expanded={expanded}
                    onToggleExpand={toggleNode}
                    draggable={false}
                />
            </div>

            {/* Edit Dialog */}
            {editingStep && editingOrder && (
                <TimeParameterForm
                    open={true}
                    onOpenChange={(open) => !open && setEditingStep(null)}
                    step={{
                        id: editingStep.step.id,
                        name: editingStep.step.name,
                        has_step_time: editingStep.step.has_step_time,
                        has_work_cell_rate: editingStep.step.has_work_cell_rate,
                        setup_time_minutes: editingStep.step.setup_time_minutes || undefined,
                        cycle_time_minutes: editingStep.step.cycle_time_minutes || undefined,
                        work_cell: editingStep.step.work_cell || undefined,
                    }}
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
