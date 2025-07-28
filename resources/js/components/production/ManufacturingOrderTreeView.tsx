import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Package,
    CheckCircle,
    Clock,
    AlertCircle,
    Play,
    FileText,
    XCircle,
    ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TreeView, { TreeNode } from '@/components/shared/TreeView';
import { ManufacturingOrder } from '@/types/production';

interface ManufacturingOrderTreeNode extends ManufacturingOrder {
    children?: ManufacturingOrderTreeNode[];
}

interface ManufacturingOrderTreeViewProps {
    orders: ManufacturingOrderTreeNode[];
    showActions?: boolean;
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    emptyState?: React.ReactNode;
    headerColumns?: React.ReactNode;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
        case 'draft':
            return 'secondary';
        case 'planned':
            return 'outline';
        case 'released':
        case 'in_progress':
        case 'completed':
            return 'default';
        case 'cancelled':
            return 'destructive';
        default:
            return 'secondary';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'draft':
            return <FileText className="h-3 w-3" />;
        case 'planned':
            return <Clock className="h-3 w-3" />;
        case 'released':
            return <Play className="h-3 w-3" />;
        case 'in_progress':
            return <Clock className="h-3 w-3" />;
        case 'completed':
            return <CheckCircle className="h-3 w-3" />;
        case 'cancelled':
            return <XCircle className="h-3 w-3" />;
        default:
            return <AlertCircle className="h-3 w-3" />;
    }
};

export default function ManufacturingOrderTreeView({
    orders,
    showActions = true,
    onOrderClick,
    emptyState,
    headerColumns
}: ManufacturingOrderTreeViewProps) {
    const defaultEmptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No child orders found</h3>
            <p className="text-muted-foreground">
                This manufacturing order has no child orders.
            </p>
        </div>
    );

    const defaultHeaderColumns = (
        <div className="bg-muted/50 p-3 rounded-lg grid grid-cols-12 gap-2 font-semibold text-sm mb-2">
            <div className="col-span-3">Order Number</div>
            <div className="col-span-4">Item</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-2 text-center">Progress</div>
            <div className="col-span-1 text-center">Status</div>
        </div>
    );

    const renderOrderNode = (node: ManufacturingOrderTreeNode, isExpanded: boolean, toggleExpand: () => void) => {
        const progress = node.quantity > 0
            ? Math.round((node.quantity_completed / node.quantity) * 100)
            : 0;

        return (
            <div
                className={cn(
                    "flex-grow p-3 border rounded-lg transition-all hover:bg-muted/50",
                    onOrderClick && "cursor-pointer"
                )}
            >
                <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Order Number */}
                    <div className="col-span-3">
                        <Link
                            href={route('production.orders.show', node.id)}
                            className="font-medium text-primary hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {node.order_number}
                        </Link>
                        {node.source_reference && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                Ref: {node.source_reference}
                            </div>
                        )}
                    </div>

                    {/* Item Details */}
                    <div className="col-span-4">
                        <div className="text-sm font-medium">{node.item?.item_number}</div>
                        <div className="text-xs text-muted-foreground">{node.item?.name}</div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 text-right">
                        <div className="text-sm font-medium">{node.quantity}</div>
                    </div>

                    {/* Unit of Measure */}
                    <div className="col-span-1">
                        <div className="text-sm text-muted-foreground">{node.unit_of_measure}</div>
                    </div>

                    {/* Progress */}
                    <div className="col-span-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{node.quantity_completed}/{node.quantity}</span>
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-medium">{progress}%</span>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex items-center justify-center">
                        <Badge
                            variant={getStatusBadgeVariant(node.status)}
                            className="flex items-center gap-1"
                        >
                            {getStatusIcon(node.status)}
                            <span className="text-xs">{node.status}</span>
                        </Badge>
                    </div>
                </div>

                {/* Additional info row */}
                {(node.planned_start_date || node.actual_start_date) && (
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                            {node.planned_start_date && (
                                <div>
                                    Planned: {new Date(node.planned_start_date).toLocaleDateString()}
                                </div>
                            )}
                            {node.actual_start_date && (
                                <div>
                                    Started: {new Date(node.actual_start_date).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {showActions && (
                    <div className="mt-2 flex justify-end">
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                        >
                            <Link href={route('production.orders.show', node.id)}>
                                View Details
                                <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            {headerColumns || defaultHeaderColumns}
            <TreeView<ManufacturingOrderTreeNode>
                data={orders}
                renderNode={renderOrderNode}
                emptyState={emptyState || defaultEmptyState}
                defaultExpanded={true}
                onNodeClick={onOrderClick}
            />
        </div>
    );
} 