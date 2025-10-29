/**
 * Manufacturing Step State Types and Interfaces
 */

export type StepStateType =
    | 'pending'
    | 'queued'
    | 'in_progress'
    | 'on_hold'
    | 'awaiting_quality'
    | 'completed'
    | 'skipped'
    | 'cancelled';

export interface StepDependency {
    id: number;
    type: 'step' | 'child_order';
    name: string;
    status: 'pending' | 'met' | 'failed';
    progress?: number;
    details?: string;
}

export interface HoldInfo {
    reason: string;
    duration: number;
    previousState: StepStateType;
    heldBy: {
        id: number;
        name: string;
    };
    heldAt: string;
}

export interface QualityRequirements {
    formRequired: boolean;
    formUrl?: string;
    specifications: string[];
    inspectorAssigned?: {
        id: number;
        name: string;
    };
}

export interface StepStateInfo {
    state: StepStateType;
    canStart: boolean;
    cannotStartReason?: string;
    dependencies?: {
        stepDependencies: StepDependency[];
        childOrderDependencies: StepDependency[];
    };
    holdInfo?: HoldInfo;
    qualityRequirements?: QualityRequirements;
    completionInfo?: {
        quantityProduced: number;
        quantityScraped: number;
        actualDuration: number;
        estimatedDuration: number;
        efficiency: number;
        completedBy: {
            id: number;
            name: string;
        };
        completedAt: string;
    };
    skipInfo?: {
        reason: string;
        skippedBy: {
            id: number;
            name: string;
        };
        skippedAt: string;
        authorizedBy?: {
            id: number;
            name: string;
        };
    };
    cancellationInfo?: {
        reason: string;
        cancelledBy: {
            id: number;
            name: string;
        };
        cancelledAt: string;
        affectedSteps: string[];
    };
}

export interface StateTransitionAction {
    action: string;
    label: string;
    icon: string; // Lucide icon name
    variant: 'default' | 'outline' | 'destructive' | 'ghost' | 'warning' | 'success';
    confirmMessage?: string;
    requiresPermission?: string;
    requiresReason?: boolean;
    enabled?: boolean;
    tooltip?: string;
}

export interface StateTransitionRequest {
    action: string;
    reason?: string;
    data?: Record<string, unknown>;
}

import { ProductionExecution } from './production';

export interface StateTransitionResponse {
    success: boolean;
    newState?: StepStateType;
    execution?: ProductionExecution;
    error?: string;
    validationErrors?: Record<string, string[]>;
}
