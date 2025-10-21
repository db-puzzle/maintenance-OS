import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    RefreshCw,
    AlertCircle,
    Clock,
    Package,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    User,
    TrendingDown,
    MoreVertical
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';
import { GenericHierarchicalTreeView, NodeRenderProps } from '@/components/production/shared/GenericHierarchicalTreeView';
import { HierarchicalViewHeader } from '@/components/production/shared/HierarchicalViewHeader';
import { useTreeExpansion } from '@/components/production/shared/useTreeExpansion';
import { OrderCardCompact } from '@/components/production/manufacturing-order/OrderCardCompact';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface RouteStep {
    id: number;
    name: string;
    step_number: number;
    status: string;
    work_cell: {
        id: number;
        name: string;
    } | null;
    quantity_completed: number;
    quantity_scrapped: number;
    quantity_total: number;
    rejection_rate: number;
    current_operator: {
        id: number;
        name: string;
    } | null;
    has_quality_issue: boolean;
    has_delay: boolean;
    setup_time_seconds?: number;
    cycle_time_seconds?: number;
    total_time_seconds?: number;
}

interface ManufacturingOrderHierarchy {
    id: number;
    order_number: string;
    status: string;
    priority: number;
    level: number;
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
    statusCounts: Record<string, number>;
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
}> = ({ orders, selectedOrders, onOrderSelect, searchQuery: _searchQuery, showThumbnails, showRouteSteps, expandedSteps, onToggleStep, onToggleThumbnails }) => {
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
                        {order.route_steps.map((step) => (
                            <div
                                key={step.id}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 text-xs rounded border-l-2",
                                    step.status === 'completed' && "border-l-green-500 bg-green-50 dark:bg-green-950/20",
                                    step.status === 'in_progress' && "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
                                    step.status === 'queued' && "border-l-gray-400",
                                    step.has_quality_issue && "border-l-red-500",
                                    step.has_delay && "border-l-orange-500"
                                )}
                            >
                                <span className="text-[10px] text-muted-foreground">#{step.step_number}</span>
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [selectedOrders, showThumbnails, showRouteSteps, expandedSteps, onToggleStep, onOrderSelect]);

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
    statusCounts = {},
    filters = {},
    canUpdate: _canUpdate = false
}: PageProps) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showRouteSteps, setShowRouteSteps] = useState(true);
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
        if (filters.statuses) {
            return Array.isArray(filters.statuses) ? filters.statuses : filters.statuses.split(',');
        }
        return ['released', 'in_progress', 'on_hold'];
    });


    // Debounce timer ref
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['orders', 'statusCounts']
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

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

    const handleStatusToggle = (status: string, checked: boolean) => {
        const newStatuses = checked
            ? [...selectedStatuses, status]
            : selectedStatuses.filter(s => s !== status);

        setSelectedStatuses(newStatuses);

        router.get(route('production.tracking.mo-viewer'), {
            ...filters,
            statuses: newStatuses.join(',')
        }, {
            preserveState: true,
            preserveScroll: true
        });
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
        { title: 'Produção', href: '#' },
        { title: 'Acompanhamento de Produção', href: '#' }
    ];

    // Status cards
    const statusCards = [
        {
            key: 'released',
            label: 'Liberadas',
            count: statusCounts.released || 0,
            icon: Package,
            color: 'text-muted-foreground'
        },
        {
            key: 'in_progress',
            label: 'Em Andamento',
            count: statusCounts.in_progress || 0,
            icon: Clock,
            color: 'text-muted-foreground'
        },
        {
            key: 'on_hold',
            label: 'Suspensas',
            count: statusCounts.on_hold || 0,
            icon: AlertCircle,
            color: 'text-muted-foreground'
        }
    ];

    // Count alerts
    const alertCount = orders.reduce((sum, order) => {
        const countAlerts = (o: ManufacturingOrderHierarchy): number => {
            let count = 0;
            if (o.has_quality_issues) count++;
            if (o.has_delays) count++;
            if (o.is_overdue) count++;
            return count + (o.children ? o.children.reduce((s, c) => s + countAlerts(c), 0) : 0);
        };
        return sum + countAlerts(order);
    }, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Acompanhamento de Produção" />

            <ListLayout
                title="Acompanhamento de Produção"
                description="Visão hierárquica do progresso das ordens de manufatura"
                searchPlaceholder="Buscar por número da ordem ou nome do item..."
                searchValue={searchValue}
                onSearchChange={handleSearch}
                createButtonText=""
                actions={
                    <div className="flex items-center gap-2">
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
                    </div>
                }
            >
                {/* Alert Strip */}
                {alertCount > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            {alertCount} alerta{alertCount > 1 ? 's' : ''} de produção
                        </span>
                    </div>
                )}

                {/* Status Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {statusCards.map(card => {
                        const isSelected = selectedStatuses.includes(card.key);
                        return (
                            <Card
                                key={card.key}
                                variant="compact"
                                className={cn(
                                    "cursor-pointer transition-all",
                                    "hover:shadow-md",
                                    isSelected && "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                )}
                                onClick={() => handleStatusToggle(card.key, !isSelected)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-bold">{card.count}</p>
                                        </div>
                                        <card.icon className={cn("h-8 w-8", card.color)} strokeWidth={1} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Main Content - Hierarchical View with Route Steps */}
                <div className="h-[calc(100vh-320px)]">
                    <div className="h-full">
                        {selectedOrders.size > 0 && (
                            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    {selectedOrders.size === 1
                                        ? `Ordem Selecionada: ${orders.find(o => selectedOrders.has(o.id))?.order_number || ''}`
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
                            orders={orders}
                            selectedOrders={selectedOrders}
                            onOrderSelect={handleOrderSelect}
                            searchQuery={searchValue}
                            showThumbnails={showThumbnails}
                            showRouteSteps={showRouteSteps}
                            expandedSteps={expandedSteps}
                            onToggleStep={toggleStep}
                            onToggleThumbnails={setShowThumbnails}
                        />
                    </div>
                </div>
            </ListLayout>

        </AppLayout>
    );
}
