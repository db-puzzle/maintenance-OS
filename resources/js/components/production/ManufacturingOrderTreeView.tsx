import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Package,
    ArrowRight,
    Route,
    MoreVertical,
    Trash2,
    Settings,
    Play,
    XCircle,
    Edit,
    Eye,
} from 'lucide-react';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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



export default function ManufacturingOrderTreeView({
    orders,
    showActions = true,
    onOrderClick,
    emptyState,
    headerColumns,
    routeTemplates = [],
    canManageRoutes = false
}: ManufacturingOrderTreeViewProps) {
    const { props } = usePage();
    const auth = props.auth as any;
    const userPermissions = auth?.permissions || [];

    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<ManufacturingOrderTreeNode | null>(null);
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedOrderForAction, setSelectedOrderForAction] = useState<ManufacturingOrderTreeNode | null>(null);

    // Check permissions
    const canReleaseOrders = userPermissions.includes('production.orders.release');
    const canCancelOrders = userPermissions.includes('production.orders.cancel');
    const canUpdateOrders = userPermissions.includes('production.orders.update');
    const canDeleteOrders = userPermissions.includes('production.orders.delete');

    const handleApplyTemplate = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForRoute(order);
        setTemplateDialogOpen(true);
    };

    const handleTemplateSelect = (templateId: number) => {
        if (!selectedOrderForRoute) return;

        router.post(route('production.orders.apply-template', selectedOrderForRoute.id), {
            template_id: templateId
        }, {
            preserveScroll: false, // Allow page to reload properly
            onSuccess: () => {
                toast.success('Template de rota aplicado com sucesso');
                setTemplateDialogOpen(false);
                setSelectedOrderForRoute(null);
                // The controller will redirect to the show page with openRouteBuilder=1
            },
            onError: () => {
                toast.error('Erro ao aplicar template de rota');
            }
        });
    };

    const handleCreateCustomRoute = (order: ManufacturingOrderTreeNode) => {
        // Navigate to the order's show page, specifically to the routes tab
        router.visit(route('production.orders.show', order.id) + '?openRouteBuilder=1');
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

    const handleReleaseOrder = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForAction(order);
        setReleaseDialogOpen(true);
    };

    const confirmReleaseOrder = () => {
        if (!selectedOrderForAction) return;

        router.post(route('production.orders.release', selectedOrderForAction.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Ordem de manufatura liberada para produção');
                setReleaseDialogOpen(false);
                setSelectedOrderForAction(null);
            },
            onError: () => {
                toast.error('Erro ao liberar ordem de manufatura');
            }
        });
    };

    const handleCancelOrder = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForAction(order);
        setCancelDialogOpen(true);
    };

    const confirmCancelOrder = () => {
        if (!selectedOrderForAction) return;

        router.post(route('production.orders.cancel', selectedOrderForAction.id), {
            reason: 'Cancelled from tree view'
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Ordem de manufatura cancelada');
                setCancelDialogOpen(false);
                setSelectedOrderForAction(null);
            },
            onError: () => {
                toast.error('Erro ao cancelar ordem de manufatura');
            }
        });
    };

    const canBeReleased = (order: ManufacturingOrderTreeNode): boolean => {
        // Check if order is in draft or planned status and has a route with steps
        return ['draft', 'planned'].includes(order.status) &&
            !!order.manufacturing_route &&
            !!order.manufacturing_route.steps &&
            order.manufacturing_route.steps.length > 0;
    };

    const canBeCancelled = (order: ManufacturingOrderTreeNode): boolean => {
        // Order can be cancelled only if it's past draft status and not completed or already cancelled
        // Draft orders should be deleted, not cancelled
        return !['draft', 'completed', 'cancelled'].includes(order.status);
    };

    const canBeDeleted = (order: ManufacturingOrderTreeNode): boolean => {
        // Only draft orders without children can be deleted
        return order.status === 'draft' && (!order.children || order.children.length === 0);
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
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-center">Actions</div>
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

                    {/* Status */}
                    <div className="col-span-1 flex items-center justify-center">
                        <span className="text-sm font-medium">{node.status.toUpperCase()}</span>
                    </div>

                    {/* Route */}
                    <div className="col-span-1 flex items-center justify-center">
                        {canManageNodeRoute || canReleaseOrders || canCancelOrders || canUpdateOrders || canDeleteOrders ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-55">
                                    {/* View Details */}
                                    <DropdownMenuItem asChild>
                                        <Link href={route('production.orders.show', node.id)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver Detalhes
                                        </Link>
                                    </DropdownMenuItem>

                                    {/* Edit (only for draft/planned) */}
                                    {canUpdateOrders && ['draft', 'planned'].includes(node.status) && (
                                        <DropdownMenuItem asChild>
                                            <Link href={route('production.orders.edit', node.id)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar Ordem
                                            </Link>
                                        </DropdownMenuItem>
                                    )}

                                    {/* Route Management Section */}
                                    {canManageNodeRoute && (
                                        <>
                                            <DropdownMenuSeparator />
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
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleRemoveRoute(node)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remover Rota
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Status Change Actions */}
                                    {(canReleaseOrders || canCancelOrders || canDeleteOrders) && (
                                        <>
                                            <DropdownMenuSeparator />

                                            {/* Release Order (for draft/planned with route) */}
                                            {canReleaseOrders && canBeReleased(node) && (
                                                <DropdownMenuItem onClick={() => handleReleaseOrder(node)}>
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Liberar para Produção
                                                </DropdownMenuItem>
                                            )}

                                            {/* Delete Order (only for draft orders without children) */}
                                            {canDeleteOrders && canBeDeleted(node) && (
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        if (confirm('Tem certeza que deseja excluir esta ordem de manufatura em rascunho?')) {
                                                            router.delete(route('production.orders.destroy', node.id), {
                                                                onSuccess: () => toast.success('Ordem excluída com sucesso'),
                                                                onError: () => toast.error('Erro ao excluir ordem')
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir Ordem
                                                </DropdownMenuItem>
                                            )}

                                            {/* Cancel Order (only for non-draft, non-completed, non-cancelled) */}
                                            {canCancelOrders && canBeCancelled(node) && (
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleCancelOrder(node)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Cancelar Ordem
                                                </DropdownMenuItem>
                                            )}
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

            {/* Release Confirmation Dialog */}
            <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Liberar Ordem para Produção</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja liberar a ordem <strong>{selectedOrderForAction?.order_number}</strong> para produção?
                            <br /><br />
                            Esta ação irá disponibilizar a ordem para execução no chão de fábrica.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReleaseOrder}>
                            Liberar Ordem
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Ordem de Manufatura</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar a ordem <strong>{selectedOrderForAction?.order_number}</strong> (Status: {selectedOrderForAction?.status})?
                            <br /><br />
                            Esta ação é usada para ordens que já foram iniciadas mas precisam ser interrompidas.
                            A ordem não poderá mais ser executada após o cancelamento.
                            <br /><br />
                            <strong>Nota:</strong> Ordens em rascunho devem ser excluídas, não canceladas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmCancelOrder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Cancelar Ordem
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 