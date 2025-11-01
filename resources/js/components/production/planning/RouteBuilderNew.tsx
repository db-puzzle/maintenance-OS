import React, { useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Save,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import { ManufacturingOrder } from '@/types';
import { WorkCell, ManufacturingStep } from '@/types/production';
import RouteBuilderCanvas from '@/components/production/RouteBuilderCanvas';

interface ExtendedManufacturingStep extends ManufacturingStep {
    isNew?: boolean;
}

interface RouteStep {
    id: string;
    sequence: number;
    name: string;
    description?: string;
    work_cell_id: number | null;
    setup_time_minutes?: number;
    cycle_time_minutes?: number;
    step_type: 'manual' | 'automated';
    is_required: boolean;
}

interface RouteBuilderProps {
    manufacturingOrder: ManufacturingOrder;
    workCells: WorkCell[];
    permissions: {
        canCreateRoute: boolean;
        canEditRoute: boolean;
        canDeleteRoute: boolean;
        canPlanOrder: boolean;
    };
    onDirtyChange: (isDirty: boolean) => void;
}

export default function RouteBuilder({
    manufacturingOrder,
    workCells,
    permissions,
    onDirtyChange
}: RouteBuilderProps) {

    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedStep, setDraggedStep] = useState<RouteStep | null>(null);
    const [showCreateWorkCell, setShowCreateWorkCell] = useState(false);
    const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Load existing route
    useEffect(() => {
        if (manufacturingOrder.manufacturingRoute) {
            const routeSteps: RouteStep[] = (manufacturingOrder.manufacturingRoute.steps || []).map((step, index) => ({
                id: step.id?.toString() || `existing-${index}`,
                sequence: step.sequence || index + 1,
                name: step.name,
                work_cell_id: step.work_cell_id ?? null,
                setup_time_minutes: step.setup_time_minutes,
                cycle_time_minutes: step.cycle_time_minutes,
                step_type: 'manual' as const,
                is_required: step.is_required ?? true,
            }));
            setSteps(routeSteps);
        }
    }, [manufacturingOrder]);

    // Track dirty state
    useEffect(() => {
        const hasChanges = JSON.stringify(steps) !== JSON.stringify(manufacturingOrder.manufacturingRoute?.steps || []);
        onDirtyChange(hasChanges);
    }, [steps, manufacturingOrder.manufacturingRoute?.steps, onDirtyChange]);

    // Calculate route stats
    const routeStats = React.useMemo(() => {
        const totalSetupTime = steps.reduce((sum, step) => sum + (step.setup_time_minutes || 0), 0);
        const totalCycleTime = steps.reduce((sum, step) => sum + (step.cycle_time_minutes || 0), 0);
        const configuredSteps = steps.filter(step => step.work_cell_id).length;
        const requiredSteps = steps.filter(step => step.is_required).length;

        return {
            totalSteps: steps.length,
            configuredSteps,
            requiredSteps,
            totalSetupTime,
            totalCycleTime,
            totalTime: totalSetupTime + totalCycleTime,
            isComplete: configuredSteps === steps.length && steps.length > 0,
        };
    }, [steps]);

    // Add new step
    const handleAddStep = useCallback(() => {
        const newStep: RouteStep = {
            id: `temp-${Date.now()}`,
            sequence: steps.length + 1,
            name: `Step ${steps.length + 1}`,
            work_cell_id: null,
            step_type: 'manual',
            is_required: true,
        };
        setSteps([...steps, newStep]);
        setSelectedStep(newStep);
    }, [steps]);

    // Delete step
    const handleDeleteStep = useCallback((index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Update sequence numbers
        newSteps.forEach((step, i) => {
            step.sequence = i + 1;
        });
        setSteps(newSteps);
        setSelectedStep(null);
    }, [steps]);

    // Save route
    const handleSaveRoute = useCallback(async () => {
        if (!permissions.canEditRoute) return;

        setIsSaving(true);
        try {
            router.post(route('production.planning.orders.save-route', manufacturingOrder.id), {
                steps: steps.map(step => ({
                    name: step.name,
                    sequence: step.sequence,
                    work_cell_id: step.work_cell_id,
                    setup_time_minutes: step.setup_time_minutes || 0,
                    cycle_time_minutes: step.cycle_time_minutes || 0,
                    description: step.description,
                    is_required: step.is_required,
                })),
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('The route configuration has been saved successfully.');
                    onDirtyChange(false);
                },
                onError: () => {
                    toast.error('There was an error saving the route. Please try again.');
                },
            });
        } finally {
            setIsSaving(false);
        }
    }, [steps, manufacturingOrder.id, onDirtyChange, permissions.canEditRoute]);

    // Save as template
    const handleSaveAsTemplate = useCallback(async () => {
        if (!templateName.trim()) {
            toast.error('Please enter a name for the template.');
            return;
        }

        try {
            router.post(route('production.planning.routes.save-as-template'), {
                name: templateName,
                description: templateDescription,
                steps: steps.map(step => ({
                    name: step.name,
                    sequence: step.sequence,
                    work_cell_id: step.work_cell_id,
                    setup_time_minutes: step.setup_time_minutes || 0,
                    cycle_time_minutes: step.cycle_time_minutes || 0,
                    description: step.description,
                    is_required: step.is_required,
                })),
                item_id: manufacturingOrder.item_id,
            }, {
                onSuccess: () => {
                    toast.success('The route template has been saved successfully.');
                    setShowSaveAsTemplate(false);
                    setTemplateName('');
                    setTemplateDescription('');
                },
                onError: () => {
                    toast.error('There was an error saving the template. Please try again.');
                },
            });
        } catch (error) {
            console.error('Error saving template:', error);
        }
    }, [templateName, templateDescription, steps, manufacturingOrder.item_id]);

    // Apply template - currently unused but kept for future use
    // const handleApplyTemplate = useCallback((templateId: number) => {
    //     const template = templates.find(t => t.id === templateId);
    //     if (template) {
    //         setSteps(template.steps || []);
    //         toast.success(`Route template "${template.name}" has been applied.`);
    //     }
    // }, [templates]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Route Configuration</h2>
                        <p className="text-sm text-muted-foreground">
                            {manufacturingOrder.order_number} - {manufacturingOrder.item?.name}
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Template Actions */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveAsTemplate(true)}
                            disabled={steps.length === 0}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Save as Template
                        </Button>

                        {/* Save Button */}
                        {permissions.canEditRoute && (
                            <Button
                                onClick={handleSaveRoute}
                                disabled={isSaving || steps.length === 0}
                                className="gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Save Route
                            </Button>
                        )}
                    </div>
                </div>

                {/* Route Stats */}
                <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2">
                        {routeStats.isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className="text-sm font-medium">
                            {routeStats.configuredSteps}/{routeStats.totalSteps} steps configured
                        </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                            Total time: {routeStats.totalTime} min
                            {routeStats.totalSetupTime > 0 && ` (${routeStats.totalSetupTime} setup)`}
                        </span>
                    </div>

                    <Badge
                        variant={routeStats.isComplete ? "default" : "secondary"}
                        className={routeStats.isComplete ? "bg-green-100 text-green-800" : ""}
                    >
                        {routeStats.isComplete ? "Ready" : "In Progress"}
                    </Badge>
                </div>
            </div>

            {/* Main Content - Canvas and Properties Panel */}
            <div className="flex-1 flex overflow-hidden">
                <RouteBuilderCanvas
                    steps={steps.map((step, index) => ({
                        id: parseInt(step.id) || index,
                        manufacturing_route_id: manufacturingOrder.manufacturingRoute?.id || 0,
                        display_position: step.sequence,
                        name: step.name,
                        description: step.description,
                        step_type: 'standard' as const,
                        status: 'pending' as const,
                        work_cell_id: step.work_cell_id || undefined,
                        work_cell: step.work_cell_id ? workCells.find(wc => wc.id === step.work_cell_id) : undefined,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        depends_on_step_id: step.sequence > 1 ? parseInt(steps[step.sequence - 2]?.id) || undefined : undefined,
                        can_start_when_dependency: 'completed' as const,
                        isNew: !step.id.includes('existing'),
                    } as ExtendedManufacturingStep))}
                    selectedStep={selectedStep ? {
                        id: parseInt(selectedStep.id) || 0,
                        manufacturing_route_id: manufacturingOrder.manufacturingRoute?.id || 0,
                        display_position: selectedStep.sequence,
                        name: selectedStep.name,
                        description: selectedStep.description,
                        step_type: 'standard' as const,
                        status: 'pending' as const,
                        work_cell_id: selectedStep.work_cell_id || undefined,
                        work_cell: selectedStep.work_cell_id ? workCells.find(wc => wc.id === selectedStep.work_cell_id) : undefined,
                        setup_time_minutes: selectedStep.setup_time_minutes || 0,
                        cycle_time_minutes: selectedStep.cycle_time_minutes || 0,
                        depends_on_step_id: selectedStep.sequence > 1 ? parseInt(steps[selectedStep.sequence - 2]?.id) || undefined : undefined,
                        can_start_when_dependency: 'completed' as const,
                        isNew: !selectedStep.id.includes('existing'),
                    } as ExtendedManufacturingStep : null}
                    zoom={100}
                    can={{ manage_steps: permissions.canEditRoute }}
                    onStepSelect={(step: ExtendedManufacturingStep | null) => {
                        if (step) {
                            const routeStep = steps.find(s => parseInt(s.id) === step.id);
                            setSelectedStep(routeStep || null);
                        } else {
                            setSelectedStep(null);
                        }
                    }}
                    onStepAdd={handleAddStep}
                    onStepReorder={(updatedSteps: ExtendedManufacturingStep[]) => {
                        const newSteps = updatedSteps.map((step, index) => ({
                            id: step.id.toString(),
                            sequence: index + 1,
                            name: step.name,
                            description: step.description,
                            work_cell_id: step.work_cell?.id || null,
                            setup_time_minutes: step.setup_time_minutes,
                            cycle_time_minutes: step.cycle_time_minutes,
                            step_type: 'manual' as const,
                            is_required: true,
                        } as RouteStep));
                        setSteps(newSteps);
                    }}
                    onStepDelete={(step: ExtendedManufacturingStep) => {
                        const index = steps.findIndex(s => parseInt(s.id) === step.id);
                        if (index >= 0) {
                            handleDeleteStep(index);
                        }
                    }}
                    isDragging={isDragging}
                    onDragStart={setIsDragging}
                    draggedStep={draggedStep ? {
                        id: parseInt(draggedStep.id) || 0,
                        manufacturing_route_id: manufacturingOrder.manufacturingRoute?.id || 0,
                        display_position: draggedStep.sequence,
                        name: draggedStep.name,
                        description: draggedStep.description,
                        step_type: 'standard' as const,
                        status: 'pending' as const,
                        work_cell_id: draggedStep.work_cell_id || undefined,
                        work_cell: draggedStep.work_cell_id ? workCells.find(wc => wc.id === draggedStep.work_cell_id) : undefined,
                        setup_time_minutes: draggedStep.setup_time_minutes || 0,
                        cycle_time_minutes: draggedStep.cycle_time_minutes || 0,
                        depends_on_step_id: draggedStep.sequence > 1 ? parseInt(steps[draggedStep.sequence - 2]?.id) || undefined : undefined,
                        can_start_when_dependency: 'completed' as const,
                        isNew: !draggedStep.id.includes('existing'),
                    } as ExtendedManufacturingStep : null}
                    onDraggedStepChange={(step: ExtendedManufacturingStep | null) => {
                        if (step) {
                            const routeStep = steps.find(s => parseInt(s.id) === step.id);
                            setDraggedStep(routeStep || null);
                        } else {
                            setDraggedStep(null);
                        }
                    }}
                    isPanelOpen={!!selectedStep}
                    viewMode={!permissions.canEditRoute}
                />

                {/* Properties Panel - TODO: Implement proper properties panel for RouteBuilderNew */}
                {selectedStep && (
                    <div className="w-96 border-l bg-background p-4">
                        <h3 className="font-semibold mb-4">Step Properties</h3>
                        <p className="text-sm text-muted-foreground">
                            Selected: {selectedStep.name}
                        </p>
                        {/* TODO: Implement step properties form */}
                    </div>
                )}
            </div>

            {/* Create Work Cell Sheet */}
            {permissions.canEditRoute && (
                <CreateWorkCellSheet
                    isOpen={showCreateWorkCell}
                    onOpenChange={setShowCreateWorkCell}
                    onSuccess={(_newWorkCell) => {
                        setShowCreateWorkCell(false);
                    }}
                />
            )}

            {/* Save as Template Dialog */}
            <AlertDialog open={showSaveAsTemplate} onOpenChange={setShowSaveAsTemplate}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save Route as Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create a reusable template from this route configuration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Standard Assembly Route"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="template-description">Description (Optional)</Label>
                            <Textarea
                                id="template-description"
                                value={templateDescription}
                                onChange={(e) => setTemplateDescription(e.target.value)}
                                placeholder="Describe when to use this template..."
                                className="mt-1"
                                rows={3}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveAsTemplate}>
                            Save Template
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
