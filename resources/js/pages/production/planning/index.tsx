import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    FileText,
    CloudCog,
    CloudAlert,
    CloudCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import ManufacturingOrderHierarchicalView from '@/components/production/ManufacturingOrderHierarchicalView';
import RouteBuilder from '@/components/production/planning/RouteBuilder';
import ApplyTemplateDialog from '@/components/production/planning/ApplyTemplateDialog';
import { SaveAsTemplateDialog } from '@/components/production/templates/SaveAsTemplateDialog';
// import WorkCellManager from '@/components/production/planning/WorkCellManager';
// import BulkOperationsPanel from '@/components/production/planning/BulkOperationsPanel';
// import TemplateLibraryPanel from '@/components/production/planning/TemplateLibraryPanel';
import { toast } from 'sonner';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';
import { cn } from '@/lib/utils';

type DetailViewMode = 'route' | 'work-cell' | 'bulk';

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    category?: string;
    item_category?: string;
    steps: Array<{
        id: number;
        sequence: number;
        name: string;
        work_cell_id?: number | null;
        is_required?: boolean;
        setup_time_minutes?: number;
        cycle_time_minutes?: number;
    }>;
    usage_count: number;
    last_used_at?: string;
    rating?: number;
    tags?: string[];
    created_by: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
    is_default?: boolean;
    item_types?: string[];
}


interface PlanningPageProps extends PageProps {
    manufacturingOrders: ManufacturingOrder[];
    routeTemplates: RouteTemplate[];
    workCells: WorkCell[];
    selectedMO?: number;
    permissions: {
        canCreateRoute: boolean;
        canEditRoute: boolean;
        canDeleteRoute: boolean;
        canPlanOrder: boolean;
        canCreateWorkCell: boolean;
        canViewWorkCells: boolean;
        canApplyTemplates: boolean;
        canSaveAsTemplate: boolean;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Produção',
        href: '#',
    },
    {
        title: 'Planejar',
        href: '/production/planning',
    },
];

export default function PlanningPage({
    manufacturingOrders = [],
    routeTemplates = [],
    workCells = [],
    selectedMO,
    permissions
}: PlanningPageProps) {


    // State management
    const [selectedMOs, setSelectedMOs] = useState<Set<number>>(new Set(selectedMO ? [selectedMO] : []));
    const [activeMO, setActiveMO] = useState<number | null>(selectedMO || null);
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('route');
    const [searchQuery, setSearchQuery] = useState('');
    const [showThumbnails] = useState(true);
    const [isCompressed, setIsCompressed] = useState(false);

    // Save status state for RouteBuilder
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    // Save as template state
    const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

    // Apply template dialog state
    const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);

    // Force re-render to update relative time display
    const [, forceUpdate] = useState({});

    // Update relative time display every 30 seconds
    useEffect(() => {
        if (lastSavedAt) {
            const interval = setInterval(() => {
                forceUpdate({});
            }, 30000); // Update every 30 seconds

            return () => clearInterval(interval);
        }
    }, [lastSavedAt]);

    // Handle MO selection
    const handleMOSelect = useCallback((moId: number, multiSelect: boolean = false) => {
        if (multiSelect) {
            const newSelection = new Set(selectedMOs);
            if (newSelection.has(moId)) {
                newSelection.delete(moId);
            } else {
                newSelection.add(moId);
            }
            setSelectedMOs(newSelection);
        } else {
            setSelectedMOs(new Set([moId]));
            setActiveMO(moId);
            setDetailViewMode('route');
        }
    }, [selectedMOs]);


    // Helper function to find MO in nested structure
    const findMOInHierarchy = useCallback((orders: ManufacturingOrder[], targetId: number): ManufacturingOrder | null => {
        for (const order of orders) {
            if (order.id === targetId) {
                return order;
            }
            if (order.children && order.children.length > 0) {
                const found = findMOInHierarchy(order.children, targetId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }, []);

    // Active MO details
    const activeMODetails = useMemo(() => {
        if (!activeMO) return null;
        return findMOInHierarchy(manufacturingOrders, activeMO);
    }, [activeMO, manufacturingOrders, findMOInHierarchy]);

    // Handle marking as planned/draft
    const handleToggleStatus = useCallback(() => {
        if (selectedMOs.size === 0) {
            toast.error('Please select manufacturing orders to change status.');
            return;
        }

        // Determine target state based on current active MO status
        const targetState = activeMODetails?.status === 'planned' ? 'draft' : 'planned';
        const actionText = targetState === 'planned' ? 'marked as planned' : 'reverted to draft';

        router.post(route('production.planning.orders.bulk-transition'), {
            orderIds: Array.from(selectedMOs),
            targetState: targetState,
        }, {
            onSuccess: () => {
                toast.success(`${selectedMOs.size} manufacturing order${selectedMOs.size > 1 ? 's have' : ' has'} been ${actionText}.`);
                // Keep the selection active - don't clear it
                // setSelectedMOs(new Set());
            },
            preserveState: true,
            preserveScroll: true,
        });
    }, [selectedMOs, activeMODetails]);

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            enableCompressedMode={true}
            defaultCompressed={isCompressed}
            onCompressedChange={setIsCompressed}
        >
            <Head title="Planejar" />

            <div className={cn(
                "flex flex-col transition-all duration-200",
                isCompressed ? "h-[calc(100vh-3rem)]" : "h-screen"
            )}>

                {/* Main Content Area */}
                <ResizablePanelGroup
                    direction="horizontal"
                    className="flex-1 bg-background"
                >
                    {/* Left Panel - MO Tree */}
                    <ResizablePanel
                        defaultSize={35}
                        minSize={25}
                        maxSize={50}
                        className="bg-muted/20 dark:bg-muted/10"
                    >
                        <div className="h-full flex flex-col">
                            {/* Search and Filter Bar */}
                            <div className="px-4 py-2 border-b bg-background/50 dark:bg-background/30">
                                <Input
                                    placeholder="Search manufacturing orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-8 text-sm"
                                />
                            </div>

                            {/* MO Tree View */}
                            <div className="flex-1 overflow-auto p-4 bg-background/30 dark:bg-background/10">
                                <ManufacturingOrderHierarchicalView
                                    orders={manufacturingOrders as ManufacturingOrderTreeNode[]}
                                    onOrderSelect={handleMOSelect}
                                    selectedOrders={selectedMOs}
                                    showThumbnails={showThumbnails}
                                    searchQuery={searchQuery}
                                    enhancedMode="planning"
                                    compactMode={true}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    {/* Resize Handle */}
                    <ResizableHandle withHandle />

                    {/* Right Panel - Detail/Action Panel */}
                    <ResizablePanel defaultSize={65}>
                        <div className="h-full flex flex-col bg-background">
                            {/* Global Actions Toolbar */}
                            <div className="border-b bg-card dark:bg-card/95">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <div className="flex items-center space-x-4">
                                        {/* Save status indicator on the left */}
                                        {detailViewMode === 'route' && activeMODetails && permissions.canEditRoute && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-medium">
                                                        {activeMODetails.item?.item_number} - {activeMODetails.item?.name}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    {saveStatus === 'saving' && (
                                                        <>
                                                            <CloudCog className="h-4 w-4 animate-spin text-muted-foreground" />
                                                            <span className="text-muted-foreground">Saving...</span>
                                                        </>
                                                    )}
                                                    {saveStatus === 'saved' && (
                                                        <>
                                                            <CloudCheck className="h-4 w-4 text-green-600" />
                                                            <span className="text-green-600">Saved</span>
                                                        </>
                                                    )}
                                                    {saveStatus === 'error' && (
                                                        <>
                                                            <CloudAlert className="h-4 w-4 text-red-600" />
                                                            <span className="text-red-600">Save failed</span>
                                                        </>
                                                    )}
                                                    {saveStatus === 'idle' && (
                                                        <>
                                                            <CloudCheck className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {lastSavedAt
                                                                    ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
                                                                    : 'Ready'
                                                                }
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <TooltipProvider>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowApplyTemplateDialog(true)}
                                                        disabled={!activeMODetails || selectedMOs.size === 0}
                                                    >
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Templates
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Apply a route template to the selected order</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {permissions.canPlanOrder && detailViewMode === 'route' && activeMODetails && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowSaveAsTemplate(true)}
                                                            disabled={!activeMODetails?.manufacturing_route}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            Salvar como Template
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Salve a rota atual como um template reutilizável</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {permissions.canPlanOrder && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={handleToggleStatus}
                                                            disabled={selectedMOs.size === 0}
                                                        >
                                                            {activeMODetails?.status === 'planned' ? 'Marcar Draft' : 'Marcar Planejada'}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            {activeMODetails?.status === 'planned'
                                                                ? 'Reverter essa ordem para o estado Draft'
                                                                : 'Transicionar essa ordem para o estado Planejado'}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-hidden">
                                {detailViewMode === 'route' && activeMODetails && (
                                    <RouteBuilder
                                        manufacturingOrder={activeMODetails}
                                        workCells={workCells}
                                        permissions={permissions}
                                        onDirtyChange={() => { }}
                                        onSaveStatusChange={setSaveStatus}
                                        onLastSavedAtChange={setLastSavedAt}
                                        isSaving={saveStatus === 'saving'}
                                    />
                                )}
                                {detailViewMode === 'work-cell' && (
                                    <div className="p-4">
                                        <h2 className="text-lg font-semibold mb-4">Work Cell Manager</h2>
                                        <p className="text-muted-foreground">Work cell management interface - To be implemented</p>
                                        <div className="mt-4">
                                            <p className="text-sm">Available work cells: {workCells.length}</p>
                                        </div>
                                    </div>
                                )}
                                {detailViewMode === 'bulk' && (
                                    <div className="p-4">
                                        <h2 className="text-lg font-semibold mb-4">Bulk Operations</h2>
                                        <p className="text-muted-foreground">Perform operations on {Array.from(selectedMOs).length} selected orders</p>
                                        <div className="mt-4">
                                            <p className="text-sm">Available templates: {routeTemplates.length}</p>
                                        </div>
                                    </div>
                                )}
                                {!activeMODetails && detailViewMode === 'route' && (
                                    <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/10 dark:bg-muted/5">
                                        Select a manufacturing order to view its route configuration
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Save as Template Dialog */}
            {activeMODetails?.manufacturing_route && (
                <SaveAsTemplateDialog
                    manufacturingRoute={activeMODetails.manufacturing_route}
                    open={showSaveAsTemplate}
                    onOpenChange={setShowSaveAsTemplate}
                />
            )}

            {/* Apply Template Dialog */}
            {activeMODetails && (
                <ApplyTemplateDialog
                    open={showApplyTemplateDialog}
                    onOpenChange={setShowApplyTemplateDialog}
                    manufacturingOrderId={activeMODetails.id}
                    itemCategory={activeMODetails.item?.category?.name}
                    itemNumber={activeMODetails.item?.item_number}
                    itemName={activeMODetails.item?.name}
                    routeTemplates={routeTemplates}
                />
            )}
        </AppLayout>
    );
}
