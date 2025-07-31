import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Package,
    CheckCircle,
    Clock,
    AlertCircle,
    Play,
    FileText,
    XCircle,
    ArrowRight,
    Route,
    MoreVertical,
    Trash2,
    Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TreeView, { TreeNode } from '@/components/shared/TreeView';
import { ManufacturingOrder, RouteTemplate } from '@/types/production';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RouteTemplateSelectionDialog from '@/components/production/RouteTemplateSelectionDialog';
import { toast } from 'sonner';

interface ManufacturingOrderTreeNode extends ManufacturingOrder {
    children?: ManufacturingOrderTreeNode[];
}

interface ManufacturingOrderTreeViewProps {
    orders: ManufacturingOrderTreeNode[];
    showActions?: boolean;
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    emptyState?: React.ReactNode;
    headerColumns?: React.ReactNode;
    routeTemplates?: RouteTemplate[];
    canManageRoutes?: boolean;
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
    headerColumns,
    routeTemplates = [],
    canManageRoutes = false
}: ManufacturingOrderTreeViewProps) {
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<ManufacturingOrderTreeNode | null>(null);

    const handleApplyTemplate = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForRoute(order);
        setTemplateDialogOpen(true);
    };

    const handleTemplateSelect = (templateId: number) => {
        if (!selectedOrderForRoute) return;

        router.post(route('production.orders.apply-template', selectedOrderForRoute.id), {
            template_id: templateId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Template de rota aplicado com sucesso');
                setTemplateDialogOpen(false);
                setSelectedOrderForRoute(null);
            },
            onError: () => {
                toast.error('Erro ao aplicar template de rota');
            }
        });
    };

    const handleCreateCustomRoute = (order: ManufacturingOrderTreeNode) => {
        router.visit(route('production.orders.show', order.id) + '?tab=route');
    };

    const handleRemoveRoute = (order: ManufacturingOrderTreeNode) => {
        if (!order.manufacturing_route) return;

        if (confirm('Tem certeza que deseja remover a rota desta ordem de manufatura?')) {
            router.delete(route('production.routing.destroy', order.manufacturing_route.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Rota removida com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao remover rota');
                }
            });
        }
    };

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
            <div className="col-span-3">Item</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-2 text-center">Route Name</div>
            <div className="col-span-1 text-center">Route</div>
            <div className="col-span-1 text-center">Status</div>
        </div>
    );

    const renderOrderNode = (node: ManufacturingOrderTreeNode, isExpanded: boolean, toggleExpand: () => void) => {
        // Check if this specific node can have routes managed
        const canManageNodeRoute = canManageRoutes && ['draft', 'planned'].includes(node.status);

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
                    <div className="col-span-3">
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

                    {/* Route Name */}
                    <div className="col-span-2">
                        <div className="text-sm text-center">
                            {node.manufacturing_route ? (
                                <span className="font-medium text-foreground">
                                    {node.manufacturing_route.name}
                                </span>
                            ) : (
                                <span className="text-muted-foreground italic">
                                    Nenhuma rota
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Route */}
                    <div className="col-span-1 flex items-center justify-center">
                        {canManageNodeRoute ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {node.manufacturing_route ? (
                                            node.manufacturing_route.steps && node.manufacturing_route.steps.length > 0 ? (
                                                <Route className="h-4 w-4 text-foreground" />
                                            ) : (
                                                <Route className="h-4 w-4 text-red-600" />
                                            )
                                        ) : (
                                            <MoreVertical className="h-4 w-4" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-55">
                                    {!node.manufacturing_route && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleApplyTemplate(node)}>
                                                <Route className="h-4 w-4 mr-2" />
                                                Aplicar Template
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleCreateCustomRoute(node)}>
                                                <Settings className="h-4 w-4 mr-2" />
                                                Criar Rota Customizada
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {node.manufacturing_route && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleCreateCustomRoute(node)}>
                                                <Settings className="h-4 w-4 mr-2" />
                                                Editar Rota
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() => handleRemoveRoute(node)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remover Rota
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center">
                                            {node.manufacturing_route ? (
                                                node.manufacturing_route.steps && node.manufacturing_route.steps.length > 0 ? (
                                                    <Route className="h-4 w-4 text-foreground" />
                                                ) : (
                                                    <Route className="h-4 w-4 text-red-600" />
                                                )
                                            ) : (
                                                <div className="h-4 w-4" />
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {node.manufacturing_route ? (
                                            node.manufacturing_route.steps && node.manufacturing_route.steps.length > 0 ? (
                                                `Rota criada com ${node.manufacturing_route.steps.length} passo${node.manufacturing_route.steps.length > 1 ? 's' : ''}`
                                            ) : (
                                                'Rota criada mas sem passos configurados'
                                            )
                                        ) : (
                                            'Nenhuma rota criada'
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
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
        <>
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

            {/* Template Selection Dialog */}
            {selectedOrderForRoute && (
                <RouteTemplateSelectionDialog
                    open={templateDialogOpen}
                    onOpenChange={setTemplateDialogOpen}
                    templates={routeTemplates}
                    orderNumber={selectedOrderForRoute.order_number}
                    itemCategoryId={selectedOrderForRoute.item?.item_category_id}
                    onSelectTemplate={handleTemplateSelect}
                />
            )}
        </>
    );
} 