import React, { useState, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    FileText
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ManufacturingOrderHierarchicalView from '@/components/production/ManufacturingOrderHierarchicalView';
import RouteBuilder from '@/components/production/planning/RouteBuilder';
// import WorkCellManager from '@/components/production/planning/WorkCellManager';
// import BulkOperationsPanel from '@/components/production/planning/BulkOperationsPanel';
// import TemplateLibraryPanel from '@/components/production/planning/TemplateLibraryPanel';
import { toast } from 'sonner';
import { PageProps, ManufacturingOrder, BreadcrumbItem } from '@/types';
import { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';

type DetailViewMode = 'route' | 'work-cell' | 'bulk' | 'template';

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    category: string;
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
    rating: number;
    tags: string[];
    created_by: {
        id: number;
        name: string;
    };
    created_at: string;
    is_default?: boolean;
    item_types?: string[];
}

interface WorkCell {
    id: number;
    name: string;
    code?: string;
    description?: string;
    type?: string;
    capacity?: number;
    is_active: boolean;
    utilization?: number;
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
    const [leftPanelWidth, setLeftPanelWidth] = useState(35); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showThumbnails] = useState(true);

    // Handle resizing
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const container = document.getElementById('planning-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Constrain between 25% and 50%
        setLeftPanelWidth(Math.max(25, Math.min(50, newWidth)));
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Add mouse event listeners
    React.useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp]);

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



    // Handle marking as planned
    const handleMarkAsPlanned = useCallback(() => {
        if (selectedMOs.size === 0) {
            toast.error('Please select manufacturing orders to mark as planned.');
            return;
        }

        // TODO: Implement marking as planned
        router.post(route('production.orders.bulk-transition'), {
            orderIds: Array.from(selectedMOs),
            targetState: 'planned',
        }, {
            onSuccess: () => {
                toast.success(`${selectedMOs.size} manufacturing orders have been marked as planned.`);
                setSelectedMOs(new Set());
            },
        });
    }, [selectedMOs]);

    // Active MO details
    const activeMODetails = useMemo(() => {
        if (!activeMO) return null;
        // TODO: Find the MO in the nested structure
        return manufacturingOrders.find(mo => mo.id === activeMO);
    }, [activeMO, manufacturingOrders]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Planejar" />

            <div className="h-screen flex flex-col">

                {/* Main Content Area */}
                <div id="planning-container" className="flex-1 flex overflow-hidden">
                    {/* Left Panel - MO Tree */}
                    <div
                        className="border-r bg-muted/10 overflow-hidden flex flex-col"
                        style={{ width: `${leftPanelWidth}%`, minWidth: '350px' }}
                    >
                        {/* Search and Filter Bar */}
                        <div className="p-4 border-b space-y-2">
                            <Input
                                placeholder="Search manufacturing orders..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* MO Tree View */}
                        <div className="flex-1 overflow-auto p-4">
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

                    {/* Resize Handle */}
                    <div
                        className={cn(
                            "w-1 hover:w-2 bg-border hover:bg-primary/20 cursor-col-resize transition-all",
                            isResizing && "bg-primary/30"
                        )}
                        onMouseDown={handleMouseDown}
                    />

                    {/* Right Panel - Detail/Action Panel */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Global Actions Toolbar */}
                        <div className="border-b bg-background">
                            <div className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center space-x-2">
                                    <TooltipProvider>
                                        {permissions.canPlanOrder && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleMarkAsPlanned}
                                                        disabled={selectedMOs.size === 0}
                                                    >
                                                        Mark as Planned
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Transition selected orders to Planned state</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDetailViewMode('template')}
                                                >
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    Templates
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Open template library (Ctrl+T)</p>
                                            </TooltipContent>
                                        </Tooltip>
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
                            {detailViewMode === 'template' && (
                                <div className="p-4">
                                    <h2 className="text-lg font-semibold mb-4">Template Library</h2>
                                    <p className="text-muted-foreground">Browse and apply route templates</p>
                                    <div className="mt-4">
                                        <p className="text-sm">Available templates: {routeTemplates.length}</p>
                                    </div>
                                </div>
                            )}
                            {!activeMODetails && detailViewMode === 'route' && (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Select a manufacturing order to view its route configuration
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
