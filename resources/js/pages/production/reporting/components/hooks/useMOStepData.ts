import { useState, useEffect, useCallback } from 'react';
import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { Media } from '@/types/media';
import { StepStateInfo } from '@/types/production-states';
import { findActiveStep, determineStepState } from '../utils/moStepHelpers';

export interface UseMOStepDataReturn {
    // State values
    currentStep: ManufacturingStep | null;
    activeExecution: ManufacturingStepExecution | null;
    stepStateInfo: StepStateInfo | null;
    loading: boolean;
    
    // State setters (needed by other hooks)
    setCurrentStep: (step: ManufacturingStep | null) => void;
    setActiveExecution: (execution: ManufacturingStepExecution | null) => void;
    setStepStateInfo: (info: StepStateInfo | null) => void;
    setStepPhotos: (photos: Media[]) => void;
    stepPhotos: Media[];
    
    // Methods
    refresh: () => Promise<void>;
    initializeDialog: () => Promise<void>;
}

export function useMOStepData(
    order: ManufacturingOrder | null,
    isOpen: boolean,
    activeStepId?: number
): UseMOStepDataReturn {
    const [currentStep, setCurrentStep] = useState<ManufacturingStep | null>(null);
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [stepStateInfo, setStepStateInfo] = useState<StepStateInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [stepPhotos, setStepPhotos] = useState<Media[]>([]);
    
    // Initialize or refresh dialog data
    const initializeDialog = useCallback(async () => {
        if (!order) {
            return;
        }

        setLoading(true);
        try {
            // If we need to fetch fresh order data (e.g., after state transition)
            // This would require an API endpoint that returns the full order with executions
            // For now, we'll work with what we have

            // Find the current step
            let step: ManufacturingStep | null = null;
            let execution: ManufacturingStepExecution | null = null;

            if (activeStepId) {
                // Find step by ID if provided
                step = order.manufacturing_route?.steps?.find(s => s.id === activeStepId) || null;
            } else {
                // Find active step
                const activeStepData = findActiveStep(order);
                step = activeStepData.step;
                execution = activeStepData.execution;
            }

            // Check if step is in_progress but we don't have execution data
            if (step?.status === 'in_progress' && !execution) {
                // First check if step has current_execution from MO viewer
                const stepWithExec = step as ManufacturingStep & { current_execution?: { 
                    id: number; 
                    status: string; 
                    started_at: string; 
                    quantity_completed?: number; 
                    quantity_scrapped?: number; 
                } };
                if (stepWithExec.current_execution) {
                    const currentExecData = stepWithExec.current_execution;
                    execution = {
                        id: currentExecData.id,
                        manufacturing_step_id: step.id,
                        manufacturing_order_id: order.id,
                        status: currentExecData.status,
                        started_at: currentExecData.started_at,
                        quantity_completed: currentExecData.quantity_completed || 0,
                        quantity_scrapped: currentExecData.quantity_scrapped || 0,
                        total_hold_duration: 0,
                        media: []
                    } as ManufacturingStepExecution;
                }
                // Otherwise check if we have executions in the step data
                else if (step.executions && step.executions.length > 0) {
                    // Find the in_progress execution
                    execution = step.executions.find(
                        (e: ManufacturingStepExecution) => e.status === 'in_progress'
                    ) || step.executions[0]; // Fallback to first execution
                } else {
                    // If we have an in_progress step without execution data, we need to fetch it
                    // For now, we'll leave execution as null and handle it differently
                    execution = null;
                }
            }

            setCurrentStep(step);
            setActiveExecution(execution);
            setStepPhotos(execution?.media || []);

            // Determine step state and fetch additional info
            if (step) {
                const stateInfo = await determineStepState(step, execution);
                setStepStateInfo(stateInfo);
            }
        } catch (error) {
            console.error('[MOStepData] Error initializing dialog:', error);
        } finally {
            setLoading(false);
        }
    }, [order, activeStepId]);
    
    // Auto-initialize when dialog opens
    useEffect(() => {
        if (order && isOpen) {
            initializeDialog();
        }
    }, [order?.id, isOpen, activeStepId, initializeDialog]);
    
    return {
        currentStep,
        activeExecution,
        stepStateInfo,
        loading,
        setCurrentStep,
        setActiveExecution,
        setStepStateInfo,
        stepPhotos,
        setStepPhotos,
        refresh: initializeDialog,
        initializeDialog
    };
}
