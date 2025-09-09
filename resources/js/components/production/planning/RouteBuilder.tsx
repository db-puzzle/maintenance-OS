import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { router, useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import RouteBuilderCanvas from '@/components/production/RouteBuilderCanvas';
import StepPropertiesPanel from '@/components/production/StepPropertiesPanel';
import { ManufacturingStep, WorkCell, ManufacturingOrder } from '@/types/production';

// ExtendedManufacturingStep type is defined in StepPropertiesPanel

export interface RouteStep {
    id: string | number;
    sequence: number;
    name: string;
    description?: string;
    work_cell_id: number | null;
    setup_time_minutes?: number;
    cycle_time_minutes?: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    is_required: boolean;
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
    form_id?: number;
}

interface RouteBuilderProps {
    manufacturingOrder: ManufacturingOrder;
    workCells: WorkCell[];
    onDirtyChange: (isDirty: boolean) => void;
    onSave?: () => void;
    onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
    onLastSavedAtChange?: (date: Date | null) => void;
    isSaving?: boolean;
    onSaveAsTemplate?: (steps: RouteStep[]) => void;
    permissions: {
        canEditRoute: boolean;
        canSaveAsTemplate: boolean;
        canCreateWorkCell: boolean;
    };
}

export default function RouteBuilder({
    manufacturingOrder,
    workCells,
    onDirtyChange,
    onSave,
    onSaveStatusChange,
    onLastSavedAtChange,
    isSaving = false,
    onSaveAsTemplate,
    permissions,
}: RouteBuilderProps) {
    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [showCreateWorkCell, setShowCreateWorkCell] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedStep, setDraggedStep] = useState<RouteStep | null>(null);

    // Auto-save state
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousStepsRef = useRef<RouteStep[]>([]);
    const stepsRef = useRef<RouteStep[]>(steps);

    // Form for editing step details
    const stepForm = useForm<{
        name: string;
        description: string;
        step_type: string;
        work_cell_id: string;
        setup_time_minutes: number;
        cycle_time_minutes: number;
        depends_on_step_id: string;
        can_start_when_dependency: 'completed';
        quality_check_mode?: string;
        sampling_size?: number;
        form_id?: string;
    }>({
        name: '',
        description: '',
        step_type: 'standard',
        work_cell_id: '',
        setup_time_minutes: 0,
        cycle_time_minutes: 0,
        depends_on_step_id: '',
        can_start_when_dependency: 'completed',
        quality_check_mode: 'every_part',
        sampling_size: 0,
        form_id: '',
    });

    // Track selected step sequence for maintaining selection after updates
    const selectedStepSequenceRef = useRef<number | null>(null);
    const selectedStepIdRef = useRef<string | number | null>(null);

    // Update selectedStepSequenceRef when selectedStep changes
    useEffect(() => {
        selectedStepSequenceRef.current = selectedStep?.sequence || null;
        selectedStepIdRef.current = selectedStep?.id || null;
    }, [selectedStep]);


    // Load existing route when manufacturing order changes
    const previousMOIdRef = useRef<number | null>(null);
    const previousRouteRef = useRef<string>('');

    useEffect(() => {
        // Check if MO changed or route data changed
        const currentRouteData = JSON.stringify(manufacturingOrder.manufacturing_route?.steps || []);
        const moChanged = previousMOIdRef.current !== manufacturingOrder.id;
        const routeDataChanged = previousRouteRef.current !== currentRouteData;

        if (moChanged || routeDataChanged) {
            previousMOIdRef.current = manufacturingOrder.id;
            previousRouteRef.current = currentRouteData;

            if (manufacturingOrder.manufacturing_route && manufacturingOrder.manufacturing_route.steps) {
                const routeSteps: RouteStep[] = manufacturingOrder.manufacturing_route.steps.map((step: ManufacturingStep, index: number) => ({
                    id: step.id?.toString() || `existing-${index}`,
                    sequence: step.step_number || index + 1,
                    name: step.name,
                    description: step.description || '',
                    work_cell_id: step.work_cell_id ?? null,
                    setup_time_minutes: step.setup_time_minutes || 0,
                    cycle_time_minutes: step.cycle_time_minutes || 0,
                    step_type: step.step_type || 'standard',
                    is_required: true,
                    quality_check_mode: step.quality_check_mode,
                    sampling_size: step.sampling_size,
                    form_id: step.form_id,
                }));
                setSteps(routeSteps);
                // Initialize previousStepsRef to prevent auto-save on initial load
                previousStepsRef.current = routeSteps;
            } else {
                // Clear steps and initialize previousStepsRef for new routes
                setSteps([]);
                previousStepsRef.current = [];
            }
            // Clear selected step only when changing manufacturing orders, not when route data updates
            if (moChanged) {
                setSelectedStep(null);
            }
        }
    }, [manufacturingOrder.id, manufacturingOrder.manufacturing_route]); // Re-run when manufacturing order or its route changes

    // Track dirty state
    useEffect(() => {
        const hasChanges = JSON.stringify(steps) !== JSON.stringify(manufacturingOrder.manufacturing_route?.steps || []);
        onDirtyChange(hasChanges);
    }, [steps, manufacturingOrder.manufacturing_route?.steps, onDirtyChange]);

    // Ensure selectedStep exists in steps array
    useEffect(() => {
        if (selectedStep && !steps.find(s => String(s.id) === String(selectedStep.id))) {
            // Only clear if the step truly doesn't exist (not just a reference change)
            setSelectedStep(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steps.length, selectedStep?.id]); // Only check when the number of steps changes or selected step ID changes

    // Update form data when selected step changes
    useEffect(() => {
        if (selectedStep) {
            stepForm.setData({
                name: selectedStep.name || '',
                description: selectedStep.description || '',
                step_type: selectedStep.step_type || 'standard',
                work_cell_id: selectedStep.work_cell_id?.toString() || '',
                setup_time_minutes: selectedStep.setup_time_minutes || 0,
                cycle_time_minutes: selectedStep.cycle_time_minutes || 0,
                depends_on_step_id: selectedStep.sequence > 1 ? steps[selectedStep.sequence - 2]?.id?.toString() : '',
                can_start_when_dependency: 'completed',
                quality_check_mode: selectedStep.quality_check_mode || 'every_part',
                sampling_size: selectedStep.sampling_size || 0,
                form_id: selectedStep.form_id?.toString() || '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStep?.id]); // Only re-run when selected step ID changes


    // Add new step
    const handleAddStep = useCallback(() => {
        const newStep: RouteStep = {
            id: `temp-${Date.now()}`,
            sequence: steps.length + 1,
            name: `Step ${steps.length + 1}`,
            work_cell_id: null,
            step_type: 'standard',
            is_required: true,
        };
        setSteps(prevSteps => [...prevSteps, newStep]);
        setSelectedStep(newStep);
    }, [steps.length]);

    // Delete step
    const handleDeleteStep = useCallback((index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Update sequence numbers
        newSteps.forEach((step, i) => {
            step.sequence = i + 1;
        });
        setSteps(newSteps);

        // Clear selection if deleted step was selected
        if (selectedStep && steps[index].id === selectedStep.id) {
            setSelectedStep(null);
        }
    }, [steps, selectedStep]);

    // Track the active element to restore focus after save
    const focusedElementRef = useRef<HTMLElement | null>(null);

    // Auto-save route function - using useRef to capture current steps
    const saveRoute = useCallback(async () => {
        // Store current active element before save
        focusedElementRef.current = document.activeElement as HTMLElement;

        if (!permissions.canEditRoute) {
            return;
        }

        onSaveStatusChange?.('saving');

        // Use stepsRef to get the latest steps value
        const stepsAtSaveTime = [...stepsRef.current];

        try {
            await router.post(
                window.route('production.planning.orders.save-route', manufacturingOrder.id),
                {
                    steps: stepsAtSaveTime.map(step => ({
                        sequence: step.sequence,
                        name: step.name,
                        description: step.description,
                        work_cell_id: step.work_cell_id,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        step_type: step.step_type,
                        is_required: step.is_required,
                    })),
                    is_autosave: true, // Add flag to indicate this is an auto-save
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: [], // Don't reload any data to preserve focus
                    replace: false, // Don't replace browser history
                    onSuccess: () => {
                        // Update previousStepsRef to mark data as saved
                        previousStepsRef.current = stepsAtSaveTime;

                        onSaveStatusChange?.('saved');
                        onLastSavedAtChange?.(new Date());

                        if (onSave) onSave();

                        // Restore selected step if it was cleared during save
                        if (selectedStepIdRef.current && !selectedStep) {
                            const stepToReselect = steps.find(s => String(s.id) === String(selectedStepIdRef.current));
                            if (stepToReselect) {
                                setSelectedStep(stepToReselect);
                            }
                        }

                        // Focus should be maintained automatically since we're not reloading any data
                        // But check just in case
                        const activeElementAfter = document.activeElement;

                        if (focusedElementRef.current && focusedElementRef.current !== activeElementAfter && document.contains(focusedElementRef.current)) {
                            focusedElementRef.current.focus();
                        }

                        // Reset to idle after 2 seconds
                        setTimeout(() => {
                            onSaveStatusChange?.('idle');
                        }, 2000);
                    },
                    onError: () => {
                        onSaveStatusChange?.('error');

                        // Reset to idle after 3 seconds
                        setTimeout(() => {
                            onSaveStatusChange?.('idle');
                        }, 1500);
                    },
                }
            );
        } catch {
            onSaveStatusChange?.('error');
            setTimeout(() => {
                onSaveStatusChange?.('idle');
            }, 1500);
        }
    }, [permissions.canEditRoute, manufacturingOrder.id, onSave, onSaveStatusChange, onLastSavedAtChange, selectedStep, steps]);

    // Keep stepsRef updated
    useEffect(() => {
        stepsRef.current = steps;
    }, [steps]);

    // Debounced auto-save effect
    useEffect(() => {
        // Skip if user doesn't have permission
        if (!permissions.canEditRoute) {
            return;
        }

        // Check if steps have actually changed
        const currentStepsStr = JSON.stringify(steps);
        const previousStepsStr = JSON.stringify(previousStepsRef.current);
        const hasChanges = currentStepsStr !== previousStepsStr;

        if (!hasChanges || steps.length === 0) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save (3 seconds after last change to avoid interrupting editing)
        saveTimeoutRef.current = setTimeout(() => {
            // Only save if no step is currently being edited (no active input/textarea focus)
            const activeElement = document.activeElement;
            const isEditingInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.closest('[role="combobox"]') // For custom select components
            );

            if (!isEditingInput) {
                saveRoute();
            } else {
                // If user is still editing, postpone the save
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
                saveTimeoutRef.current = setTimeout(() => {
                    saveRoute();
                }, 1500); // Try again in 3 seconds
            }
        }, 1500); // Increased from 1.5 to 3 seconds

        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steps, permissions.canEditRoute]); // Remove saveRoute from dependencies

    // Expose steps to parent when save as template is requested
    useEffect(() => {
        if (onSaveAsTemplate) {
            // Make steps available to parent component
            onSaveAsTemplate(steps);
        }
    }, [steps, onSaveAsTemplate]);

    // Convert steps to canvas format
    const canvasSteps = useMemo(() => steps.map(step => ({
        id: typeof step.id === 'string' && step.id.startsWith('temp-') ? step.id : Number(step.id),
        step_number: step.sequence,
        name: step.name,
        depends_on_step_id: step.sequence > 1 ? (() => {
            const prevStep = steps[step.sequence - 2];
            if (!prevStep) return undefined;
            const prevId = prevStep.id;
            if (typeof prevId === 'string' && prevId.startsWith('temp-')) {
                return prevId;
            }
            return Number(prevId);
        })() : undefined,
        can_start_when_dependency: 'completed' as const,
        work_cell: step.work_cell_id ? workCells.find(wc => wc.id === step.work_cell_id) : undefined,
        work_cell_id: step.work_cell_id,
        setup_time_minutes: step.setup_time_minutes || 0,
        cycle_time_minutes: step.cycle_time_minutes || 0,
        is_quality_check: step.step_type === 'quality_check',
        require_validation: false,
        instructions: step.description || '',
        is_required: step.is_required,
        step_type: step.step_type,
        status: 'pending' as const,
        description: step.description,
        quality_check_mode: step.quality_check_mode,
        sampling_size: step.sampling_size,
        form_id: step.form_id,
        manufacturing_route_id: manufacturingOrder.manufacturing_route?.id || 0,
        manufacturing_route: manufacturingOrder.manufacturing_route || {
            id: 0,
            name: '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        // Using 'any' to avoid type conflicts between different ExtendedManufacturingStep definitions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any[], [steps, workCells, manufacturingOrder.manufacturing_route]);

    // Convert selected step to canvas format
    const canvasSelectedStep = useMemo(() => {
        if (!selectedStep) return null;
        const found = canvasSteps.find(s => String(s.id) === String(selectedStep.id));
        return found || null;
    }, [selectedStep, canvasSteps]);

    return (
        <div className="flex flex-col h-full">

            {/* Main Content - Canvas and Properties Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Canvas area with transition */}
                <div className={cn(
                    "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out",
                    selectedStep ? "pr-[35rem]" : "pr-0"
                )}>
                    <RouteBuilderCanvas
                        steps={canvasSteps}
                        selectedStep={canvasSelectedStep}
                        zoom={100}
                        can={{ manage_steps: permissions.canEditRoute }}
                        onStepSelect={(step) => {
                            if (step) {
                                const routeStep = steps.find(s => String(s.id) === String(step.id));
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
                                description: step.description || '',
                                work_cell_id: step.work_cell?.id || null,
                                setup_time_minutes: step.setup_time_minutes,
                                cycle_time_minutes: step.cycle_time_minutes,
                                step_type: step.step_type || 'standard',
                                is_required: true,
                                quality_check_mode: step.quality_check_mode,
                                sampling_size: step.sampling_size,
                                form_id: step.form_id,
                            }));
                            setSteps(newSteps);
                        }}
                        onStepDelete={(step) => {
                            const index = steps.findIndex(s => String(s.id) === String(step.id));
                            if (index >= 0) {
                                handleDeleteStep(index);
                            }
                        }}
                        isDragging={isDragging}
                        onDragStart={setIsDragging}
                        draggedStep={draggedStep ? canvasSteps.find(s => String(s.id) === String(draggedStep.id)) || null : null}
                        onDraggedStepChange={(step) => {
                            if (step) {
                                const routeStep = steps.find(s => String(s.id) === String(step.id));
                                setDraggedStep(routeStep || null);
                            } else {
                                setDraggedStep(null);
                            }
                        }}
                        isPanelOpen={!!selectedStep}
                        viewMode={!permissions.canEditRoute}
                    />
                </div>

                {/* Step Properties Panel - Absolute positioned */}
                <div className="absolute inset-y-0 right-0 z-10">
                    <StepPropertiesPanel
                        selectedStep={canvasSelectedStep}
                        steps={canvasSteps}
                        stepForm={stepForm}
                        stepTypes={{
                            standard: 'Standard',
                            quality_check: 'Quality Check',
                            rework: 'Rework'
                        }}
                        workCells={workCells}
                        forms={[]}
                        routing={manufacturingOrder.manufacturing_route || {
                            id: 0,
                            name: '',
                            is_active: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }}
                        plants={[]}
                        shifts={[]}
                        manufacturers={[]}
                        isSaving={isSaving}
                        onLocalStepUpdate={(stepId, updates) => {
                            // Try to find by exact ID match first
                            let index = steps.findIndex(s => String(s.id) === String(stepId));

                            // If not found and stepId is a temp ID, try to match by sequence
                            if (index < 0 && String(stepId).startsWith('temp-') && selectedStep) {
                                index = steps.findIndex(s => s.sequence === selectedStep.sequence);
                            }

                            if (index >= 0) {
                                const newSteps = [...steps];
                                const updatedStep: RouteStep = {
                                    ...steps[index],
                                    // Use Object.prototype.hasOwnProperty.call to properly handle undefined values
                                    name: Object.prototype.hasOwnProperty.call(updates, 'name') ? updates.name || '' : steps[index].name,
                                    description: Object.prototype.hasOwnProperty.call(updates, 'description') ? updates.description || '' : steps[index].description,
                                    work_cell_id: Object.prototype.hasOwnProperty.call(updates, 'work_cell_id') ? (updates.work_cell_id ?? null) : steps[index].work_cell_id,
                                    setup_time_minutes: Object.prototype.hasOwnProperty.call(updates, 'setup_time_minutes') ? updates.setup_time_minutes || 0 : steps[index].setup_time_minutes,
                                    cycle_time_minutes: Object.prototype.hasOwnProperty.call(updates, 'cycle_time_minutes') ? updates.cycle_time_minutes || 0 : steps[index].cycle_time_minutes,
                                    is_required: steps[index].is_required,
                                    step_type: Object.prototype.hasOwnProperty.call(updates, 'step_type') ? (updates.step_type || 'standard') : steps[index].step_type,
                                    quality_check_mode: Object.prototype.hasOwnProperty.call(updates, 'quality_check_mode') ? updates.quality_check_mode : steps[index].quality_check_mode,
                                    sampling_size: Object.prototype.hasOwnProperty.call(updates, 'sampling_size') ? updates.sampling_size : steps[index].sampling_size,
                                    form_id: Object.prototype.hasOwnProperty.call(updates, 'form_id') ? updates.form_id : steps[index].form_id,
                                };
                                newSteps[index] = updatedStep;
                                setSteps(newSteps);
                                // Update selectedStep only if it's the one being edited
                                if (selectedStep && String(selectedStep.id) === String(stepId)) {
                                    setSelectedStep(updatedStep);
                                }
                            }
                        }}
                        isOpen={!!selectedStep}
                        viewMode={!permissions.canEditRoute}
                    />
                </div>
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

        </div>
    );
}