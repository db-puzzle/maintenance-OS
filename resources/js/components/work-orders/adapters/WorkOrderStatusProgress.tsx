import React from 'react';
import { StatusProgress, type StatusStep } from '@/components/ui/status-progress';
import { type WorkOrderStatus, type WorkOrder } from '@/types/work-order';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkOrderStatusProgressProps {
    currentStatus: WorkOrderStatus;
    workOrder?: WorkOrder;
    onTabChange?: (tabId: string) => void;
    className?: string;
}

// Map work order tabs to status IDs
const STATUS_TAB_MAPPING: Record<string, string> = {
    'requested': 'details',
    'approved': 'approval',
    'planned': 'planning',
};

// Branch statuses configuration
const BRANCH_STATUS_CONFIG = {
    rejected: {
        name: 'Rejeitada',
        description: 'Esta ordem foi rejeitada pelo aprovador'
    },
    cancelled: {
        name: 'Cancelada',
        description: 'Esta ordem foi cancelada antes da conclusão'
    },
    on_hold: {
        name: 'Em Espera',
        description: 'Esta ordem está temporariamente pausada'
    }
};

// Function to generate work order status steps with dynamic descriptions
function getWorkOrderStatusSteps(workOrder?: WorkOrder): StatusStep[] {
    const baseSteps: StatusStep[] = [
        {
            id: 'requested',
            name: 'Solicitada',
            description: 'Ordem criada e esperando aprovação'
        },
        {
            id: 'approved',
            name: 'Aprovada',
            description: 'Ordem autorizada, aguardando planejamento'
        },
        {
            id: 'planned',
            name: 'Planejada',
            description: 'Recursos definidos, aguardando agendamento'
        },
        {
            id: 'scheduled',
            name: 'Agendada',
            description: 'Designada ao técnico, aguardando início'
        },
        {
            id: 'in_progress',
            name: 'Em Execução',
            description: 'Trabalho sendo executado'
        },
        {
            id: 'completed',
            name: 'Concluída',
            description: 'Trabalho finalizado, aguardando verificação'
        },
        {
            id: 'verified',
            name: 'Verificada',
            description: 'Qualidade validada, aguardando fechamento'
        },
        {
            id: 'closed',
            name: 'Fechada',
            description: 'Finalizada com toda documentação completa'
        },
    ];

    // Enhance with dynamic information if available
    if (workOrder) {
        // Update requested step with requester info
        if (workOrder.requested_at) {
            const requestedStep = baseSteps.find(step => step.id === 'requested');
            if (requestedStep) {
                const requestedDate = format(new Date(workOrder.requested_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
                const requesterName = workOrder.requester?.name || 'Sistema';
                requestedStep.description = `Solicitada por ${requesterName} em ${requestedDate}`;
            }
        }

        // Update approved step with approver info
        if (workOrder.approved_at && workOrder.approver) {
            const approvedStep = baseSteps.find(step => step.id === 'approved');
            if (approvedStep) {
                const approvedDate = format(new Date(workOrder.approved_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
                const approverName = workOrder.approver.name;
                approvedStep.description = `Aprovada por ${approverName} em ${approvedDate}`;
            }
        }

        // Update planned step with planner info
        if (workOrder.planned_at && workOrder.planner) {
            const plannedStep = baseSteps.find(step => step.id === 'planned');
            if (plannedStep) {
                const plannedDate = format(new Date(workOrder.planned_at), "d 'de' MMMM", { locale: ptBR });
                plannedStep.description = `Planejada por ${workOrder.planner.name} em ${plannedDate}`;
            }
        }

        // Update scheduled step with technician info
        if (workOrder.scheduled_start_date && workOrder.assigned_technician) {
            const scheduledStep = baseSteps.find(step => step.id === 'scheduled');
            if (scheduledStep) {
                const scheduledDate = format(new Date(workOrder.scheduled_start_date), "d 'de' MMMM", { locale: ptBR });
                scheduledStep.description = `Agendada para ${workOrder.assigned_technician.name} em ${scheduledDate}`;
            }
        }
    }

    return baseSteps;
}

export function WorkOrderStatusProgress({
    currentStatus,
    workOrder,
    onTabChange,
    className
}: WorkOrderStatusProgressProps) {
    // Check if it's a branch status
    const isBranchStatus = ['rejected', 'cancelled', 'on_hold'].includes(currentStatus);

    // Get branch status config if applicable
    const branchStatus = isBranchStatus && currentStatus in BRANCH_STATUS_CONFIG
        ? {
            type: currentStatus as 'rejected' | 'cancelled' | 'on_hold',
            ...BRANCH_STATUS_CONFIG[currentStatus as keyof typeof BRANCH_STATUS_CONFIG]
        }
        : undefined;

    // Get dynamic steps
    const steps = getWorkOrderStatusSteps(workOrder);

    // Determine clickable steps based on whether we have tab navigation
    const clickableSteps = onTabChange
        ? Object.keys(STATUS_TAB_MAPPING)
        : [];

    // Handle step clicks
    const handleStepClick = (stepId: string) => {
        if (onTabChange && STATUS_TAB_MAPPING[stepId]) {
            onTabChange(STATUS_TAB_MAPPING[stepId]);
        }
    };

    return (
        <StatusProgress
            steps={steps}
            currentStepId={currentStatus}
            onStepClick={handleStepClick}
            clickableSteps={clickableSteps}
            className={className}
            showBranchStatus={isBranchStatus}
            branchStatus={branchStatus}
        />
    );
} 