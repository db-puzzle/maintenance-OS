import React, { useState, useCallback, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import RouteBuilder from '@/components/production/planning/RouteBuilder';
import { RouteStep } from '@/components/production/planning/RouteBuilder';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { useRouteChangesStore } from '@/stores/useRouteChangesStore';

interface Props {
    order: ManufacturingOrder;
    workCells: WorkCell[];
    plants?: {
        id: number;
        name: string;
    }[];
    shifts?: {
        id: number;
        name: string;
    }[];
    manufacturers?: {
        id: number;
        name: string;
    }[];
    unitsOfMeasure?: {
        id: number;
        code: string;
        name: string;
        symbol?: string;
        uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    }[];
    permissions: {
        canEditRoute: boolean;
        canSaveAsTemplate: boolean;
        canCreateWorkCell: boolean;
    };
    onSave?: () => void;
    onCancel?: () => void;
    viewMode?: boolean;
}

/**
 * ManufacturingOrderRouteEditor
 * 
 * Wrapper component that adapts the working RouteBuilder component from the planning page
 * for use in the Manufacturing Order show page context.
 * 
 * This component:
 * - Transforms MO data to RouteBuilder format
 * - Handles save/cancel actions for single MO editing
 * - Manages state changes and integrates with route changes store
 * - Provides proper error handling and user feedback
 * 
 * IMPORTANT: This component does NOT modify RouteBuilder, StepPropertiesPanel,
 * GatePropertiesPanel, or any other working components. It acts as an adapter layer.
 */
export default function ManufacturingOrderRouteEditor({
    order,
    workCells,
    plants = [],
    shifts = [],
    manufacturers = [],
    unitsOfMeasure = [],
    permissions,
    onSave,
    onCancel,
    viewMode = false
}: Props) {
    const [currentSteps, setCurrentSteps] = useState<RouteStep[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const routeChangesStore = useRouteChangesStore();

    // Track if we're mounted to prevent state updates after unmount
    const isMountedRef = useRef(true);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Handle steps change from RouteBuilder
    const handleStepsChange = useCallback((steps: RouteStep[]) => {
        if (!isMountedRef.current) return;
        setCurrentSteps(steps);
    }, []);

    // Handle dirty state change
    const handleDirtyChange = useCallback((dirty: boolean) => {
        if (!isMountedRef.current) return;
        setIsDirty(dirty);
    }, []);

    // Handle save
    const handleSave = useCallback(() => {
        if (!order.manufacturing_route) {
            toast.error('Nenhum roteiro encontrado para salvar');
            return;
        }

        setIsSaving(true);
        setSaveStatus('saving');

        // Transform RouteSteps to backend format
        const stepsData = currentSteps.map((step, index) => ({
            // If step ID is a temporary ID (starts with 'temp-'), send as null for backend to create
            id: typeof step.id === 'string' && step.id.startsWith('temp-') ? null : step.id,
            display_position: step.sequence,
            step_number: step.sequence,
            name: step.name,
            description: step.description || '',
            step_type: step.step_type,
            work_cell_id: step.work_cell_id,
            setup_time_minutes: step.setup_time_minutes || 0,
            cycle_time_minutes: step.cycle_time_minutes || 0,
            use_workcell_throughput: step.use_workcell_throughput || false,
            // Dependencies: each step depends on the previous one
            depends_on_step_id: index > 0 ? (
                typeof currentSteps[index - 1].id === 'string' && currentSteps[index - 1].id.toString().startsWith('temp-')
                    ? null // Will be resolved by backend
                    : currentSteps[index - 1].id
            ) : null,
            can_start_when_dependency: index > 0 ? 'completed' : null,
            quality_check_mode: step.quality_check_mode,
            sampling_size: step.sampling_size,
            form_id: step.form_id,
            // Gate configuration
            child_order_dependency_type: step.gate_after?.dependency_type || 'none',
            child_order_minimum_quantity: step.gate_after?.minimum_quantity || 0,
            // External execution fields
            execution_location: step.execution_location || 'internal',
            manufacturer_id: step.manufacturer_id || null,
            expected_lead_time_days: step.expected_lead_time_days || null,
        }));

        // Use Inertia to save
        router.post(
            route('production.orders.routes.update', order.id),
            {
                steps: stepsData,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (!isMountedRef.current) return;

                    toast.success('Roteiro salvo com sucesso');
                    setIsDirty(false);
                    setSaveStatus('saved');
                    setLastSavedAt(new Date());

                    // Clear the tracked changes from the store
                    routeChangesStore.clearChanges(order.id);

                    // Call the onSave callback if provided
                    if (onSave) {
                        onSave();
                    }

                    // Reset save status after a delay
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            setSaveStatus('idle');
                        }
                    }, 2000);
                },
                onError: (errors) => {
                    if (!isMountedRef.current) return;

                    console.error('Error saving route:', errors);
                    toast.error('Erro ao salvar roteiro');
                    setSaveStatus('error');

                    // Reset error status after a delay
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            setSaveStatus('idle');
                        }
                    }, 3000);
                },
                onFinish: () => {
                    if (isMountedRef.current) {
                        setIsSaving(false);
                    }
                }
            }
        );
    }, [order, currentSteps, onSave, routeChangesStore]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        // Clear tracked changes
        routeChangesStore.clearChanges(order.id);
        setIsDirty(false);

        // Call the onCancel callback if provided
        if (onCancel) {
            onCancel();
        }
    }, [order.id, onCancel, routeChangesStore]);

    // Show confirmation before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    return (
        <div className="h-full flex flex-col">
            {/* Route Builder - using the working component from planning page */}
            <RouteBuilder
                manufacturingOrder={order}
                workCells={workCells}
                plants={plants}
                shifts={shifts}
                manufacturers={manufacturers}
                unitsOfMeasure={unitsOfMeasure}
                onDirtyChange={handleDirtyChange}
                onStepsChange={handleStepsChange}
                onSave={handleSave}
                onSaveStatusChange={setSaveStatus}
                onLastSavedAtChange={setLastSavedAt}
                isSaving={isSaving}
                permissions={permissions}
            />

            {/* Save Action Bar */}
            {isDirty && !viewMode && (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-sm text-muted-foreground">
                                Alterações não salvas
                            </span>
                            {lastSavedAt && saveStatus === 'saved' && (
                                <span className="text-xs text-muted-foreground">
                                    • Salvo há {Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)}s
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

