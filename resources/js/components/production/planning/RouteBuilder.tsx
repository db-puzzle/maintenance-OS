import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { router, useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import RouteFlowView from '@/components/production/RouteFlowView';
import StepPropertiesPanel from '@/components/production/StepPropertiesPanel';
import GatePropertiesPanel from '@/components/production/GatePropertiesPanel';
import { ManufacturingStep, WorkCell, ManufacturingOrder } from '@/types/production';
import { GateConfiguration } from '@/components/production/GateCard';

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
    // Gate after this step
    gate_after?: GateConfiguration;
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
    onParentMOClick?: (parentId: number) => void;
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
    onParentMOClick,
}: RouteBuilderProps) {
    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
    const [showCreateWorkCell, setShowCreateWorkCell] = useState(false);

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
    const selectedGateIdRef = useRef<string | null>(null);

    // Update selectedStepSequenceRef when selectedStep changes
    useEffect(() => {
        selectedStepSequenceRef.current = selectedStep?.sequence || null;
        selectedStepIdRef.current = selectedStep?.id || null;
    }, [selectedStep]);

    // Update selectedGateIdRef when selectedGateId changes
    useEffect(() => {
        selectedGateIdRef.current = selectedGateId;
    }, [selectedGateId]);


    // Load existing route when manufacturing order changes
    const previousMOIdRef = useRef<number | null>(null);
    const previousRouteRef = useRef<string>('');
    const previousSelectedGateSequence = useRef<number | null>(null);

    useEffect(() => {
        // Check if MO changed or route data changed
        const currentRouteData = JSON.stringify(manufacturingOrder.manufacturing_route?.steps || []);
        const moChanged = previousMOIdRef.current !== manufacturingOrder.id;
        const routeDataChanged = previousRouteRef.current !== currentRouteData;

        if (moChanged || routeDataChanged) {
            // Store the sequence number of the currently selected gate before updating
            if (selectedGateId && !moChanged) {
                const match = selectedGateId.match(/gate-after-(.+)/);
                if (match) {
                    const stepId = match[1];
                    const currentStep = steps.find(s => String(s.id) === stepId);
                    if (currentStep) {
                        previousSelectedGateSequence.current = currentStep.sequence;
                    }
                }
            }

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
                    // Convert child order dependencies to gate_after
                    gate_after: (() => {
                        const gateConfig: GateConfiguration = {
                            dependency_type: step.child_order_dependency_type === 'none'
                                ? 'none'
                                : (step.child_order_dependency_type || 'all_children_completed') as GateConfiguration['dependency_type'],
                            minimum_quantity: step.child_order_minimum_quantity || 0
                        };
                        return gateConfig;
                    })(),
                }));
                setSteps(routeSteps);
                // Initialize previousStepsRef to prevent auto-save on initial load
                previousStepsRef.current = routeSteps;

                // Restore gate selection after route update if sequence was stored
                if (!moChanged && previousSelectedGateSequence.current !== null) {
                    const stepWithStoredSequence = routeSteps.find(s => s.sequence === previousSelectedGateSequence.current);
                    if (stepWithStoredSequence) {
                        const newGateId = `gate-after-${stepWithStoredSequence.id}`;
                        setSelectedGateId(newGateId);
                        selectedGateIdRef.current = newGateId;
                    }
                    previousSelectedGateSequence.current = null;
                }
            } else {
                // Clear steps and initialize previousStepsRef for new routes
                setSteps([]);
                previousStepsRef.current = [];
            }
            // Clear selected step only when changing manufacturing orders, not when route data updates
            if (moChanged) {
                setSelectedStep(null);
                setSelectedGateId(null);
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
            gate_after: { dependency_type: 'all_children_completed' },
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

    // Handle gate update
    const handleGateUpdate = useCallback((stepId: number | string, gate: GateConfiguration) => {
        setSteps(prevSteps => {
            // Create a new array with updated step
            return prevSteps.map(step => {
                if (String(step.id) === String(stepId)) {
                    // Create a new object to ensure React detects the change
                    return {
                        ...step,
                        gate_after: { ...gate } // Spread to create new object
                    };
                }
                // Return the same object reference for unchanged steps
                return step;
            });
        });
    }, []);

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
                    steps: stepsAtSaveTime.map(step => {
                        const saveData = {
                            sequence: step.sequence,
                            name: step.name,
                            description: step.description,
                            work_cell_id: step.work_cell_id,
                            setup_time_minutes: step.setup_time_minutes || 0,
                            cycle_time_minutes: step.cycle_time_minutes || 0,
                            step_type: step.step_type,
                            is_required: step.is_required,
                            // Convert gate_after back to child order dependencies for backend
                            child_order_dependency_type: step.gate_after?.dependency_type || 'all_children_completed',
                            child_order_minimum_quantity: step.gate_after?.minimum_quantity || 0,
                        };
                        return saveData;
                    }),
                    is_autosave: true, // Add flag to indicate this is an auto-save
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: [], // Don't reload any data to preserve focus
                    replace: false, // Don't replace browser history
                    onSuccess: () => {
                        // Update previousStepsRef with the steps that were just saved
                        // This ensures subsequent changes are detected properly
                        previousStepsRef.current = [...stepsAtSaveTime];

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

                        // Restore selected gate if it was cleared during save
                        if (selectedGateIdRef.current && !selectedGateId) {
                            setSelectedGateId(selectedGateIdRef.current);
                        }

                        // Update selectedGateId if the step IDs have changed
                        if (selectedGateIdRef.current) {
                            const match = selectedGateIdRef.current.match(/gate-after-(.+)/);
                            if (match) {
                                const oldStepId = match[1];
                                // Find the step that had this ID in the saved data
                                const oldStep = stepsAtSaveTime.find(s => String(s.id) === oldStepId);
                                if (oldStep) {
                                    // Find the corresponding step in the current data by sequence
                                    const currentStep = stepsRef.current.find(s => s.sequence === oldStep.sequence);
                                    if (currentStep && String(currentStep.id) !== oldStepId) {
                                        // IDs have changed, update the selectedGateId
                                        const newGateId = `gate-after-${currentStep.id}`;
                                        setSelectedGateId(newGateId);
                                        selectedGateIdRef.current = newGateId;
                                    }
                                }
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
    }, [permissions.canEditRoute, manufacturingOrder.id, onSave, onSaveStatusChange, onLastSavedAtChange, selectedStep, selectedGateId, steps]);

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

        // Check if steps have actually changed by comparing content, not IDs
        const normalizeStep = (step: RouteStep) => ({
            sequence: step.sequence,
            name: step.name,
            description: step.description,
            work_cell_id: step.work_cell_id,
            setup_time_minutes: step.setup_time_minutes,
            cycle_time_minutes: step.cycle_time_minutes,
            step_type: step.step_type,
            is_required: step.is_required,
            quality_check_mode: step.quality_check_mode,
            sampling_size: step.sampling_size,
            form_id: step.form_id,
            gate_after: step.gate_after
        });

        const currentStepsNormalized = steps.map(normalizeStep);
        const previousStepsNormalized = previousStepsRef.current.map(normalizeStep);

        const currentStepsStr = JSON.stringify(currentStepsNormalized);
        const previousStepsStr = JSON.stringify(previousStepsNormalized);
        const hasChanges = currentStepsStr !== previousStepsStr;

        if (!hasChanges) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save (1500ms after last change)
        saveTimeoutRef.current = setTimeout(() => {
            saveRoute();
        }, 1500); // 1.5 seconds delay for auto-save

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
        gate_after: step.gate_after,
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

    // Handle gate selection
    const handleGateSelect = useCallback((gateId: string) => {
        setSelectedGateId(gateId);
        setSelectedStep(null); // Clear step selection when gate is selected
    }, []);

    // Handle step selection
    const handleStepSelect = useCallback((step: RouteStep | null) => {
        setSelectedStep(step);
        setSelectedGateId(null); // Clear gate selection when step is selected
    }, []);

    // Get selected gate data
    const getSelectedGateData = useMemo(() => {
        if (!selectedGateId || !steps.length) return null;

        // Extract step ID from gate ID (format: "gate-after-{stepId}")
        const match = selectedGateId.match(/gate-after-(.+)/);
        if (!match) return null;

        const stepId = match[1];
        const precedingStep = steps.find(s => String(s.id) === stepId);

        if (!precedingStep) {
            return null;
        }

        const precedingStepIndex = steps.findIndex(s => s.id === precedingStep.id);
        const followingStep = precedingStepIndex < steps.length - 1 ? steps[precedingStepIndex + 1] : null;

        return {
            gate: precedingStep.gate_after || { dependency_type: 'all_children_completed' },
            precedingStep: canvasSteps.find(s => String(s.id) === String(precedingStep.id)) || null,
            followingStep: followingStep ? canvasSteps.find(s => String(s.id) === String(followingStep.id)) || null : null,
            precedingStepId: precedingStep.id
        };
    }, [selectedGateId, steps, canvasSteps]);

    return (
        <div className="flex flex-col h-full">

            {/* Main Content - Flow View and Properties Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Flow view area with transition */}
                <div className={cn(
                    "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out",
                    (selectedStep || selectedGateId) ? "pr-[35rem]" : "pr-0"
                )}>
                    <RouteFlowView
                        steps={canvasSteps}
                        selectedStep={canvasSelectedStep}
                        selectedGateId={selectedGateId}
                        onStepSelect={(step) => {
                            if (step) {
                                const routeStep = steps.find(s => String(s.id) === String(step.id));
                                handleStepSelect(routeStep || null);
                            } else {
                                handleStepSelect(null);
                            }
                        }}
                        onGateSelect={handleGateSelect}
                        onStepAdd={handleAddStep}
                        onStepDelete={(step) => {
                            const index = steps.findIndex(s => String(s.id) === String(step.id));
                            if (index >= 0) {
                                handleDeleteStep(index);
                            }
                        }}
                        onStepUpdate={(stepId, updates) => {
                            // Handle step updates from RouteFlowView
                            const index = steps.findIndex(s => String(s.id) === String(stepId));
                            if (index >= 0) {
                                const newSteps = [...steps];
                                newSteps[index] = { ...steps[index], ...updates };
                                setSteps(newSteps);
                            }
                        }}
                        onGateUpdate={handleGateUpdate}
                        canEdit={permissions.canEditRoute}
                        viewMode={!permissions.canEditRoute}
                        parentMO={manufacturingOrder.parent || null}
                        onParentMOClick={() => {
                            if (manufacturingOrder.parent && onParentMOClick) {
                                onParentMOClick(manufacturingOrder.parent.id);
                            }
                        }}
                    />
                </div>

                {/* Properties Panels - Absolute positioned */}
                <div className="absolute inset-y-0 right-0 z-10">
                    {/* Step Properties Panel */}
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

                            // If not found, try to match by the currently selected step
                            if (index < 0 && selectedStep) {
                                // The stepId might be stale after a save, so use the selectedStep instead
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
                            } else {
                            }
                        }}
                        isOpen={!!selectedStep && !selectedGateId}
                        viewMode={!permissions.canEditRoute}
                    />

                    {/* Gate Properties Panel */}
                    <GatePropertiesPanel
                        selectedGate={getSelectedGateData?.gate || null}
                        precedingStep={getSelectedGateData?.precedingStep || null}
                        followingStep={getSelectedGateData?.followingStep || null}
                        gateId={selectedGateId}
                        onGateUpdate={(gate) => {
                            if (getSelectedGateData?.precedingStepId) {
                                handleGateUpdate(getSelectedGateData.precedingStepId, gate);
                            }
                        }}
                        isOpen={!!selectedGateId}
                        viewMode={!permissions.canEditRoute}
                        manufacturingOrderQuantity={manufacturingOrder.quantity}
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