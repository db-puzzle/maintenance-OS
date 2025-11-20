import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import RouteFlowView from '@/components/production/RouteFlowView';
import StepPropertiesPanel from '@/components/production/StepPropertiesPanel';
import GatePropertiesPanel from '@/components/production/GatePropertiesPanel';
import { ManufacturingStep, WorkCell, ManufacturingOrder } from '@/types/production';
import { GateConfiguration } from '@/components/production/GateCard';
import { useRouteChangesStore } from '@/stores/useRouteChangesStore';
import { calculateDisplayPositions } from '@/utils/step-sequencer';

// ExtendedManufacturingStep type is defined in StepPropertiesPanel

export interface RouteStep {
    id: string | number;
    sequence: number;
    name: string;
    description?: string;
    work_cell_id: number | null;
    setup_time_minutes?: number;
    cycle_time_minutes?: number;
    use_workcell_throughput?: boolean;
    step_type: 'standard' | 'quality_check' | 'rework';
    is_required: boolean;
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
    form_id?: number;
    depends_on_step_id?: string | number;
    // Gate after this step
    gate_after?: GateConfiguration;
    // External execution fields
    execution_location?: 'internal' | 'external';
    manufacturer_id?: number | null;
    expected_lead_time_days?: number | null;
}

interface RouteBuilderProps {
    manufacturingOrder: ManufacturingOrder;
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
    onDirtyChange?: (isDirty: boolean) => void;
    onStepsChange: (steps: RouteStep[]) => void;
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
    plants,
    shifts,
    manufacturers,
    unitsOfMeasure,
    onDirtyChange,
    onStepsChange,
    isSaving = false,
    permissions,
    onParentMOClick,
}: RouteBuilderProps) {
    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [selectedGateId, setSelectedGateId] = useState<string | null>(null);

    // Track original steps for comparison
    const originalStepsRef = useRef<RouteStep[]>([]);

    // Get route changes store
    const routeChangesStore = useRouteChangesStore();

    // Form for editing step details
    const stepForm = useForm<{
        name: string;
        description: string;
        step_type: string;
        work_cell_id: string;
        setup_time_minutes: number;
        cycle_time_minutes: number;
        use_workcell_throughput?: boolean;
        depends_on_step_id: string;
        can_start_when_dependency: 'completed';
        quality_check_mode?: string;
        sampling_size?: number;
        form_id?: string;
        execution_location?: string;
        manufacturer_id?: number | null;
        expected_lead_time_days?: number | null;
    }>({
        name: '',
        description: '',
        step_type: 'standard',
        work_cell_id: '',
        setup_time_minutes: 0,
        cycle_time_minutes: 0,
        use_workcell_throughput: false,
        depends_on_step_id: '',
        can_start_when_dependency: 'completed',
        quality_check_mode: 'every_part',
        sampling_size: 0,
        form_id: '',
        execution_location: 'internal',
        manufacturer_id: null,
        expected_lead_time_days: null,
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

            // Check if we have tracked changes for this MO
            const trackedChanges = routeChangesStore.getChanges(manufacturingOrder.id);

            if (trackedChanges) {
                // Use the tracked changes instead of the original data
                setSteps(trackedChanges.steps);
                originalStepsRef.current = trackedChanges.originalSteps;
            } else if (manufacturingOrder.manufacturing_route && manufacturingOrder.manufacturing_route.steps) {
                const routeSteps: RouteStep[] = manufacturingOrder.manufacturing_route.steps.map((step: ManufacturingStep, index: number) => ({
                    id: step.id?.toString() || `existing-${index}`,
                    sequence: step.display_position || index + 1,
                    name: step.name,
                    description: step.description || '',
                    work_cell_id: step.work_cell_id ?? null,
                    setup_time_minutes: step.setup_time_minutes || 0,
                    cycle_time_minutes: step.cycle_time_minutes || 0,
                    use_workcell_throughput: step.use_workcell_throughput ?? false,
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
                    // External execution fields
                    execution_location: step.execution_location || 'internal',
                    manufacturer_id: step.manufacturer_id || null,
                    expected_lead_time_days: step.expected_lead_time_days || null,
                }));
                setSteps(routeSteps);
                // Initialize originalStepsRef to track changes
                originalStepsRef.current = [...routeSteps];

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
                // Check if we have tracked changes even though there's no route in the MO
                const trackedChanges = routeChangesStore.getChanges(manufacturingOrder.id);
                if (trackedChanges) {
                    setSteps(trackedChanges.steps);
                    originalStepsRef.current = trackedChanges.originalSteps;
                } else {
                    // Clear steps and initialize originalStepsRef for new routes
                    setSteps([]);
                    originalStepsRef.current = [];
                }
            }
            // Clear selected step only when changing manufacturing orders, not when route data updates
            if (moChanged) {
                setSelectedStep(null);
                setSelectedGateId(null);
            }
        }
    }, [manufacturingOrder.id, manufacturingOrder.manufacturing_route, steps, selectedGateId, routeChangesStore]); // Re-run when manufacturing order or its route changes

    // Track previous steps to avoid unnecessary updates
    const previousStepsRef = useRef<RouteStep[]>([]);

    // Notify parent of step changes only when steps actually change
    useEffect(() => {
        const stepsString = JSON.stringify(steps);
        const previousStepsString = JSON.stringify(previousStepsRef.current);

        if (stepsString !== previousStepsString) {
            onStepsChange(steps);
            previousStepsRef.current = steps;
        }
    }, [steps, onStepsChange]);

    // Track dirty state if callback provided
    useEffect(() => {
        if (onDirtyChange) {
            const stepsStr = JSON.stringify(steps);
            const originalStr = JSON.stringify(originalStepsRef.current);
            const hasChanges = stepsStr !== originalStr;


            onDirtyChange(hasChanges);
        }
    }, [steps, onDirtyChange]);

    // Ensure selectedStep exists in steps array
    useEffect(() => {
        if (selectedStep && !steps.find(s => String(s.id) === String(selectedStep.id))) {
            // Only clear if the step truly doesn't exist (not just a reference change)
            setSelectedStep(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steps.length, selectedStep?.id]); // Only check when the number of steps changes or selected step ID changes

    // Watch for when tracked changes are cleared (e.g., when user cancels)
    useEffect(() => {
        const trackedChanges = routeChangesStore.getChanges(manufacturingOrder.id);

        // If there are no tracked changes but we have modified steps, reset to original
        if (!trackedChanges && steps.length > 0 && JSON.stringify(steps) !== JSON.stringify(originalStepsRef.current)) {
            // Reset to original steps
            setSteps([...originalStepsRef.current]);
        }
    }, [routeChangesStore, manufacturingOrder.id, steps]);

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
                use_workcell_throughput: selectedStep.use_workcell_throughput ?? false,
                depends_on_step_id: selectedStep.sequence > 1 ? steps[selectedStep.sequence - 2]?.id?.toString() : '',
                can_start_when_dependency: 'completed',
                quality_check_mode: selectedStep.quality_check_mode || 'every_part',
                sampling_size: selectedStep.sampling_size || 0,
                form_id: selectedStep.form_id?.toString() || '',
                execution_location: selectedStep.execution_location || 'internal',
                manufacturer_id: selectedStep.manufacturer_id || null,
                expected_lead_time_days: selectedStep.expected_lead_time_days || null,
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

        // Set depends_on_step_id for the new step if there are existing steps
        if (steps.length > 0) {
            // Find the last step's ID to set as dependency
            const lastStep = steps[steps.length - 1];
            newStep.depends_on_step_id = lastStep.id;
        }

        setSteps(prevSteps => [...prevSteps, newStep]);
        setSelectedStep(newStep);
        // Clear any gate selection to ensure step panel opens
        setSelectedGateId(null);
    }, [steps]);

    // Delete step
    const handleDeleteStep = useCallback((index: number) => {
        const deletedStepId = steps[index].id;
        const newSteps = steps.filter((_, i) => i !== index);

        // Update sequence numbers and fix dependency chain
        newSteps.forEach((step, i) => {
            step.sequence = i + 1;

            // Fix dependencies after deletion
            if (i === 0) {
                // First step should have no dependency
                step.depends_on_step_id = undefined;
            } else {
                // Each step depends on the previous one
                step.depends_on_step_id = newSteps[i - 1].id;
            }

            // If this step depended on the deleted step, update its dependency
            if (step.depends_on_step_id === deletedStepId) {
                if (index === 0 && i === 0) {
                    // If we deleted the first step, the new first step should have no dependency
                    step.depends_on_step_id = undefined;
                } else if (index > 0) {
                    // Otherwise, make it depend on the step before the deleted one
                    step.depends_on_step_id = steps[index - 1].id;
                }
            }
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

    // Update original steps after successful save
    const _updateOriginalSteps = useCallback(() => {
        originalStepsRef.current = [...steps];
    }, [steps]);

    // No longer needed - parent component will track steps via onStepsChange

    // Convert steps to canvas format with calculated display positions
    const canvasSteps = useMemo(() => {
        // First, convert steps to a format that calculateDisplayPositions can work with
        const stepsForPositionCalc = steps.map(step => ({
            id: typeof step.id === 'string' && step.id.startsWith('temp-') ? step.id : Number(step.id),
            depends_on_step_id: step.sequence > 1 ? (() => {
                const prevStep = steps[step.sequence - 2];
                if (!prevStep) return undefined;
                const prevId = prevStep.id;
                if (typeof prevId === 'string' && prevId.startsWith('temp-')) {
                    return prevId;
                }
                return Number(prevId);
            })() : undefined,
        })) as ManufacturingStep[];

        // Calculate display positions based on dependency chain
        const displayPositions = calculateDisplayPositions(stepsForPositionCalc);

        return steps.map(step => {
            const stepId = typeof step.id === 'string' && step.id.startsWith('temp-') ? step.id : Number(step.id);
            const displayPosition = displayPositions.get(stepId) || step.sequence;

            return {
                id: stepId,
                step_number: step.sequence,
                display_position: displayPosition,
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
                // External execution fields
                execution_location: step.execution_location || 'internal',
                manufacturer_id: step.manufacturer_id || null,
                manufacturer: step.manufacturer_id ? manufacturers.find(m => m.id === step.manufacturer_id) : undefined,
                expected_lead_time_days: step.expected_lead_time_days || null,
                manufacturing_route_id: manufacturingOrder.manufacturing_route?.id || 0,
                manufacturing_route: manufacturingOrder.manufacturing_route || {
                    id: 0,
                    name: '',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            };
            // Using 'any' to avoid type conflicts between different ExtendedManufacturingStep definitions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any[];
    }, [steps, workCells, manufacturingOrder.manufacturing_route, manufacturers]);

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
        <div className="flex flex-col h-full overflow-hidden">

            {/* Main Content - Flow View and Properties Panel */}
            <div className="flex-1 flex overflow-hidden relative min-h-0">
                {/* Flow view area with transition */}
                <div className={cn(
                    "flex-1 flex flex-col transition-all duration-300 ease-out",
                    (selectedStep || selectedGateId) ? "pr-[28rem]" : "pr-0"
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
                        itemCategoryName={manufacturingOrder.item?.category?.name}
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
                        plants={plants}
                        shifts={shifts}
                        manufacturers={manufacturers}
                        unitsOfMeasure={unitsOfMeasure}
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
                                    use_workcell_throughput: Object.prototype.hasOwnProperty.call(updates, 'use_workcell_throughput') ? updates.use_workcell_throughput ?? false : steps[index].use_workcell_throughput,
                                    is_required: steps[index].is_required,
                                    step_type: Object.prototype.hasOwnProperty.call(updates, 'step_type') ? (updates.step_type || 'standard') : steps[index].step_type,
                                    quality_check_mode: Object.prototype.hasOwnProperty.call(updates, 'quality_check_mode') ? updates.quality_check_mode : steps[index].quality_check_mode,
                                    sampling_size: Object.prototype.hasOwnProperty.call(updates, 'sampling_size') ? updates.sampling_size : steps[index].sampling_size,
                                    form_id: Object.prototype.hasOwnProperty.call(updates, 'form_id') ? updates.form_id : steps[index].form_id,
                                    // External execution fields
                                    execution_location: Object.prototype.hasOwnProperty.call(updates, 'execution_location') ? (updates.execution_location || 'internal') : steps[index].execution_location,
                                    manufacturer_id: Object.prototype.hasOwnProperty.call(updates, 'manufacturer_id') ? updates.manufacturer_id : steps[index].manufacturer_id,
                                    expected_lead_time_days: Object.prototype.hasOwnProperty.call(updates, 'expected_lead_time_days') ? updates.expected_lead_time_days : steps[index].expected_lead_time_days,
                                };
                                
                                // Log the update for debugging
                                console.log('[RouteBuilder] Step updated:', {
                                    stepId,
                                    updates,
                                    before: steps[index],
                                    after: updatedStep,
                                    external_fields: {
                                        execution_location: updatedStep.execution_location,
                                        manufacturer_id: updatedStep.manufacturer_id,
                                        expected_lead_time_days: updatedStep.expected_lead_time_days,
                                    }
                                });
                                
                                newSteps[index] = updatedStep;
                                setSteps(newSteps);
                                // Update selectedStep only if it's the one being edited
                                if (selectedStep && String(selectedStep.id) === String(stepId)) {
                                    setSelectedStep(updatedStep);
                                }
                            } else {
                                // Step not found
                                console.error('[RouteBuilder] Step not found for update:', stepId, updates);
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
        </div>
    );
}