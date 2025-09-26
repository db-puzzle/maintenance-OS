import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    FileText,
    List,
    SquareMousePointer,
    ArrowBigUp,
} from 'lucide-react';
import { PlanningService } from '@/services/production/planning-service';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { useRouteChangesStore } from '@/stores/useRouteChangesStore';
import { useMOChangesStore } from '@/stores/useMOChangesStore';
import { SaveActionBar } from '@/components/production/planning/SaveActionBar';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { usePlanningChanges } from '@/hooks/production/usePlanningChanges';
import { usePlanningKeyboardShortcuts } from '@/hooks/production/usePlanningKeyboardShortcuts';
import { RouteStep } from '@/stores/useRouteChangesStore';

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
import { MOSelectionModal } from '@/components/production/planning/MOSelectionModal';
import { UnsavedChangesDialog } from '@/components/production/planning/UnsavedChangesDialog';
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

export default function PlanningPage({
    manufacturingOrders: initialManufacturingOrders = [],
    routeTemplates = [],
    workCells = [],
    selectedMO,
    permissions
}: PlanningPageProps) {
    // Get the latest props from usePage
    const { props } = usePage<PlanningPageProps>();

    // State to track manufacturingOrders updates
    const [localManufacturingOrders, setLocalManufacturingOrders] = useState(initialManufacturingOrders);

    // Update local state when props change
    useEffect(() => {
        if (props.manufacturingOrders) {
            setLocalManufacturingOrders(props.manufacturingOrders);
        }
    }, [props.manufacturingOrders]);

    // Use local state which will trigger re-renders
    const manufacturingOrders = localManufacturingOrders;


    // Convert selectedMO to number once
    const initialSelectedMO = useMemo(() => selectedMO ? Number(selectedMO) : null, [selectedMO]);

    // State management
    const [selectedMOs, setSelectedMOs] = useState<Set<number>>(() => new Set(initialSelectedMO ? [initialSelectedMO] : []));
    const [activeMO, setActiveMO] = useState<number | null>(initialSelectedMO);
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('route');
    const [searchQuery, setSearchQuery] = useState('');
    const [showThumbnails] = useState(true);
    const [isCompressed, setIsCompressed] = useState(false);

    // Route and MO changes stores (still needed for component props)
    const routeChangesStore = useRouteChangesStore();
    const moChangesStore = useMOChangesStore();

    // Navigation guard
    const { allowNavigation } = useNavigationGuard({
        hasChanges: routeChangesStore.hasChanges() || moChangesStore.hasChanges(),
        message: 'You have unsaved changes. Are you sure you want to leave?',
        onNavigate: async (_url) => {
            return new Promise((resolve) => {
                setUnsavedChangesDialog({
                    open: true,
                    type: 'navigation',
                    pendingAction: () => {
                        resolve(true);
                    }
                });
            });
        }
    });

    // Use planning changes hook for save/cancel logic
    const {
        routeSaveStatus,
        moSaveStatus,
        hasUnsavedChanges,
        saveAllChanges,
        cancelAllChanges,
        findMOInHierarchy,
    } = usePlanningChanges(activeMO, initialSelectedMO, allowNavigation);

    // Save as template state
    const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

    // Apply template dialog state
    const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);

    // MO Selection modal state - Start with modal open if no MO is selected
    const [showMOSelectionModal, setShowMOSelectionModal] = useState(() => !initialSelectedMO);

    // Unsaved changes dialog state
    const [unsavedChangesDialog, setUnsavedChangesDialog] = useState<{
        open: boolean;
        type: 'mo-switch' | 'navigation' | 'discard';
        pendingAction?: () => void;
        targetMO?: number;
    }>({
        open: false,
        type: 'mo-switch',
    });


    // Use keyboard shortcuts hook
    usePlanningKeyboardShortcuts({
        onOpenMOSelection: () => setShowMOSelectionModal(true),
    });

    // Handle MO selection
    const handleMOSelect = useCallback((moId: number, multiSelect: boolean = false) => {
        // No longer show dialog when switching MOs - we track changes across multiple MOs
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




    // Active MO details
    const activeMODetails = useMemo(() => {
        if (!activeMO) return null;
        return findMOInHierarchy(manufacturingOrders, activeMO);
    }, [activeMO, manufacturingOrders, findMOInHierarchy]);

    // Handle route steps change
    const handleRouteStepsChange = useCallback((steps: RouteStep[]) => {
        if (activeMO && activeMODetails) {
            // Track changes in the store
            // Convert ManufacturingStep[] to RouteStep[] for the original steps
            // IMPORTANT: This conversion must match EXACTLY how RouteBuilder converts steps
            const originalSteps: RouteStep[] = (activeMODetails.manufacturing_route?.steps || []).map((step, index) => ({
                id: step.id?.toString() || `existing-${index}`,
                sequence: step.step_number || index + 1,
                name: step.name,
                description: step.description || '',
                work_cell_id: step.work_cell_id ?? null,
                setup_time_minutes: step.setup_time_minutes || 0,
                cycle_time_minutes: step.cycle_time_minutes || 0,
                step_type: step.step_type || 'standard',
                is_required: true, // Default to true as ManufacturingStep doesn't have this field
                quality_check_mode: step.quality_check_mode,
                sampling_size: step.sampling_size,
                form_id: step.form_id,
                // Always create gate_after to match RouteBuilder's conversion
                gate_after: {
                    dependency_type: step.child_order_dependency_type === 'none'
                        ? 'none'
                        : (step.child_order_dependency_type || 'all_children_completed') as 'none' | 'all_children_completed' | 'children_quantity',
                    minimum_quantity: step.child_order_minimum_quantity || 0
                }
            }));

            routeChangesStore.trackChange(activeMO, steps, originalSteps);
        }
    }, [activeMO, routeChangesStore, activeMODetails]);

    // Handle priority change
    const handlePriorityChange = useCallback((orderId: number, priority: number) => {
        const order = findMOInHierarchy(manufacturingOrders, orderId);
        if (order) {
            moChangesStore.trackPriorityChange(orderId, priority, order.priority || 50);
        }
    }, [findMOInHierarchy, moChangesStore, manufacturingOrders]);


    // Handle marking as planned/draft
    const handleToggleStatus = useCallback(() => {
        if (selectedMOs.size === 0) {
            toast.error('Please select manufacturing orders to change status.');
            return;
        }

        // Determine target state based on current active MO status
        const targetState = activeMODetails?.status === 'planned' ? 'draft' : 'planned';
        const actionText = targetState === 'planned' ? 'marked as planned' : 'reverted to draft';

        // Store current selection and active MO before the request
        const currentSelectedMOs = new Set(selectedMOs);
        const currentActiveMO = activeMO;

        // Allow navigation for this request
        allowNavigation();

        PlanningService.bulkTransition(
            {
                orderIds: Array.from(selectedMOs),
                targetState: targetState,
            },
            {
                onSuccess: () => {
                    toast.success(`${selectedMOs.size} manufacturing order${selectedMOs.size > 1 ? 's have' : ' has'} been ${actionText}.`);

                    // Restore selection after the update
                    setSelectedMOs(currentSelectedMOs);
                    setActiveMO(currentActiveMO);
                },
                onError: () => {
                    // Handle error silently
                },
                preserveState: false,
            }
        );
    }, [selectedMOs, activeMODetails, activeMO, allowNavigation]);

    // Handle MO selection from modal
    const handleModalMOSelect = useCallback((orderIds: number[]) => {
        if (orderIds.length > 0) {
            const selectedId = orderIds[0];

            setSelectedMOs(new Set([selectedId]));
            setActiveMO(selectedId);
            setDetailViewMode('route');
            setShowMOSelectionModal(false); // Close the modal

            // Always reload the page with the new selected MO to get proper hierarchy
            PlanningService.navigateToMO(selectedId);
        }
    }, []);

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
                        defaultSize={40}
                        minSize={25}
                        maxSize={60}
                        className="bg-muted/20 dark:bg-muted/10"
                    >
                        <div className="h-full flex flex-col">
                            {/* Search and Filter Bar */}
                            <div className="px-4 py-2 border-b bg-background/50 dark:bg-background/30">
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Search manufacturing orders..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 h-7 text-sm"
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={manufacturingOrders.length === 0 || !manufacturingOrders[0].parent_id}
                                                        onClick={() => {
                                                            const parentId = manufacturingOrders[0].parent_id;
                                                            if (parentId) {
                                                                handleMOSelect(parentId, false);
                                                                PlanningService.navigateToMO(parentId);
                                                            }
                                                        }}
                                                    >
                                                        <ArrowBigUp className="h-4 w-4 mr-2" />
                                                        Abrir MO-Pai
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    {manufacturingOrders.length === 0
                                                        ? "No manufacturing order selected"
                                                        : !manufacturingOrders[0].parent_id
                                                            ? "Essa é a MO Raiz"
                                                            : "Navegar para MO-Pai"}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowMOSelectionModal(true);
                                        }}
                                    >
                                        <SquareMousePointer className="h-4 w-4 mr-2" />
                                        Abrir MO
                                    </Button>
                                </div>
                            </div>

                            {/* MO Tree View */}
                            <div className="flex-1 overflow-auto bg-background/30 dark:bg-background/10 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-corner]:bg-transparent">
                                {manufacturingOrders.length > 0 ? (
                                    <div className="min-w-fit p-4 pb-8">
                                        <ManufacturingOrderHierarchicalView
                                            orders={manufacturingOrders as ManufacturingOrderTreeNode[]}
                                            onOrderSelect={handleMOSelect}
                                            selectedOrders={selectedMOs}
                                            showThumbnails={showThumbnails}
                                            searchQuery={searchQuery}
                                            enhancedMode="planning"
                                            compactMode={true}
                                            onPriorityChange={handlePriorityChange}
                                            priorityChanges={(() => {
                                                const map = new Map<number, { priority: number }>();
                                                moChangesStore.getAllChanges().forEach(change => {
                                                    map.set(change.orderId, { priority: change.priority });
                                                });
                                                return map;
                                            })()}
                                            routeChanges={(() => {
                                                const map = new Map<number, { steps: Array<{ [key: string]: unknown; id: string | number; sequence: number; name: string; }> }>();
                                                routeChangesStore.getAllChanges().forEach(change => {
                                                    map.set(change.orderId, { steps: change.steps as unknown as Array<{ [key: string]: unknown; id: string | number; sequence: number; name: string; }> });
                                                });
                                                return map;
                                            })()}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <List className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Manufacturing Order Selected</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Select a manufacturing order to start planning
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setShowMOSelectionModal(true);
                                            }}
                                            variant="default"
                                        >
                                            <List className="h-4 w-4 mr-2" />
                                            Select Manufacturing Order
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    {/* Resize Handle */}
                    <ResizableHandle withHandle />

                    {/* Right Panel - Detail/Action Panel */}
                    <ResizablePanel defaultSize={60}>
                        <div className="h-full flex flex-col bg-background">
                            {/* Global Actions Toolbar */}
                            <div className="border-b bg-card dark:bg-card/95">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <div className="flex items-center space-x-4">
                                        {/* Item title on the left */}
                                        {detailViewMode === 'route' && activeMODetails && (
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-medium">
                                                    {activeMODetails.item?.item_number} - {activeMODetails.item?.name}
                                                </h3>
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
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {/* Route Builder */}
                                {detailViewMode === 'route' && activeMODetails && (
                                    <div className="flex-1">
                                        <RouteBuilder
                                            manufacturingOrder={activeMODetails}
                                            workCells={workCells}
                                            permissions={permissions}
                                            onStepsChange={handleRouteStepsChange}
                                            onSaveStatusChange={() => { }} // No longer needed, handled by hook
                                            isSaving={routeSaveStatus === 'saving'}
                                            onParentMOClick={(parentId) => {
                                                handleMOSelect(parentId, false);
                                            }}
                                        />
                                    </div>
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
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10 dark:bg-muted/5">
                                        <List className="h-12 w-12 mb-4 opacity-50" />
                                        <p className="text-lg mb-2">No Manufacturing Order Selected</p>
                                        <p className="text-sm mb-4">Select a manufacturing order to view its route configuration</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowMOSelectionModal(true)}
                                        >
                                            <List className="h-4 w-4 mr-2" />
                                            Select Order
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Floating Action Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
                            size="icon"
                            onClick={() => {
                                setShowMOSelectionModal(true);
                            }}
                        >
                            <List className="h-6 w-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>Select Manufacturing Orders (Cmd/Ctrl+K)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

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
                    onTemplateApplied={() => {
                        // Small delay to ensure backend has completed processing
                        PlanningService.reloadData({ delay: 100 });
                    }}
                />
            )}

            {/* MO Selection Modal */}
            <MOSelectionModal
                open={showMOSelectionModal}
                onOpenChange={setShowMOSelectionModal}
                onSelect={handleModalMOSelect}
                selectedIds={useMemo(() =>
                    activeMO ? new Set<number>([activeMO]) : new Set<number>(),
                    [activeMO]
                )}
                multiSelect={false}
            />

            {/* Unsaved Changes Dialog */}
            <UnsavedChangesDialog
                open={unsavedChangesDialog.open}
                onOpenChange={(open) => setUnsavedChangesDialog(prev => ({ ...prev, open }))}
                type={unsavedChangesDialog.type}
                changeDetails={{
                    routeChanges: routeChangesStore.getAllChanges().length,
                    priorityChanges: moChangesStore.getAllChanges().length,
                }}
                onSaveAndContinue={async () => {
                    if (unsavedChangesDialog.type === 'navigation') {
                        // Save all changes
                        await saveAllChanges();
                        unsavedChangesDialog.pendingAction?.();
                    }
                    setUnsavedChangesDialog({ open: false, type: 'mo-switch' });
                }}
                onDiscardChanges={() => {
                    if (unsavedChangesDialog.type === 'navigation') {
                        cancelAllChanges();
                    }
                    unsavedChangesDialog.pendingAction?.();
                    setUnsavedChangesDialog({ open: false, type: 'mo-switch' });
                }}
                onCancel={() => {
                    setUnsavedChangesDialog({ open: false, type: 'mo-switch' });
                }}
            />

            {/* Combined Save Action Bar */}
            {(hasUnsavedChanges) && (
                <SaveActionBar
                    changeCount={
                        routeChangesStore.getAllChanges().length +
                        moChangesStore.getAllChanges().length
                    }
                    changeType="combined"
                    routeChangeCount={routeChangesStore.getAllChanges().length}
                    moChangeCount={moChangesStore.getAllChanges().length}
                    onCancel={cancelAllChanges}
                    onSave={saveAllChanges}
                    isSaving={routeSaveStatus === 'saving' || moSaveStatus === 'saving'}
                    position="top"
                />
            )}
        </AppLayout>
    );
}
