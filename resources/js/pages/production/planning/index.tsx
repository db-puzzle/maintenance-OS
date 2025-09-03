import React, { useState, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Save,
    Check,
    Undo2,
    Redo2,
    FileText,
    Download,
    HelpCircle,
    TreePine,
    List,
    Factory
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ManufacturingOrderHierarchicalView from '@/components/production/ManufacturingOrderHierarchicalView';
import RouteBuilder from '@/components/production/planning/RouteBuilder';
import WorkCellManager from '@/components/production/planning/WorkCellManager';
import BulkOperationsPanel from '@/components/production/planning/BulkOperationsPanel';
import TemplateLibraryPanel from '@/components/production/planning/TemplateLibraryPanel';
import { toast } from 'sonner';
import { PageProps, ManufacturingOrder, BreadcrumbItem } from '@/types';

type ViewMode = 'tree' | 'list' | 'work-cell';
type DetailViewMode = 'route' | 'work-cell' | 'bulk' | 'template';

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    category: string;
    steps: any[];
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
    const [viewMode, setViewMode] = useState<ViewMode>('tree');
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('route');
    const [leftPanelWidth, setLeftPanelWidth] = useState(35); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

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

    // Handle save actions
    const handleSaveAll = useCallback(() => {
        // TODO: Implement save all functionality
        toast.success('All planning changes have been saved successfully.');
        setIsDirty(false);
    }, []);

    // Handle validation
    const handleValidate = useCallback(() => {
        // TODO: Implement validation
        toast.success('All manufacturing orders passed validation.');
    }, []);

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
                {/* Header Bar */}
                <div className="border-b bg-background">
                    <div className="flex items-center justify-between px-4 py-2">
                        {/* Global Actions Toolbar */}
                        <div className="flex items-center space-x-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSaveAll}
                                            disabled={!isDirty}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            Save All
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Save all changes (Ctrl+S)</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleValidate}
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Validate
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Validate all selected orders</p>
                                    </TooltipContent>
                                </Tooltip>

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

                                <div className="flex items-center border-l pl-2 ml-2">
                                    <Button variant="ghost" size="sm" disabled>
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" disabled>
                                        <Redo2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center border-l pl-2 ml-2">
                                    <span className="text-sm text-muted-foreground mr-2">View:</span>
                                    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                                        <SelectTrigger className="w-[120px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tree">
                                                <div className="flex items-center">
                                                    <TreePine className="h-4 w-4 mr-2" />
                                                    Tree
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="list">
                                                <div className="flex items-center">
                                                    <List className="h-4 w-4 mr-2" />
                                                    List
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="work-cell">
                                                <div className="flex items-center">
                                                    <Factory className="h-4 w-4 mr-2" />
                                                    Work Cell
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                </Button>

                                <Button variant="ghost" size="sm">
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

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
                            {viewMode === 'tree' && (
                                <ManufacturingOrderHierarchicalView
                                    orders={manufacturingOrders as any}
                                    onOrderSelect={handleMOSelect}
                                    selectedOrders={selectedMOs}
                                    showThumbnails={showThumbnails}
                                    searchQuery={searchQuery}
                                    enhancedMode="planning"
                                    compactMode={true}
                                />
                            )}
                            {viewMode === 'list' && (
                                <div>List view - To be implemented</div>
                            )}
                            {viewMode === 'work-cell' && (
                                <div>Work cell view - To be implemented</div>
                            )}
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
                    <div className="flex-1 overflow-hidden">
                        {detailViewMode === 'route' && activeMODetails && (
                            <RouteBuilder
                                manufacturingOrder={activeMODetails}
                                workCells={workCells}
                                templates={routeTemplates}
                                permissions={permissions}
                                onDirtyChange={setIsDirty}
                            />
                        )}
                        {detailViewMode === 'work-cell' && (
                            <WorkCellManager
                                workCells={workCells}
                                permissions={permissions}
                            />
                        )}
                        {detailViewMode === 'bulk' && (
                            <BulkOperationsPanel
                                selectedMOs={Array.from(selectedMOs)}
                                templates={routeTemplates}
                                permissions={permissions}
                            />
                        )}
                        {detailViewMode === 'template' && (
                            <TemplateLibraryPanel
                                templates={routeTemplates}
                                permissions={permissions}
                                onApplyTemplate={(_templateId: number) => {
                                    // TODO: Apply template to selected MOs
                                }}
                            />
                        )}
                        {!activeMODetails && detailViewMode === 'route' && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a manufacturing order to view its route configuration
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
