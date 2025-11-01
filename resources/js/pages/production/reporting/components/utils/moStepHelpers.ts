import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { StepStateType, StepStateInfo } from '@/types/production-states';

// Type for current execution data from MO viewer
interface CurrentExecutionData {
    id: number;
    status: string;
    started_at: string;
    quantity_completed?: number;
    quantity_scrapped?: number;
}

export interface ActiveStepResult {
    step: ManufacturingStep | null;
    execution: ManufacturingStepExecution | null;
}

/**
 * Find the active step in a manufacturing order
 */
export function findActiveStep(order: ManufacturingOrder): ActiveStepResult {
    const route = order.manufacturing_route;
    if (!route?.steps) {
        return { step: null, execution: null };
    }

    // First check for in_progress or awaiting_quality steps
    for (const step of route.steps) {
        // Check if step has current_execution from MO viewer data
        const stepWithExec = step as ManufacturingStep & { current_execution?: CurrentExecutionData };
        if (step.status === 'in_progress' && stepWithExec.current_execution) {
            const currentExecData = stepWithExec.current_execution;
            const execution = {
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
            return { step, execution };
        }

        // Check if step has executions array
        const execution = step.executions?.find(
            (e: ManufacturingStepExecution) => ['in_progress', 'awaiting_quality'].includes(e.status)
        );
        if (execution) {
            return { step, execution };
        }
    }

    // Then check for queued steps
    const queuedStep = route.steps.find(s => s.status === 'queued');
    if (queuedStep) {
        return { step: queuedStep, execution: null };
    }

    // Then check for pending steps that can start
    const pendingStep = route.steps.find(s => s.status === 'pending' && s.can_start);
    if (pendingStep) {
        return { step: pendingStep, execution: null };
    }

    // Default to first non-completed step
    const nextStep = route.steps.find(s => !['completed', 'skipped', 'cancelled'].includes(s.status));
    return { step: nextStep || null, execution: null };
}

/**
 * Determine the state information for a manufacturing step
 */
export async function determineStepState(
    step: ManufacturingStep, 
    execution: ManufacturingStepExecution | null
): Promise<StepStateInfo> {
    // Base state info
    const stateInfo: StepStateInfo = {
        state: (execution?.status || step.status) as StepStateType,
        canStart: step.can_start !== false,
        cannotStartReason: step.cannot_start_reason,
    };

    // Add state-specific information
    switch (stateInfo.state) {
        case 'pending':
            // Dependencies should be loaded with the step data
            // If not available, we'll need to fetch them via Inertia
            break;

        case 'on_hold':
            if (execution?.hold_reason) {
                stateInfo.holdInfo = {
                    reason: execution.hold_reason,
                    duration: execution.total_hold_duration || 0,
                    previousState: 'in_progress' as StepStateType, // TODO: Add previous_state to interface
                    heldBy: execution.executed_by_user || { id: 0, name: 'Unknown' },
                    heldAt: execution.on_hold_at || new Date().toISOString(),
                };
            }
            break;

        case 'awaiting_quality':
            // Quality requirements should be loaded with the step data
            // If not available, we'll need to fetch them via Inertia
            break;

        case 'completed':
            if (step.actual_end_time) {
                stateInfo.completionInfo = {
                    quantityProduced: step.cumulative_quantity_completed || 0,
                    quantityScraped: step.cumulative_quantity_scrapped || 0,
                    actualDuration: step.actual_duration_minutes || 0,
                    estimatedDuration: (step.setup_time_minutes + step.cycle_time_minutes) || 0,
                    efficiency: 100, // TODO: Calculate actual efficiency
                    completedBy: { id: 0, name: 'Unknown' }, // TODO: Add completed_by to interface
                    completedAt: step.actual_end_time,
                };
            }
            break;

        case 'skipped':
            // TODO: Add skip_reason fields to ManufacturingStep interface
            stateInfo.skipInfo = {
                reason: 'Step was skipped', // TODO: Get actual skip reason
                skippedBy: { id: 0, name: 'Unknown' },
                skippedAt: new Date().toISOString(),
                authorizedBy: undefined,
            };
            break;

        case 'cancelled':
            // TODO: Add cancellation fields to ManufacturingStep interface
            stateInfo.cancellationInfo = {
                reason: 'Step was cancelled', // TODO: Get actual cancellation reason
                cancelledBy: { id: 0, name: 'Unknown' },
                cancelledAt: new Date().toISOString(),
                affectedSteps: [],
            };
            break;
    }

    return stateInfo;
}

/**
 * Calculate the remaining quantity for a manufacturing order
 */
export function getRemainingQuantity(
    order: ManufacturingOrder,
    currentStep: ManufacturingStep | null,
    activeExecution: ManufacturingStepExecution | null
): number {
    if (!activeExecution || !order) return 0;

    const cumulative = currentStep?.cumulative_quantity_completed || 0;
    const cumulativeScrap = currentStep?.cumulative_quantity_scrapped || 0;

    return order.quantity - cumulative - cumulativeScrap;
}
