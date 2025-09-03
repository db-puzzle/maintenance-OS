import React, { useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Plus,
    Save,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock,
    Factory
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
import { cn } from '@/lib/utils';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import { ManufacturingOrder, WorkCell } from '@/types';
import RouteBuilderCanvas from '@/components/production/RouteBuilderCanvas';
import { StepPropertiesPanel } from '@/components/production/StepPropertiesPanel';

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

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    steps: RouteStep[];
}

interface RouteBuilderProps {
    manufacturingOrder: ManufacturingOrder;
    workCells: WorkCell[];
    templates: RouteTemplate[];
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
    templates,
    permissions,
    onDirtyChange
}: RouteBuilderProps) {

    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedStep, setDraggedStep] = useState<any>(null);
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
                description: step.description,
                work_cell_id: step.work_cell_id,
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
    }, [steps, manufacturingOrder.id, onDirtyChange]);

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

    // Apply template
    const handleApplyTemplate = useCallback((templateId: number) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSteps(template.steps || []);
            toast.success(`Route template "${template.name}" has been applied.`);
        }
    }, [templates]);

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
                    steps={steps.map(step => ({
                        id: step.id.toString(),
                        step_number: step.sequence,
                        name: step.name,
                        depends_on_step_id: step.sequence > 1 ? steps[step.sequence - 2]?.id?.toString() : undefined,
                        can_start_when_dependency: 'completed',
                        work_cell: step.work_cell_id ? workCells.find(wc => wc.id === step.work_cell_id) : undefined,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        is_quality_check: false,
                        require_validation: false,
                        instructions: step.description || '',
                        is_required: step.is_required,
                    }))}
                    selectedStep={selectedStep ? {
                        id: selectedStep.id.toString(),
                        step_number: selectedStep.sequence,
                        name: selectedStep.name,
                        depends_on_step_id: selectedStep.sequence > 1 ? steps[selectedStep.sequence - 2]?.id?.toString() : undefined,
                        can_start_when_dependency: 'completed',
                        work_cell: selectedStep.work_cell_id ? workCells.find(wc => wc.id === selectedStep.work_cell_id) : undefined,
                        setup_time_minutes: selectedStep.setup_time_minutes || 0,
                        cycle_time_minutes: selectedStep.cycle_time_minutes || 0,
                        is_quality_check: false,
                        require_validation: false,
                        instructions: selectedStep.description || '',
                        is_required: selectedStep.is_required,
                    } : null}
                    zoom={100}
                    can={{ manage_steps: permissions.canEditRoute }}
                    onStepSelect={(step) => {
                        if (step) {
                            const routeStep = steps.find(s => s.id.toString() === step.id);
                            setSelectedStep(routeStep || null);
                        } else {
                            setSelectedStep(null);
                        }
                    }}
                    onStepAdd={handleAddStep}
                    onStepReorder={(updatedSteps) => {
                        const newSteps = updatedSteps.map((step, index) => ({
                            id: step.id,
                            sequence: index + 1,
                            name: step.name,
                            description: step.instructions,
                            work_cell_id: step.work_cell?.id || null,
                            setup_time_minutes: step.setup_time_minutes,
                            cycle_time_minutes: step.cycle_time_minutes,
                            step_type: 'manual' as const,
                            is_required: step.is_required ?? true,
                        }));
                        setSteps(newSteps);
                    }}
                    onStepDelete={(step) => {
                        const index = steps.findIndex(s => s.id.toString() === step.id);
                        if (index >= 0) {
                            handleDeleteStep(index);
                        }
                    }}
                    isDragging={isDragging}
                    onDragStart={setIsDragging}
                    draggedStep={draggedStep}
                    onDraggedStepChange={setDraggedStep}
                    isPanelOpen={!!selectedStep}
                    viewMode={!permissions.canEditRoute}
                />

                {/* Properties Panel */}
                {selectedStep && (
                    <StepPropertiesPanel
                        step={{
                            id: selectedStep.id.toString(),
                            step_number: selectedStep.sequence,
                            name: selectedStep.name,
                            depends_on_step_id: selectedStep.sequence > 1 ? steps[selectedStep.sequence - 2]?.id?.toString() : undefined,
                            can_start_when_dependency: 'completed',
                            work_cell: selectedStep.work_cell_id ? workCells.find(wc => wc.id === selectedStep.work_cell_id) : undefined,
                            setup_time_minutes: selectedStep.setup_time_minutes || 0,
                            cycle_time_minutes: selectedStep.cycle_time_minutes || 0,
                            is_quality_check: false,
                            require_validation: false,
                            instructions: selectedStep.description || '',
                            is_required: selectedStep.is_required,
                        }}
                        workCells={workCells}
                        onChange={(updates) => {
                            const index = steps.findIndex(s => s.id === selectedStep.id);
                            if (index >= 0) {
                                const newSteps = [...steps];
                                newSteps[index] = {
                                    ...steps[index],
                                    name: updates.name || steps[index].name,
                                    description: updates.instructions || steps[index].description,
                                    work_cell_id: updates.work_cell?.id || steps[index].work_cell_id,
                                    setup_time_minutes: updates.setup_time_minutes ?? steps[index].setup_time_minutes,
                                    cycle_time_minutes: updates.cycle_time_minutes ?? steps[index].cycle_time_minutes,
                                    is_required: updates.is_required ?? steps[index].is_required,
                                };
                                setSteps(newSteps);
                                setSelectedStep(newSteps[index]);
                            }
                        }}
                        onClose={() => setSelectedStep(null)}
                        canEdit={permissions.canEditRoute}
                    />
                )}
            </div>

            {/* Create Work Cell Sheet */}
            {permissions.canCreateWorkCell && (
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
