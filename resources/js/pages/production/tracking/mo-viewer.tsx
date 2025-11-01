import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    RefreshCw,
    Clock,
    Package,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    User,
    TrendingDown,
    MoreVertical,
    Search,
    LayoutList,
    LayoutGrid,
    ZoomIn,
    ZoomOut,
    RotateCcw
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';
import { ManufacturingOrder } from '@/types/production';
import { GenericHierarchicalTreeView, NodeRenderProps } from '@/components/production/shared/GenericHierarchicalTreeView';
import { HierarchicalViewHeader } from '@/components/production/shared/HierarchicalViewHeader';
import { useTreeExpansion } from '@/components/production/shared/useTreeExpansion';
import { OrderCardCompact } from '@/components/production/manufacturing-order/OrderCardCompact';
import { MOSelectionModal } from '@/components/production/planning/MOSelectionModal';
import { MOViewerCanvas, MOData, MOStep } from '@/components/production/mo-viewer/MOViewerCanvas';
import { StepStatus } from '@/components/production/mo-viewer/MOViewerStepBox';
import { toast } from 'sonner';
import axios from 'axios';
import { MOStepActionDialog } from '@/pages/production/reporting/components/MOStepActionDialog';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface RouteStep {
    id: number;
    name: string;
    display_position?: number; // Add computed field
    status: string;
    work_cell: {
        id: number;
        name: string;
    } | null;
    quantity_completed: number;
    quantity_scrapped: number;
    quantity_total: number;
    rejection_rate: number;
    can_start?: boolean;
    cannot_start_reason?: string;
    actual_start_time?: string;
    actual_end_time?: string;
    skip_reason?: string;
    skipped_by?: any;
    skipped_at?: string;
    current_operator: {
        id: number;
        name: string;
    } | null;
    has_quality_issue: boolean;
    has_delay: boolean;
    setup_time_seconds?: number;
    cycle_time_seconds?: number;
    total_time_seconds?: number;
    depends_on_step_id?: number;
}

interface ManufacturingOrderHierarchy {
    id: number;
    order_number: string;
    status: string;
    priority: number;
    level: number;
    parent_id?: number;
    item?: {
        id: number;
        item_number: string;
        name: string;
        thumbnail_url?: string;
        primary_image_thumbnail_url?: string;
        primary_image_url?: string;
        media?: Array<{ id: number;[key: string]: unknown }>;
        category?: { name: string };
        code?: string;
        can_be_sold?: boolean;
        can_be_purchased?: boolean;
        can_be_manufactured?: boolean;
        [key: string]: unknown // Allow additional properties
    };
    quantity: number;
    quantity_completed: number;
    quantity_scrapped: number;
    unit_of_measure: string;
    requested_date: string | null;
    release_date: string | null;
    overall_progress: number;
    production_progress: number;
    route_steps: RouteStep[];
    total_steps: number;
    completed_steps: number;
    in_progress_steps: number;
    has_quality_issues: boolean;
    has_delays: boolean;
    is_overdue: boolean;
    has_route: boolean;
    children?: ManufacturingOrderHierarchy[];
    manufacturing_route?: {
        id: number;
        name: string;
        steps?: Array<{ id: number;[key: string]: unknown }>;
    };
    source_reference?: string;
    planned_start_date?: string;
    actual_start_date?: string;
    [key: string]: unknown // Allow additional properties for compatibility
}

interface PageProps {
    orders: ManufacturingOrderHierarchy[];
    workCells: Array<{ id: number; name: string; }>;
    filters: {
        search?: string;
        statuses?: string;
        show_completed?: boolean;
    };
    canUpdate: boolean;
}

// Custom hierarchical view component with route steps
const MOViewerHierarchicalView: React.FC<{
    orders: ManufacturingOrderHierarchy[];
    selectedOrders: Set<number>;
    onOrderSelect: (orderId: number, multiSelect: boolean) => void;
    searchQuery: string;
    showThumbnails: boolean;
    showRouteSteps: boolean;
    expandedSteps: Set<number>;
    onToggleStep: (orderId: number) => void;
    onToggleThumbnails?: (show: boolean) => void;
    highlightedSteps: Set<number>;
    onSelectAllPrecedents: (orderId: number, stepId: number) => void;
    onSelectImmediatePrecedents: (orderId: number, stepId: number) => void;
    onStepClick: (orderId: number, stepId: number) => void;
}> = ({ orders, selectedOrders, onOrderSelect, searchQuery: _searchQuery, showThumbnails, showRouteSteps, expandedSteps, onToggleStep, onToggleThumbnails, highlightedSteps, onSelectAllPrecedents, onSelectImmediatePrecedents, onStepClick }) => {
    // Use tree expansion hook
    const {
        expanded,
        currentLevel,
        maxDepth,
        toggleNode,
        expandToLevel,
    } = useTreeExpansion(orders as unknown as ManufacturingOrderTreeNode[], true);

    // Custom node renderer that includes route steps
    const renderOrderNode = useCallback((node: ManufacturingOrderTreeNode, _props: NodeRenderProps) => {
        const order = node as unknown as ManufacturingOrderHierarchy;
        const isSelected = selectedOrders.has(order.id);
        const hasSteps = order.route_steps && order.route_steps.length > 0;
        const areStepsExpanded = expandedSteps.has(order.id);

        return (
            <div className="relative">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <OrderCardCompact
                            order={order as unknown as ManufacturingOrderTreeNode}
                            isSelected={isSelected}
                            enhancedMode="standard"
                            showThumbnails={showThumbnails}
                            onOrderClick={() => onOrderSelect(order.id, false)}
                            onOrderSelect={onOrderSelect}
                            permissions={{
                                canRelease: false,
                                canCancel: false,
                                canUpdate: false,
                                canDelete: false,
                            }}
                            onReleaseOrder={() => { }}
                            onCancelOrder={() => { }}
                        />
                    </div>
                    {/* Route Steps Toggle */}
                    {showRouteSteps && hasSteps && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0 mr-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleStep(order.id);
                            }}
                        >
                            {areStepsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                    )}
                </div>

                {/* Route Steps */}
                {showRouteSteps && areStepsExpanded && hasSteps && (
                    <div className="ml-12 mt-2 space-y-1 mb-2">
                        {order.route_steps.map((step, stepIndex) => {
                            const isHighlighted = highlightedSteps.has(step.id);
                            const isFirstStep = !step.depends_on_step_id;
                            const hasChildOrders = order.children && order.children.length > 0;
                            const canSelectPrecedents = step.depends_on_step_id || (isFirstStep && hasChildOrders);


                            return (
                                <div
                                    key={step.id}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 text-xs rounded border-l-2 relative transition-all duration-300 group cursor-pointer hover:bg-accent/50",
                                        step.status === 'completed' && "border-l-green-500 bg-green-50 dark:bg-green-950/20",
                                        step.status === 'in_progress' && "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
                                        step.status === 'queued' && "border-l-gray-400",
                                        step.has_quality_issue && "border-l-red-500",
                                        step.has_delay && "border-l-orange-500",
                                        isHighlighted && "border-ring ring-ring/10 ring-[2px]"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStepClick(order.id, step.id);
                                    }}
                                >
                                    <span className="text-[10px] text-muted-foreground">#{step.display_position || stepIndex + 1}</span>
                                    <span className="flex-1 truncate">{step.name}</span>
                                    {step.work_cell && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                            {step.work_cell.name}
                                        </Badge>
                                    )}
                                    {step.current_operator && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            {step.current_operator.name.split(' ')[0]}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {step.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                        {step.status === 'in_progress' && <Clock className="h-3 w-3 text-blue-600 animate-pulse" />}
                                        {step.has_quality_issue && <AlertTriangle className="h-3 w-3 text-red-600" />}
                                        {step.has_delay && <TrendingDown className="h-3 w-3 text-orange-600" />}
                                    </div>

                                    {/* Dropdown Menu - Hidden by default, shown on hover */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 p-0 hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectImmediatePrecedents(order.id, step.id);
                                                }}
                                                disabled={!canSelectPrecedents}
                                            >
                                                Selecionar precedentes imediatos
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectAllPrecedents(order.id, step.id);
                                                }}
                                                disabled={!canSelectPrecedents}
                                            >
                                                Selecionar todos os precedentes
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }, [selectedOrders, showThumbnails, showRouteSteps, expandedSteps, onToggleStep, onOrderSelect, highlightedSteps, onSelectAllPrecedents, onSelectImmediatePrecedents, onStepClick]);

    // Calculate total orders count
    const countAllOrders = (orderList: ManufacturingOrderHierarchy[]): number => {
        let count = orderList.length;
        orderList.forEach(order => {
            if (order.children && order.children.length > 0) {
                count += countAllOrders(order.children);
            }
        });
        return count;
    };

    const totalOrdersCount = countAllOrders(orders);

    // Empty state
    const emptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma ordem encontrada</h3>
            <p className="text-muted-foreground">
                Não há ordens de manufatura para exibir.
            </p>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header with controls */}
            <div className="px-4 py-3 border-b bg-muted/30">
                <HierarchicalViewHeader
                    title={`Hierarquia de Ordens (${totalOrdersCount})`}
                    subtitle=""
                    maxDepth={maxDepth}
                    currentLevel={currentLevel}
                    onLevelChange={expandToLevel}
                    showImages={showThumbnails}
                    onToggleImages={onToggleThumbnails || (() => { })}
                    showLevelControls={maxDepth > 0}
                    compact={true}
                />
            </div>

            {/* Tree view */}
            <ScrollArea className="flex-1">
                <div className="p-3">
                    <GenericHierarchicalTreeView
                        data={orders as unknown as ManufacturingOrderTreeNode[]}
                        renderNode={renderOrderNode}
                        emptyState={emptyState}
                        expanded={expanded}
                        onToggleExpand={toggleNode}
                        draggable={false}
                    />
                </div>
            </ScrollArea>
        </div>
    );
};


export default function MOViewer({
    orders = [],
    filters = {},
    canUpdate: _canUpdate = false
}: PageProps) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showRouteSteps, setShowRouteSteps] = useState(true);
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [highlightedSteps, setHighlightedSteps] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'hierarchical' | 'canvas'>('canvas');

    // New states for MO selection
    const [showMOSelectionModal, setShowMOSelectionModal] = useState(true);
    const [selectedMOId, setSelectedMOId] = useState<number | null>(null);
    const [loadingMO, setLoadingMO] = useState(false);
    const [moHierarchy, setMOHierarchy] = useState<ManufacturingOrderHierarchy[]>([]);
    const [canvasScale, setCanvasScale] = useState(1);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // States for MO Details Dialog
    const [showMODetailsDialog, setShowMODetailsDialog] = useState(false);
    const [selectedMOForDialog, setSelectedMOForDialog] = useState<ManufacturingOrderHierarchy | null>(null);
    const [selectedStepId, setSelectedStepId] = useState<number | undefined>(undefined);

    // Debounce timer ref
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Handle MO selection from modal
    const handleMOSelection = useCallback(async (orderIds: number[]) => {
        if (orderIds.length === 0) return;

        const orderId = orderIds[0]; // Take the first order

        setSelectedMOId(orderId);
        setShowMOSelectionModal(false);
        setIsInitialLoad(false);
        setLoadingMO(true);

        try {
            // Fetch the complete hierarchy for the selected MO
            const url = route('production.tracking.mo-viewer.hierarchy', { orderId });

            const response = await axios.get(url);

            if (response.data.order) {
                setMOHierarchy([response.data.order]);
                toast.success('Ordem carregada com sucesso');
            } else {
                toast.error('Dados da ordem não encontrados');
                setShowMOSelectionModal(true);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    toast.error('Ordem não encontrada');
                } else if (error.response?.status === 403) {
                    toast.error('Sem permissão para visualizar esta ordem');
                } else {
                    toast.error(`Erro ao carregar hierarquia da ordem: ${error.response?.data?.error || error.message}`);
                }
            } else {
                toast.error('Erro ao carregar hierarquia da ordem');
            }

            setShowMOSelectionModal(true); // Reopen modal on error
        } finally {
            setLoadingMO(false);
        }
    }, []);

    // Function to find all precedent steps recursively within a single MO
    const findAllPrecedentSteps = useCallback((steps: RouteStep[], targetStepId: number): Set<number> => {
        const precedents = new Set<number>();

        const findPrecedents = (stepId: number) => {
            const step = steps.find(s => s.id === stepId);
            if (step?.depends_on_step_id) {
                precedents.add(step.depends_on_step_id);
                // Recursively find precedents of the precedent
                findPrecedents(step.depends_on_step_id);
            }
        };

        findPrecedents(targetStepId);
        return precedents;
    }, []);

    // Handle selecting immediate precedents only
    const handleSelectImmediatePrecedents = useCallback((orderId: number, stepId: number) => {
        const allPrecedents = new Set<number>();

        // Create a map of all orders for easy lookup
        const findAllOrders = (orders: ManufacturingOrderHierarchy[]): Map<number, ManufacturingOrderHierarchy> => {
            const orderMap = new Map<number, ManufacturingOrderHierarchy>();
            const traverse = (orderList: ManufacturingOrderHierarchy[]) => {
                orderList.forEach(order => {
                    orderMap.set(order.id, order);
                    if (order.children && order.children.length > 0) {
                        traverse(order.children);
                    }
                });
            };
            traverse(orders);
            return orderMap;
        };

        const sourceOrders = moHierarchy.length > 0 ? moHierarchy : orders;
        const allOrdersMap = findAllOrders(sourceOrders);
        const targetOrder = allOrdersMap.get(orderId);

        if (!targetOrder || !targetOrder.route_steps) {
            return;
        }

        // Find the target step
        const targetStep = targetOrder.route_steps.find(s => s.id === stepId);
        const isFirstStep = !targetStep?.depends_on_step_id;

        // If this is the first step and the MO has children, add only the last step of each child MO
        if (isFirstStep && targetOrder.children && targetOrder.children.length > 0) {
            targetOrder.children.forEach(child => {
                if (child.route_steps && child.route_steps.length > 0) {
                    // Add only the last step of each child MO
                    const lastStep = child.route_steps[child.route_steps.length - 1];
                    allPrecedents.add(lastStep.id);
                }
            });
        } else if (targetStep?.depends_on_step_id) {
            // If it has a direct precedent, just add that one
            allPrecedents.add(targetStep.depends_on_step_id);
        }

        setHighlightedSteps(allPrecedents);
    }, [moHierarchy, orders]);

    // Handle selecting all precedents including child MO steps
    const handleSelectAllPrecedents = useCallback((orderId: number, stepId: number) => {

        const allPrecedents = new Set<number>();

        // Find all orders in the hierarchy
        const findAllOrders = (orders: ManufacturingOrderHierarchy[]): Map<number, ManufacturingOrderHierarchy> => {
            const orderMap = new Map<number, ManufacturingOrderHierarchy>();

            const traverse = (orderList: ManufacturingOrderHierarchy[]) => {
                for (const order of orderList) {
                    orderMap.set(order.id, order);
                    if (order.children) {
                        traverse(order.children);
                    }
                }
            };

            traverse(orders);
            return orderMap;
        };

        const sourceOrders = moHierarchy.length > 0 ? moHierarchy : orders;

        const allOrdersMap = findAllOrders(sourceOrders);

        const targetOrder = allOrdersMap.get(orderId);

        if (!targetOrder || !targetOrder.route_steps) {
            return;
        }

        // Find precedents within the same MO
        const localPrecedents = findAllPrecedentSteps(targetOrder.route_steps, stepId);
        localPrecedents.forEach(id => allPrecedents.add(id));

        // Helper to add all steps from child MOs
        const addAllChildSteps = (order: ManufacturingOrderHierarchy) => {
            if (!order.children || order.children.length === 0) return;

            order.children.forEach(child => {
                // Add all steps from this child MO
                if (child.route_steps) {
                    child.route_steps.forEach(step => {
                        allPrecedents.add(step.id);
                    });
                }
                // Recursively add steps from its children
                addAllChildSteps(child);
            });
        };

        // For the target step, check if it's the first step of the MO
        const targetStep = targetOrder.route_steps.find(s => s.id === stepId);
        const isFirstStep = !targetStep?.depends_on_step_id;

        // If this is the first step of the MO and the MO has children, 
        // add all steps from child MOs as precedents
        if (isFirstStep && targetOrder.children && targetOrder.children.length > 0) {
            addAllChildSteps(targetOrder);
        }

        // Also check if any of the local precedents are first steps of their MOs
        // and add their child MO steps
        localPrecedents.forEach(precedentStepId => {
            // Find which MO this precedent step belongs to
            for (const [_moId, mo] of allOrdersMap) {
                if (mo.route_steps?.some(s => s.id === precedentStepId)) {
                    const precedentStep = mo.route_steps.find(s => s.id === precedentStepId);
                    const isPrecedentFirstStep = !precedentStep?.depends_on_step_id;

                    if (isPrecedentFirstStep && mo.children && mo.children.length > 0) {
                        addAllChildSteps(mo);
                    }
                    break;
                }
            }
        });

        setHighlightedSteps(allPrecedents);
    }, [moHierarchy, orders, findAllPrecedentSteps]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !selectedMOId || loadingMO) return;

        const interval = setInterval(() => {
            // Refresh the specific MO hierarchy
            if (selectedMOId) {
                axios.get(route('production.tracking.mo-viewer.hierarchy', { orderId: selectedMOId }))
                    .then(response => {
                        setMOHierarchy([response.data.order]);
                    })
                    .catch(() => {
                        // Handle error silently
                    });
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, selectedMOId, loadingMO]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);

    const handleSearch = (value: string) => {
        setSearchValue(value);

        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        searchTimerRef.current = setTimeout(() => {
            router.get(route('production.tracking.mo-viewer'), {
                ...filters,
                search: value
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }, 500);
    };


    const toggleStep = (orderId: number) => {
        setExpandedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleOrderSelect = useCallback((orderId: number, multiSelect: boolean) => {
        if (multiSelect) {
            setSelectedOrders(prev => {
                const newSet = new Set(prev);
                if (newSet.has(orderId)) {
                    newSet.delete(orderId);
                } else {
                    newSet.add(orderId);
                }
                return newSet;
            });
        } else {
            setSelectedOrders(new Set([orderId]));
        }
    }, []);

    const handleViewDetails = (orderId: number) => {
        router.visit(route('production.orders.show', { order: orderId }));
    };

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Status da Ordem', href: '#' }
    ];

    // Determine which orders to display
    const displayOrders = moHierarchy.length > 0 ? moHierarchy : orders;


    // Count alerts
    const alertCount = displayOrders.reduce((sum, order) => {
        const countAlerts = (o: ManufacturingOrderHierarchy): number => {
            let count = 0;
            if (o.has_quality_issues) count++;
            if (o.has_delays) count++;
            if (o.is_overdue) count++;
            return count + (o.children ? o.children.reduce((s, c) => s + countAlerts(c), 0) : 0);
        };
        return sum + countAlerts(order);
    }, 0);

    // Zoom controls for canvas
    const handleZoomIn = () => setCanvasScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setCanvasScale(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setCanvasScale(1);

    // Transform orders to canvas format
    const transformToCanvasData = useCallback((orders: ManufacturingOrderHierarchy[]): MOData[] => {
        return orders.map(order => ({
            id: order.id,
            order_number: order.order_number,
            parent_id: order.parent_id,
            item_number: order.item?.item_number,
            item_name: order.item?.name,
            steps: (order.route_steps || []).map((step, stepIndex) => ({
                id: step.id,
                name: step.name,
                workcell_name: step.work_cell?.name,
                status: ('viewer_status' in step ? (step as RouteStep & { viewer_status: StepStatus }).viewer_status : mapStepStatus(step.status)),
                display_position: step.display_position || stepIndex + 1,
                depends_on_step_id: step.depends_on_step_id
            } as MOStep)),
            children: order.children ? transformToCanvasData(order.children) : undefined
        }));
    }, []);

    // Helper to map step status if viewer_status is not available
    const mapStepStatus = (status: string): StepStatus => {
        const statusMap: Record<string, StepStatus> = {
            'pending': 'not_ready',
            'queued': 'ready',
            'in_progress': 'in_progress',
            'on_hold': 'on_hold',
            'awaiting_quality': 'in_progress',
            'completed': 'completed',
            'skipped': 'cancelled',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'not_ready';
    };

    const canvasData = useMemo(() => {
        const data = transformToCanvasData(displayOrders);
        return data;
    }, [displayOrders, transformToCanvasData]);

    // Handle step click to open MO Details Dialog
    const handleStepClick = useCallback((orderId: number, stepId: number) => {

        // Clear any highlights
        setHighlightedSteps(new Set());

        // Find the MO in the hierarchy
        const findOrderInHierarchy = (orders: ManufacturingOrderHierarchy[], targetId: number): ManufacturingOrderHierarchy | null => {
            for (const order of orders) {
                if (order.id === targetId) return order;
                if (order.children) {
                    const found = findOrderInHierarchy(order.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const order = findOrderInHierarchy(displayOrders, orderId);
        if (!order) {
            toast.error('Ordem não encontrada');
            return;
        }


        // For now, use the existing order data structure
        // The MODetailsDialog will handle fetching additional data if needed
        const fullOrder = {
            ...order,
            // Ensure manufacturing_route exists with steps
            manufacturing_route: order.manufacturing_route || {
                id: 0,
                name: '',
                steps: order.route_steps?.map((step) => ({
                    ...step,
                    id: step.id,
                    manufacturing_route_id: 0,
                    display_position: step.display_position,
                    name: step.name,
                    work_cell: step.work_cell,
                    work_cell_id: step.work_cell?.id,
                    status: step.status,
                    executions: [], // Will be loaded by the dialog if needed
                    cumulative_quantity_completed: step.quantity_completed,
                    cumulative_quantity_scrapped: step.quantity_scrapped,
                }))
            },
            has_route: true,
        };

        // Find the clicked step
        const targetStep = fullOrder.manufacturing_route?.steps?.find((s) => s.id === stepId);
        // Note: current_step is not used by MODetailsDialog, it uses selectedStepId instead


        setSelectedMOForDialog(fullOrder);
        setSelectedStepId(stepId);
        setShowMODetailsDialog(true);
    }, [displayOrders]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Acompanhamento de Produção" />

            <div className="relative flex h-[calc(100vh-3rem)] flex-col">
                {/* Fixed Header Section with proper background */}
                <div className="bg-background border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <div className="px-6 py-4 lg:px-8">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 space-y-1">
                                <h1 className="text-xl leading-7 lg:text-2xl text-foreground font-semibold">
                                    {selectedMOId && moHierarchy.length > 0
                                        ? `Ordem ${moHierarchy[0].order_number}`
                                        : "Status da Ordem de Manufatura"}
                                </h1>
                                <p className="text-muted-foreground text-sm leading-5">
                                    {selectedMOId && moHierarchy.length > 0 && moHierarchy[0].item
                                        ? `${moHierarchy[0].item.item_number} - ${moHierarchy[0].item.name}`
                                        : "Selecione uma ordem para visualizar o progresso"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search and actions bar */}
                    <div className="px-6 py-4 lg:px-8 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <div className="relative w-[380px]">
                                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    className="pl-9 h-10"
                                    type="search"
                                    placeholder="Buscar por número da ordem ou nome do item..."
                                    value={searchValue}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMOSelectionModal(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Search className="h-4 w-4" />
                                    {selectedMOId ? 'Alterar Ordem' : 'Selecionar Ordem'}
                                </Button>

                                {/* View mode toggle */}
                                <div className="flex items-center gap-1 border rounded-md p-1">
                                    <Button
                                        variant={viewMode === 'hierarchical' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setViewMode('hierarchical')}
                                        className="h-7 px-2"
                                    >
                                        <LayoutList className="h-4 w-4 mr-1" />
                                        Lista
                                    </Button>
                                    <Button
                                        variant={viewMode === 'canvas' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setViewMode('canvas')}
                                        className="h-7 px-2"
                                    >
                                        <LayoutGrid className="h-4 w-4 mr-1" />
                                        Canvas
                                    </Button>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={cn(
                                        'flex items-center gap-2',
                                        autoRefresh && 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100'
                                    )}
                                >
                                    <Clock className="h-4 w-4" />
                                    Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.reload()}
                                >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Atualizar
                                </Button>

                                {/* Zoom controls - only show for canvas view */}
                                {viewMode === 'canvas' && (
                                    <div className="flex items-center gap-1 border rounded-md p-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleZoomOut}
                                            disabled={canvasScale <= 0.5}
                                            className="h-7 w-7"
                                        >
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleResetZoom}
                                            className="h-7 w-7"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleZoomIn}
                                            disabled={canvasScale >= 2}
                                            className="h-7 w-7"
                                        >
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm px-2">{Math.round(canvasScale * 100)}%</span>
                                    </div>
                                )}

                                {viewMode === 'hierarchical' && (
                                    <>
                                        <div className="flex items-center gap-2 ml-4">
                                            <Checkbox
                                                id="show-steps"
                                                checked={showRouteSteps}
                                                onCheckedChange={(checked) => setShowRouteSteps(!!checked)}
                                            />
                                            <label htmlFor="show-steps" className="text-sm cursor-pointer">
                                                Mostrar etapas
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <Checkbox
                                                id="show-thumbnails"
                                                checked={showThumbnails}
                                                onCheckedChange={(checked) => setShowThumbnails(!!checked)}
                                            />
                                            <label htmlFor="show-thumbnails" className="text-sm cursor-pointer">
                                                Mostrar imagens
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className={cn(
                    "flex-1 overflow-y-auto",
                    viewMode !== 'canvas' && "px-6 py-4 lg:px-8"
                )}>
                    {/* Alert Strip */}
                    {alertCount > 0 && viewMode !== 'canvas' && (
                        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                {alertCount} alerta{alertCount > 1 ? 's' : ''} de produção
                            </span>
                        </div>
                    )}

                    {/* Main Content - Hierarchical View with Route Steps */}
                    {loadingMO ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
                                <p className="text-muted-foreground">Carregando hierarquia da ordem...</p>
                            </div>
                        </div>
                    ) : isInitialLoad ? (
                        // Don't show anything during initial load to avoid flash
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center opacity-0">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            </div>
                        </div>
                    ) : !selectedMOId ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">Nenhuma ordem selecionada</h3>
                                <p className="text-muted-foreground mb-4">
                                    Clique no botão "Selecionar Ordem" para escolher uma ordem de manufatura
                                </p>
                                <Button onClick={() => setShowMOSelectionModal(true)}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Selecionar Ordem
                                </Button>
                            </div>
                        </div>
                    ) : viewMode === 'canvas' ? (
                        <div className="h-full">
                            <MOViewerCanvas
                                orders={canvasData}
                                onStepClick={handleStepClick}
                                scale={canvasScale}
                                className="h-full"
                                highlightedSteps={highlightedSteps}
                                onSelectPrecedents={handleSelectAllPrecedents}
                                onSelectImmediatePrecedents={handleSelectImmediatePrecedents}
                                onCanvasClick={() => {
                                    // Clear highlights when clicking on canvas background
                                    setHighlightedSteps(new Set());
                                }}
                            />
                        </div>
                    ) : (
                        <div className="h-full">
                            {selectedOrders.size > 0 && (
                                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">
                                        {selectedOrders.size === 1
                                            ? `Ordem Selecionada: ${displayOrders.find(o => selectedOrders.has(o.id))?.order_number || ''}`
                                            : `${selectedOrders.size} Ordens Selecionadas`}
                                    </h3>
                                    {selectedOrders.size === 1 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    const orderId = Array.from(selectedOrders)[0];
                                                    handleViewDetails(orderId);
                                                }}>
                                                    Ver detalhes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    const orderId = Array.from(selectedOrders)[0];
                                                    router.visit(route('production.orders.show', { order: orderId }));
                                                }}>
                                                    Abrir ordem
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )}
                            <MOViewerHierarchicalView
                                orders={moHierarchy.length > 0 ? moHierarchy : orders}
                                selectedOrders={selectedOrders}
                                onOrderSelect={handleOrderSelect}
                                searchQuery={searchValue}
                                showThumbnails={showThumbnails}
                                showRouteSteps={showRouteSteps}
                                expandedSteps={expandedSteps}
                                onToggleStep={toggleStep}
                                onToggleThumbnails={setShowThumbnails}
                                highlightedSteps={highlightedSteps}
                                onSelectAllPrecedents={handleSelectAllPrecedents}
                                onSelectImmediatePrecedents={handleSelectImmediatePrecedents}
                                onStepClick={handleStepClick}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* MO Selection Modal */}
            <MOSelectionModal
                open={showMOSelectionModal}
                onOpenChange={(open) => {
                    setShowMOSelectionModal(open);
                    if (!open) {
                        setIsInitialLoad(false);
                    }
                }}
                onSelect={handleMOSelection}
                selectedIds={selectedMOId ? new Set([selectedMOId]) : new Set()}
                multiSelect={false}
                defaultStatusFilters={['released', 'in_progress']}
            />

            {/* MO Step Action Dialog */}
            <MOStepActionDialog
                order={selectedMOForDialog as ManufacturingOrder | null}
                isOpen={showMODetailsDialog}
                onOpenChange={setShowMODetailsDialog}
                activeStepId={selectedStepId}
                onStateChanged={() => {
                    // Always refresh the root hierarchy when selectedMOId exists
                    if (selectedMOId) {

                        setLoadingMO(true);
                        axios.get(route('production.tracking.mo-viewer.hierarchy', { orderId: selectedMOId }))
                            .then(response => {

                                if (response.data.order) {
                                    setMOHierarchy([response.data.order]);

                                    // Find the updated order in the hierarchy that matches the dialog
                                    if (showMODetailsDialog && selectedMOForDialog) {
                                        const findOrderInHierarchy = (order: ManufacturingOrderHierarchy, targetId: number): ManufacturingOrderHierarchy | null => {
                                            if (order.id === targetId) return order;
                                            if (order.children) {
                                                for (const child of order.children) {
                                                    const found = findOrderInHierarchy(child, targetId);
                                                    if (found) return found;
                                                }
                                            }
                                            return null;
                                        };

                                        const updatedDialogOrder = findOrderInHierarchy(response.data.order, selectedMOForDialog.id);

                                        if (updatedDialogOrder) {

                                            // Update the selectedMOForDialog by creating a new object with same reference
                                            // This ensures React doesn't see it as a completely new prop
                                            setSelectedMOForDialog(prev => {
                                                if (!prev) return prev;

                                                // Merge the updated data while preserving the object structure
                                                return {
                                                    ...prev,
                                                    ...updatedDialogOrder,
                                                    manufacturing_route: {
                                                        ...(prev.manufacturing_route || {}),
                                                        id: updatedDialogOrder.manufacturing_route?.id || 0,
                                                        name: updatedDialogOrder.manufacturing_route?.name || '',
                                                        steps: updatedDialogOrder.route_steps?.map((step) => ({
                                                            ...step,
                                                            id: step.id,
                                                            manufacturing_route_id: 0,
                                                            display_position: step.display_position,
                                                            name: step.name,
                                                            work_cell: step.work_cell,
                                                            work_cell_id: step.work_cell?.id,
                                                            status: step.status,
                                                            executions: [],
                                                            cumulative_quantity_completed: step.quantity_completed,
                                                            cumulative_quantity_scrapped: step.quantity_scrapped,
                                                            can_start: step.can_start,
                                                            cannot_start_reason: step.cannot_start_reason,
                                                            actual_start_time: step.actual_start_time,
                                                            actual_end_time: step.actual_end_time,
                                                            skip_reason: step.skip_reason,
                                                            skipped_by: step.skipped_by,
                                                            skipped_at: step.skipped_at,
                                                        }))
                                                    },
                                                    has_route: true,
                                                };
                                            });
                                        } else {
                                            // Could not find dialog order in updated hierarchy
                                        }
                                    }
                                }
                            })
                            .catch(() => {
                                // Handle error silently
                            })
                            .finally(() => {
                                setLoadingMO(false);
                            });
                    }
                }}
            />
        </AppLayout>
    );
}
