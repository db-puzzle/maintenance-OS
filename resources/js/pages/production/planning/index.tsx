import React, { useState, useCallback, useMemo } from 'react';
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
import { MarkChildrenPlannedDialog } from '@/components/production/planning/MarkChildrenPlannedDialog';
import { MarkChildrenReleasedDialog } from '@/components/production/planning/MarkChildrenReleasedDialog';
import { MultipleOrdersPanel } from '@/components/production/planning/MultipleOrdersPanel';
// import { UnsavedChangesDialog } from '@/components/production/planning/UnsavedChangesDialog';
// import WorkCellManager from '@/components/production/planning/WorkCellManager';
// import BulkOperationsPanel from '@/components/production/planning/BulkOperationsPanel';
// import TemplateLibraryPanel from '@/components/production/planning/TemplateLibraryPanel';
import { toast } from 'sonner';
import { PageProps, BreadcrumbItem } from '@/types';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
        title: 'Planejamento',
        href: '/production/planning',
    },
];

interface PlanningPageProps extends PageProps {
    manufacturingOrders: ManufacturingOrder[];
    routeTemplates: RouteTemplate[];
    workCells: WorkCell[];
    plants: { id: number; name: string }[];
    shifts: { id: number; name: string }[];
    manufacturers: { id: number; name: string }[];
    unitsOfMeasure: {
        id: number;
        code: string;
        name: string;
        symbol?: string;
        uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    }[];
    selectedMO?: number;
    userSelection?: number[];
    activeMO?: number | null;
    sortField?: string;
    sortDirection?: string;
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
    preservedSelection?: {
        userSelection: number[];
        activeMO: number | null;
    };
    preservedSorting?: {
        sortField: string;
        sortDirection: string;
    };
}

export default function PlanningPage({
    manufacturingOrders = [],
    routeTemplates = [],
    workCells = [],
    plants = [],
    shifts = [],
    manufacturers = [],
    unitsOfMeasure = [],
    selectedMO,
    userSelection = [],
    activeMO: initialActiveMO = null,
    sortField: initialSortField = 'order_number',
    sortDirection: initialSortDirection = 'asc',
    permissions,
    preservedSelection,
    preservedSorting
}: PlanningPageProps) {
    // Get the latest props from usePage
    const { props } = usePage<PlanningPageProps>();

    // Use manufacturingOrders directly from props if available, otherwise use initial props
    const currentManufacturingOrders = props.manufacturingOrders || manufacturingOrders;

    // Also get the latest data for work cell creation
    const currentPlants = props.plants || plants;
    const currentShifts = props.shifts || shifts;
    const currentManufacturers = props.manufacturers || manufacturers;
    const currentUnitsOfMeasure = props.unitsOfMeasure || unitsOfMeasure;


    // Convert selectedMO to number once
    const initialSelectedMO = useMemo(() => selectedMO ? Number(selectedMO) : null, [selectedMO]);

    // Initialize state from URL params or preserved selection
    const getInitialSelectedMOs = () => {
        if (preservedSelection?.userSelection && preservedSelection.userSelection.length > 0) {
            return new Set(preservedSelection.userSelection.map(id => Number(id)));
        }
        if (userSelection && userSelection.length > 0) {
            return new Set(userSelection.map(id => Number(id)));
        }
        if (initialSelectedMO) {
            return new Set([initialSelectedMO]);
        }
        return new Set<number>();
    };

    const getInitialActiveMO = () => {
        if (preservedSelection?.activeMO !== undefined) {
            return preservedSelection.activeMO;
        }
        if (initialActiveMO !== null) {
            return initialActiveMO;
        }
        return initialSelectedMO;
    };

    // State management
    const [selectedMOs, setSelectedMOs] = useState<Set<number>>(getInitialSelectedMOs);
    const [activeMO, setActiveMO] = useState<number | null>(getInitialActiveMO);
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('route');
    const [searchQuery, setSearchQuery] = useState('');
    const [showThumbnails] = useState(true);
    const [isCompressed, setIsCompressed] = useState(false);

    // Sorting state - lifted from ManufacturingOrderHierarchicalView
    const [sortField, setSortField] = useState<string>(preservedSorting?.sortField || initialSortField);
    const [sortDirection, setSortDirection] = useState<string>(preservedSorting?.sortDirection || initialSortDirection);

    // Route and MO changes stores (still needed for component props)
    const routeChangesStore = useRouteChangesStore();
    const moChangesStore = useMOChangesStore();

    // Navigation guard
    const { allowNavigation } = useNavigationGuard({
        hasChanges: routeChangesStore.hasChanges() || moChangesStore.hasChanges(),
        message: 'You have unsaved changes. Are you sure you want to leave?',
        onNavigate: async (_url) => {
            return new Promise((resolve) => {
                setModalState({
                    open: true,
                    type: 'navigation',
                    pendingAction: () => {
                        resolve(true);
                    }
                });
            });
        }
    });

    // Get current state callback
    const getCurrentState = useCallback(() => ({
        selectedMOs: new Set(selectedMOs),
        activeMO: activeMO
    }), [selectedMOs, activeMO]);

    // Restore state callback
    const restoreState = useCallback((state: { selectedMOs: Set<number>; activeMO: number | null }) => {
        setSelectedMOs(state.selectedMOs);
        setActiveMO(state.activeMO);
    }, []);

    // Use planning changes hook for save/cancel logic
    const {
        routeSaveStatus,
        moSaveStatus,
        hasUnsavedChanges,
        saveAllChanges,
        cancelAllChanges,
        findMOInHierarchy,
    } = usePlanningChanges(activeMO, initialSelectedMO || undefined, allowNavigation, getCurrentState, restoreState, sortField, sortDirection);

    // Save as template state
    const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

    // Apply template dialog state
    const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);

    // MO Selection modal state - Start with modal open if no MO is selected
    const [showMOSelectionModal, setShowMOSelectionModal] = useState(() => !initialSelectedMO);

    // Modal state for SaveActionBar
    const [modalState, setModalState] = useState<{
        open: boolean;
        type: 'mo-switch' | 'navigation' | 'discard';
        pendingAction?: () => void;
        targetMO?: number;
    }>({
        open: false,
        type: 'mo-switch',
    });

    // Dialog state for unsaved changes warning
    const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);

    // Dialog state for marking children as planned
    const [showMarkChildrenDialog, setShowMarkChildrenDialog] = useState(false);
    const [pendingPlannedTransition, setPendingPlannedTransition] = useState<{
        orderIds: number[];
        parentOrder: ManufacturingOrder | null;
        childrenCount: number;
    } | null>(null);

    // Dialog state for marking children as released
    const [showMarkChildrenReleasedDialog, setShowMarkChildrenReleasedDialog] = useState(false);
    const [pendingReleasedTransition, setPendingReleasedTransition] = useState<{
        orderIds: number[];
        parentOrder: ManufacturingOrder | null;
        childrenCount: number;
    } | null>(null);


    // Use keyboard shortcuts hook
    usePlanningKeyboardShortcuts({
        onOpenMOSelection: () => setShowMOSelectionModal(true),
    });

    // Handle MO selection
    const handleMOSelect = useCallback((moId: number, multiSelect: boolean = false) => {
        // No longer show dialog when switching MOs - we track changes across multiple MOs
        let newSelection: Set<number>;
        let newActiveMO: number | null;

        if (multiSelect) {
            newSelection = new Set(selectedMOs);
            if (newSelection.has(moId)) {
                newSelection.delete(moId);
            } else {
                newSelection.add(moId);
            }
            setSelectedMOs(newSelection);
            newActiveMO = activeMO;
        } else {
            newSelection = new Set([moId]);
            newActiveMO = moId;
            setSelectedMOs(newSelection);
            setActiveMO(moId);
            setDetailViewMode('route');
        }

        // Update URL with new selection and preserve sorting parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Update selection parameters
        if (newSelection.size > 0) {
            urlParams.set('userSelection', Array.from(newSelection).join(','));
        } else {
            urlParams.delete('userSelection');
        }

        if (newActiveMO !== null) {
            urlParams.set('activeMO', newActiveMO.toString());
        } else {
            urlParams.delete('activeMO');
        }

        // Preserve sorting parameters
        if (sortField) {
            urlParams.set('sortField', sortField);
        }
        if (sortDirection) {
            urlParams.set('sortDirection', sortDirection);
        }

        // Update URL without page reload
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }, [selectedMOs, activeMO, sortField, sortDirection]);




    // Active MO details
    const activeMODetails = useMemo(() => {
        if (!activeMO) return null;
        return findMOInHierarchy(currentManufacturingOrders, activeMO);
    }, [activeMO, currentManufacturingOrders, findMOInHierarchy]);

    // Get all selected MO details for multiple selection panel
    const selectedMODetails = useMemo(() => {
        const details: ManufacturingOrder[] = [];
        selectedMOs.forEach(moId => {
            const mo = findMOInHierarchy(currentManufacturingOrders, moId);
            if (mo) {
                details.push(mo);
            }
        });
        return details;
    }, [selectedMOs, currentManufacturingOrders, findMOInHierarchy]);

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
                use_workcell_throughput: step.use_workcell_throughput ?? false, // Match RouteBuilder's conversion
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
        const order = findMOInHierarchy(currentManufacturingOrders, orderId);
        if (order) {
            moChangesStore.trackPriorityChange(orderId, priority, order.priority || 50);
        }
    }, [findMOInHierarchy, moChangesStore, currentManufacturingOrders]);


    // Helper function to count all children of selected orders
    const countChildrenForOrders = useCallback((orderIds: number[]): number => {
        let totalChildren = 0;
        const visited = new Set<number>();

        const countChildren = (order: ManufacturingOrder): number => {
            if (visited.has(order.id)) return 0;
            visited.add(order.id);

            let count = 0;
            if (order.children && order.children.length > 0) {
                count += order.children.length;
                for (const child of order.children) {
                    count += countChildren(child);
                }
            }
            return count;
        };

        for (const orderId of orderIds) {
            const order = findMOInHierarchy(currentManufacturingOrders, orderId);
            if (order) {
                totalChildren += countChildren(order);
            }
        }

        return totalChildren;
    }, [currentManufacturingOrders, findMOInHierarchy]);

    // Helper function to get button label based on status
    const getStatusButtonLabel = useCallback(() => {
        if (!activeMODetails) return '';

        switch (activeMODetails.status) {
            case 'draft':
                return 'Marcar Planejada';
            case 'planned':
                return 'Liberar para Produção';
            case 'released':
                return activeMODetails.canRevertStatus
                    ? 'Reverter para Planejada'
                    : 'Ordem em Produção';
            default:
                return '';
        }
    }, [activeMODetails]);

    // Helper function to get target state based on current status
    const getTargetState = useCallback((currentStatus: string): 'draft' | 'planned' | 'released' | null => {
        switch (currentStatus) {
            case 'draft':
                return 'planned';
            case 'planned':
                return 'released';
            case 'released':
                return 'planned';
            default:
                return null;
        }
    }, []);

    // Handle marking as planned/draft/released
    const handleToggleStatus = useCallback(() => {
        if (selectedMOs.size === 0) {
            toast.error('Por favor, selecione ordens de fabricação para alterar o status.');
            return;
        }

        // Check for unsaved changes before allowing status transition
        if (hasUnsavedChanges) {
            setShowUnsavedChangesDialog(true);
            return;
        }

        // Determine target state based on current active MO status
        const targetState = getTargetState(activeMODetails?.status || '');

        if (!targetState) {
            toast.error('Não é possível alterar o status desta ordem.');
            return;
        }

        // Check if this is a reversal and if the order can be reverted
        if (activeMODetails?.status === 'released' && targetState === 'planned') {
            if (!activeMODetails.canRevertStatus) {
                toast.error('Esta ordem não pode ser revertida pois já foi iniciada na produção.');
                return;
            }
        }

        const orderIds = Array.from(selectedMOs);
        const childrenCount = countChildrenForOrders(orderIds);

        // Check if transitioning to planned and if any selected order has children
        if (targetState === 'planned' && activeMODetails?.status === 'draft' && childrenCount > 0 && activeMODetails) {
            // Show dialog to ask about children for draft -> planned
            setPendingPlannedTransition({
                orderIds,
                parentOrder: activeMODetails,
                childrenCount
            });
            setShowMarkChildrenDialog(true);
            return;
        }

        // Check if transitioning to released and if any selected order has children
        if (targetState === 'released' && childrenCount > 0 && activeMODetails) {
            // Show dialog to ask about children for planned -> released
            setPendingReleasedTransition({
                orderIds,
                parentOrder: activeMODetails,
                childrenCount
            });
            setShowMarkChildrenReleasedDialog(true);
            return;
        }

        // No children or transitioning without children consideration - proceed directly
        performStatusTransition(orderIds, targetState, false);
    }, [selectedMOs, activeMODetails, hasUnsavedChanges, countChildrenForOrders, getTargetState, performStatusTransition]);

    // Function to actually perform the status transition
    const performStatusTransition = useCallback((orderIds: number[], targetState: 'planned' | 'draft' | 'released', includeChildren: boolean) => {
        const actionText = targetState === 'released'
            ? 'liberada para produção'
            : targetState === 'planned'
                ? 'marcada como planejada'
                : 'revertida para rascunho';

        PlanningService.bulkTransition(
            {
                orderIds: orderIds,
                targetState: targetState,
                includeChildren: includeChildren,
            },
            {
                onSuccess: () => {
                    const orderCount = includeChildren && targetState === 'planned'
                        ? orderIds.length + countChildrenForOrders(orderIds)
                        : orderIds.length;

                    toast.success(`${orderCount} ordem${orderCount > 1 ? 's de fabricação foram' : ' de fabricação foi'} ${actionText}.`);

                    // Trigger a reload of the data while preserving state
                    PlanningService.reloadData({
                        only: ['manufacturingOrders'],
                        preserveState: true,
                        preserveScroll: true,
                    });
                },
                onError: () => {
                    toast.error('Falha ao atualizar o status da ordem de fabricação.');
                },
                preserveState: true,
                userSelection: Array.from(selectedMOs),
                activeMO: activeMO,
                sortField: sortField,
                sortDirection: sortDirection
            }
        );
    }, [selectedMOs, activeMO, sortField, sortDirection, countChildrenForOrders]);

    // Handle MO selection from modal
    const handleModalMOSelect = useCallback((orderIds: number[]) => {
        if (orderIds.length > 0) {
            const selectedId = orderIds[0];

            setSelectedMOs(new Set([selectedId]));
            setActiveMO(selectedId);
            setDetailViewMode('route');
            setShowMOSelectionModal(false); // Close the modal

            // Always reload the page with the new selected MO to get proper hierarchy
            // Pass current selection state to preserve it
            PlanningService.navigateToMO(
                selectedId,
                [selectedId], // User selection becomes just the newly selected MO
                selectedId,   // Active MO is also the newly selected MO
                sortField,
                sortDirection
            );
        }
    }, [sortField, sortDirection]);

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            enableCompressedMode={true}
            defaultCompressed={isCompressed}
            onCompressedChange={setIsCompressed}
        >
            <Head title="Planejar" />

            <div className={cn(
                "flex flex-col transition-all duration-200 overflow-hidden",
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
                                                        disabled={currentManufacturingOrders.length === 0 || !currentManufacturingOrders[0].parent_id}
                                                        onClick={() => {
                                                            const parentId = currentManufacturingOrders[0].parent_id;
                                                            if (parentId) {
                                                                handleMOSelect(parentId, false);
                                                                PlanningService.navigateToMO(
                                                                    parentId,
                                                                    Array.from(selectedMOs),
                                                                    activeMO,
                                                                    sortField,
                                                                    sortDirection
                                                                );
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
                                                    {currentManufacturingOrders.length === 0
                                                        ? "No manufacturing order selected"
                                                        : !currentManufacturingOrders[0].parent_id
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
                                {currentManufacturingOrders.length > 0 ? (
                                    <div className="min-w-fit p-4 pb-8">
                                        <ManufacturingOrderHierarchicalView
                                            orders={currentManufacturingOrders as ManufacturingOrderTreeNode[]}
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
                                            sortField={sortField as 'priority' | 'order_number'}
                                            sortDirection={sortDirection as 'asc' | 'desc'}
                                            onSortChange={(field, direction) => {
                                                setSortField(field);
                                                setSortDirection(direction);

                                                // Update URL with new sorting parameters
                                                const urlParams = new URLSearchParams(window.location.search);
                                                urlParams.set('sortField', field);
                                                urlParams.set('sortDirection', direction);

                                                // Preserve other parameters
                                                if (selectedMOs.size > 0) {
                                                    urlParams.set('userSelection', Array.from(selectedMOs).join(','));
                                                }
                                                if (activeMO !== null) {
                                                    urlParams.set('activeMO', activeMO.toString());
                                                }

                                                // Update URL without page reload
                                                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                                                window.history.replaceState({}, '', newUrl);
                                            }}
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
                                        {detailViewMode === 'route' && selectedMOs.size === 1 && activeMODetails && (
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-medium">
                                                    {activeMODetails.item?.item_number} - {activeMODetails.item?.name}
                                                </h3>
                                            </div>
                                        )}
                                        {detailViewMode === 'route' && selectedMOs.size > 1 && (
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-medium">
                                                    {selectedMOs.size} Manufacturing Orders Selected
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
                                                        disabled={selectedMOs.size === 0}
                                                    >
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Templates
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Apply a route template to the selected order{selectedMOs.size > 1 ? 's' : ''}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {permissions.canPlanOrder && detailViewMode === 'route' && activeMODetails && selectedMOs.size === 1 && (
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
                                                            disabled={
                                                                selectedMOs.size === 0 ||
                                                                (activeMODetails?.status === 'released' && !activeMODetails?.canRevertStatus)
                                                            }
                                                        >
                                                            {getStatusButtonLabel()}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            {activeMODetails?.status === 'draft' && 'Transicionar essa ordem para o estado Planejado'}
                                                            {activeMODetails?.status === 'planned' && 'Liberar essa ordem para produção'}
                                                            {activeMODetails?.status === 'released' && activeMODetails?.canRevertStatus && 'Reverter essa ordem para o estado Planejado'}
                                                            {activeMODetails?.status === 'released' && !activeMODetails?.canRevertStatus && 'Esta ordem já foi iniciada na produção e não pode ser revertida'}
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
                                {/* Show MultipleOrdersPanel when multiple MOs are selected */}
                                {selectedMOs.size > 1 && detailViewMode === 'route' && (
                                    <MultipleOrdersPanel
                                        selectedOrders={selectedMODetails}
                                        className="h-full"
                                    />
                                )}
                                {/* Route Builder - only show when single MO is selected */}
                                {selectedMOs.size === 1 && detailViewMode === 'route' && activeMODetails && (
                                    <div className="flex-1 min-h-0">
                                        <RouteBuilder
                                            manufacturingOrder={activeMODetails}
                                            workCells={workCells}
                                            plants={currentPlants}
                                            shifts={currentShifts}
                                            manufacturers={currentManufacturers}
                                            unitsOfMeasure={currentUnitsOfMeasure}
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
                                {selectedMOs.size === 0 && detailViewMode === 'route' && (
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
            {selectedMOs.size > 0 && (
                <ApplyTemplateDialog
                    open={showApplyTemplateDialog}
                    onOpenChange={setShowApplyTemplateDialog}
                    manufacturingOrderIds={Array.from(selectedMOs)}
                    itemCategory={selectedMOs.size === 1 ? activeMODetails?.item?.category?.name : undefined}
                    itemNumber={selectedMOs.size === 1 ? activeMODetails?.item?.item_number : undefined}
                    itemName={selectedMOs.size === 1 ? activeMODetails?.item?.name : undefined}
                    routeTemplates={routeTemplates}
                    onTemplateApplied={() => {
                        // Small delay to ensure backend has completed processing
                        PlanningService.reloadData({
                            delay: 100,
                            only: ['manufacturingOrders']
                        });
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

            {/* Combined Save Action Bar with Modal Mode */}
            {(hasUnsavedChanges || modalState.open) && (
                <SaveActionBar
                    changeCount={
                        routeChangesStore.getAllChanges().length +
                        moChangesStore.getAllChanges().length
                    }
                    changeType="combined"
                    routeChangeCount={routeChangesStore.getAllChanges().length}
                    moChangeCount={moChangesStore.getAllChanges().length}
                    onCancel={cancelAllChanges}
                    onSave={async () => {
                        if (modalState.open && modalState.type === 'navigation') {
                            // Save all changes
                            await saveAllChanges();
                            modalState.pendingAction?.();
                            setModalState({ open: false, type: 'mo-switch' });
                        } else {
                            await saveAllChanges();
                        }
                    }}
                    isSaving={routeSaveStatus === 'saving' || moSaveStatus === 'saving'}
                    position="top"
                    modalMode={modalState.open}
                    modalType={modalState.type}
                    onModalDiscardChanges={() => {
                        if (modalState.type === 'navigation') {
                            cancelAllChanges();
                        }
                        modalState.pendingAction?.();
                        setModalState({ open: false, type: 'mo-switch' });
                    }}
                    onModalCancel={() => {
                        setModalState({ open: false, type: 'mo-switch' });
                    }}
                />
            )}

            {/* Unsaved Changes Dialog */}
            <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterações não salvas</DialogTitle>
                        <DialogDescription>
                            Você possui alterações não salvas nesta tela.
                            <p>Para marcar ordens como planejadas, você precisa primeiro:</p>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <p className="text-sm">
                            <strong>A.</strong> Salvar suas alterações, ou
                        </p>
                        <p className="text-sm">
                            <strong>B.</strong> Descartar suas alterações.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="default"
                            onClick={() => setShowUnsavedChangesDialog(false)}
                        >
                            Entendi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark Children as Planned Dialog */}
            {pendingPlannedTransition && pendingPlannedTransition.parentOrder && (
                <MarkChildrenPlannedDialog
                    open={showMarkChildrenDialog}
                    onOpenChange={setShowMarkChildrenDialog}
                    parentOrder={pendingPlannedTransition.parentOrder}
                    childrenCount={pendingPlannedTransition.childrenCount}
                    onConfirm={(includeChildren) => {
                        performStatusTransition(
                            pendingPlannedTransition.orderIds,
                            'planned',
                            includeChildren
                        );
                        setPendingPlannedTransition(null);
                    }}
                />
            )}

            {/* Mark Children as Released Dialog */}
            {pendingReleasedTransition && pendingReleasedTransition.parentOrder && (
                <MarkChildrenReleasedDialog
                    open={showMarkChildrenReleasedDialog}
                    onOpenChange={setShowMarkChildrenReleasedDialog}
                    parentOrder={pendingReleasedTransition.parentOrder}
                    childrenCount={pendingReleasedTransition.childrenCount}
                    onConfirm={(includeChildren) => {
                        performStatusTransition(
                            pendingReleasedTransition.orderIds,
                            'released',
                            includeChildren
                        );
                        setPendingReleasedTransition(null);
                    }}
                />
            )}
        </AppLayout>
    );
}
