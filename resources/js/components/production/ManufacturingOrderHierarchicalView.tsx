import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Package,
    MoreVertical,
    Trash2,
    Play,
    XCircle,
    Eye,
    List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { GenericHierarchicalTreeView, GenericTreeNode, NodeRenderProps } from './shared/GenericHierarchicalTreeView';
import { HierarchicalViewHeader } from './shared/HierarchicalViewHeader';
import { useTreeExpansion } from './shared/useTreeExpansion';
import { toast } from 'sonner';
import { OrderCardCompact } from './manufacturing-order/OrderCardCompact';
import { formatNumber } from '@/utils/number';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

// Extend ManufacturingOrder with tree structure
export interface ManufacturingOrderTreeNode extends ManufacturingOrder, GenericTreeNode {
    id: number;
    children?: ManufacturingOrderTreeNode[];
    [key: string]: unknown; // Index signature for GenericTreeNode compatibility
}

interface ManufacturingOrderHierarchicalViewProps {
    orders: ManufacturingOrderTreeNode[];
    showActions?: boolean;
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    onOrderSelect?: (orderId: number, multiSelect: boolean) => void;
    selectedOrders?: Set<number>;
    routeTemplates?: RouteTemplate[];
    showThumbnails?: boolean;
    searchQuery?: string;
    enhancedMode?: 'standard' | 'planning';
    compactMode?: boolean;
}

export default function ManufacturingOrderHierarchicalView({
    orders,
    showActions: _showActions = true,
    onOrderClick,
    onOrderSelect,
    selectedOrders = new Set(),
    routeTemplates = [],
    showThumbnails: externalShowThumbnails,
    searchQuery: _searchQuery = '',
    enhancedMode = 'standard',
    compactMode = false
}: ManufacturingOrderHierarchicalViewProps) {
    const { props } = usePage<{ auth: { permissions?: string[] } }>();
    const auth = props.auth;
    const userPermissions = auth?.permissions || [];

    // State
    const [showImages, setShowImages] = useState(externalShowThumbnails !== undefined ? externalShowThumbnails : false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<ManufacturingOrderTreeNode | null>(null);
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedOrderForAction, setSelectedOrderForAction] = useState<ManufacturingOrderTreeNode | null>(null);

    // Use tree expansion hook
    const {
        expanded,
        currentLevel,
        maxDepth,
        toggleNode,
        expandToLevel,
    } = useTreeExpansion(orders, true);

    // Check permissions
    const canReleaseOrders = userPermissions.includes('production.orders.release');
    const canCancelOrders = userPermissions.includes('production.orders.cancel');
    const canUpdateOrders = userPermissions.includes('production.orders.update');
    const canDeleteOrders = userPermissions.includes('production.orders.delete');

    // Handlers
    const handleTemplateSelect = (templateId: number) => {
        if (!selectedOrderForRoute) return;

        router.post(route('production.orders.apply-template', selectedOrderForRoute.id), {
            template_id: templateId
        }, {
            preserveScroll: false,
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

    // Helper functions
    const canBeReleased = (order: ManufacturingOrderTreeNode): boolean => {
        return ['draft', 'planned'].includes(order.status) &&
            !!order.manufacturing_route &&
            !!order.manufacturing_route.steps &&
            order.manufacturing_route.steps.length > 0;
    };

    const canBeCancelled = (order: ManufacturingOrderTreeNode): boolean => {
        return !['draft', 'completed', 'cancelled'].includes(order.status);
    };

    const canBeDeleted = (order: ManufacturingOrderTreeNode): boolean => {
        return order.status === 'draft' && (!order.children || order.children.length === 0);
    };

    // Planning mode helpers - removed progress tracking

    // Custom node renderer
    const renderOrderNode = (node: ManufacturingOrderTreeNode, _props: NodeRenderProps) => {
        const isSelected = selectedOrders.has(node.id);

        // Compact mode rendering
        if (compactMode) {
            return (
                <OrderCardCompact
                    order={node}
                    isSelected={isSelected}
                    enhancedMode={enhancedMode}
                    showThumbnails={showImages}
                    onOrderClick={onOrderClick}
                    onOrderSelect={onOrderSelect}
                    permissions={{
                        canRelease: canReleaseOrders,
                        canCancel: canCancelOrders,
                        canUpdate: canUpdateOrders,
                        canDelete: canDeleteOrders,
                    }}
                    onReleaseOrder={handleReleaseOrder}
                    onCancelOrder={handleCancelOrder}
                />
            );
        }

        // Standard mode rendering
        return (
            <div
                className={cn(
                    "w-full p-3 border rounded-lg transition-all hover:bg-muted/50",
                    onOrderClick && "cursor-pointer",
                    isSelected && "border-ring ring-ring/10 ring-[2px]",
                    enhancedMode === 'planning' && selectedOrders.has(node.id) && "border-ring ring-ring/10 ring-[2px]"
                )}
                onClick={(e) => {
                    if (onOrderSelect && enhancedMode === 'planning') {
                        e.stopPropagation();
                        onOrderSelect(node.id, e.ctrlKey || e.metaKey);
                    } else if (onOrderClick) {
                        onOrderClick(node);
                    }
                }}
            >
                <div className={cn(
                    "grid gap-2 items-center w-full",
                    showImages ? "grid-cols-[60px_3fr_3fr_1fr_1fr_2fr_1fr_1fr]" : "grid-cols-12"
                )}>
                    {/* Image */}
                    {showImages && (
                        <div className="flex items-center justify-center">
                            {node.item && (
                                <ItemImagePreview
                                    primaryImageUrl={node.item.primary_image_thumbnail_url || node.item.primary_image_url}
                                    imageCount={node.item.images?.length || 0}
                                    className="w-12 h-12 cursor-pointer"
                                    onClick={(e) => {
                                        e?.stopPropagation();
                                        if (node.item?.id) {
                                            router.visit(route('production.items.show', node.item.id));
                                        }
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Order Number */}
                    <div className={showImages ? "" : "col-span-3"}>
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
                    <div className={showImages ? "" : "col-span-3"}>
                        <div className="text-sm font-medium">{node.item?.item_number}</div>
                        <div className="text-xs text-muted-foreground">{node.item?.name}</div>
                    </div>

                    {/* Quantity */}
                    <div className={cn("text-right", !showImages && "col-span-1")}>
                        <div className="text-sm font-medium">{formatNumber(node.quantity)}</div>
                    </div>

                    {/* Unit of Measure */}
                    <div className={!showImages ? "col-span-1" : ""}>
                        <div className="text-sm text-muted-foreground">{node.unit_of_measure}</div>
                    </div>

                    {/* Route Name */}
                    <div className={!showImages ? "col-span-2" : ""}>
                        {enhancedMode === 'planning' ? (
                            <div className="flex items-center justify-center space-x-2">
                                <List className="h-4 w-4 text-gray-600" />
                                <div className="flex flex-col items-center">
                                    <div className="text-sm">
                                        {node.manufacturing_route ? (
                                            <span className="font-medium text-foreground">
                                                {node.manufacturing_route.name}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                No route
                                            </span>
                                        )}
                                    </div>
                                    {node.manufacturing_route && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                            {node.manufacturing_route.steps?.length || 0} step{(node.manufacturing_route.steps?.length || 0) !== 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ) : (
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
                        )}
                    </div>

                    {/* Status */}
                    <div className={cn("flex items-center justify-center", !showImages && "col-span-1")}>
                        {enhancedMode === 'planning' ? (
                            <Badge
                                variant={node.status === 'planned' ? 'default' : node.status === 'draft' ? 'secondary' : 'default'}
                                className={cn("text-xs", node.status === 'planned' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400")}
                            >
                                {node.status.toUpperCase()}
                            </Badge>
                        ) : (
                            <span className="text-sm font-medium">{node.status.toUpperCase()}</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={cn("flex items-center justify-center", !showImages && "col-span-1")}>
                        {canReleaseOrders || canCancelOrders || canUpdateOrders || canDeleteOrders ? (
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

                                    {/* Status Change Actions */}
                                    {(canReleaseOrders || canCancelOrders || canDeleteOrders) && (
                                        <>
                                            <DropdownMenuSeparator />
                                            {canReleaseOrders && canBeReleased(node) && (
                                                <DropdownMenuItem onClick={() => handleReleaseOrder(node)}>
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Liberar para Produção
                                                </DropdownMenuItem>
                                            )}
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
                                                    <List className="h-4 w-4 text-gray-600" />
                                                ) : (
                                                    <List className="h-4 w-4 text-gray-600" />
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


            </div>
        );
    };

    // Header columns
    const headerColumns = compactMode ? (
        <div className="bg-muted/50 dark:bg-muted/20 p-2 rounded-md font-semibold text-xs mb-2 flex justify-between items-center">
            <div>Manufacturing Orders</div>
            <div className="text-muted-foreground">Route / Status</div>
        </div>
    ) : (
        <div className={cn(
            "bg-muted/50 dark:bg-muted/20 p-3 rounded-lg grid gap-2 font-semibold text-sm mb-2",
            showImages ? "grid-cols-[60px_3fr_3fr_1fr_1fr_2fr_1fr_1fr]" : "grid-cols-12"
        )}>
            {showImages && <div className="text-center">Imagem</div>}
            <div className={showImages ? "" : "col-span-3"}>Order Number</div>
            <div className={showImages ? "" : "col-span-3"}>Item</div>
            <div className={cn("text-right", !showImages && "col-span-1")}>Qty</div>
            <div className={!showImages ? "col-span-1" : ""}>Unit</div>
            <div className={cn("text-center", !showImages && "col-span-2")}>Route Name</div>
            <div className={cn("text-center", !showImages && "col-span-1")}>Status</div>
            <div className={cn("text-center", !showImages && "col-span-1")}>Actions</div>
        </div>
    );

    // Empty state
    const emptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No child orders found</h3>
            <p className="text-muted-foreground">
                This manufacturing order has no child orders.
            </p>
        </div>
    );

    // Calculate total child orders count
    const countAllOrders = (orderList: ManufacturingOrderTreeNode[]): number => {
        let count = orderList.length;
        orderList.forEach(order => {
            if (order.children && order.children.length > 0) {
                count += countAllOrders(order.children);
            }
        });
        return count;
    };

    const totalOrdersCount = countAllOrders(orders);

    return (
        <div className={cn(
            "flex flex-col",
            !compactMode && "-mx-6 -my-8 lg:-mx-8"
        )}>
            {/* Header */}
            <div className={cn(
                compactMode ? "-mt-4 px-4 py-2" : "px-6 pt-8 pb-4 lg:px-8"
            )}>
                <HierarchicalViewHeader
                    title={compactMode ? `Orders (${totalOrdersCount})` : `Child Orders (${totalOrdersCount})`}
                    subtitle=""
                    maxDepth={maxDepth}
                    currentLevel={currentLevel}
                    onLevelChange={expandToLevel}
                    showImages={showImages}
                    onToggleImages={setShowImages}
                    showLevelControls={maxDepth > 0}
                    compact={compactMode}
                />
            </div>

            {/* Tree view */}
            <div className={cn(
                compactMode ? "" : "px-6 pb-8 lg:px-8"
            )}>
                <GenericHierarchicalTreeView
                    data={orders}
                    renderNode={renderOrderNode}
                    headerColumns={headerColumns}
                    emptyState={emptyState}
                    expanded={expanded}
                    onToggleExpand={toggleNode}
                    draggable={false}
                    onNodeClick={onOrderClick}
                />
            </div>

            {/* Dialogs */}
            {selectedOrderForRoute && (
                <RouteTemplateSelectionDialog
                    open={templateDialogOpen}
                    onOpenChange={setTemplateDialogOpen}
                    templates={routeTemplates}
                    selectedTemplate={null}
                    onSelectTemplate={(template: RouteTemplate) => handleTemplateSelect(template.id)}
                    onUseTemplate={() => { }}
                    itemName={selectedOrderForRoute.item?.name}
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
        </div>
    );
}
