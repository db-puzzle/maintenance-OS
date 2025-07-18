import React, { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import {
    WorkOrderStatusBadge,
    WorkOrderPriorityIndicator,
    WorkOrderFormComponent
} from '@/components/work-orders';
import {
    WorkOrderApprovalTab,
    WorkOrderPlanningTab,
    WorkOrderExecutionTab,
    WorkOrderHistoryTab,
    WorkOrderPartsTab,
    WorkOrderFailureAnalysisTab
} from '@/components/work-orders/tabs';
import EmptyCard from '@/components/ui/empty-card';
import { type BreadcrumbItem } from '@/types';
import {
    Edit,
    Play,
    Calendar,
    Clock,
    User,
    Package,
    FileText,
    AlertCircle,
    CheckCircle,
    XCircle,
    Pause,
    Settings,
    Activity,
    Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
    workOrder?: any; // Using any for now to avoid complex type definitions
    discipline: 'maintenance' | 'quality';
    canEdit: boolean;
    canApprove: boolean;
    canPlan: boolean;
    canExecute: boolean;
    canValidate: boolean;
    approvalThreshold?: {
        maxCost: number;
        maxPriority: string;
    };
    technicians?: any[];
    teams?: any[];
    parts?: any[];
    skills?: string[];
    certifications?: string[];
    isCreating?: boolean;
    categories?: any[];
    workOrderTypes?: any[];
    plants?: any[];
    areas?: any[];
    sectors?: any[];
    assets?: any[];
    forms?: any[];
}

export default function ShowWorkOrder({
    workOrder,
    discipline,
    canEdit,
    canApprove,
    canPlan,
    canExecute,
    canValidate,
    approvalThreshold,
    technicians = [],
    teams = [],
    parts = [],
    skills = [],
    certifications = [],
    isCreating = false,
    categories = [],
    workOrderTypes = [],
    plants = [],
    areas = [],
    sectors = [],
    assets = [],
    forms = []
}: Props) {
    console.log('[show.tsx] ShowWorkOrder rendering', {
        workOrderId: workOrder?.id,
        workOrderStatus: workOrder?.status,
        canApprove,
        approvalThreshold,
        isCreating
    });

    useEffect(() => {
        console.log('[show.tsx] Component mounted/updated', {
            workOrderId: workOrder?.id,
            workOrderStatus: workOrder?.status,
            isCreating
        });

        // Add error event listener to catch React errors
        const handleError = (event: ErrorEvent) => {
            console.error('[show.tsx] Global error caught:', {
                message: event.message,
                error: event.error,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        };

        window.addEventListener('error', handleError);

        return () => {
            console.log('[show.tsx] Component unmounting', {
                workOrderId: workOrder?.id,
                workOrderStatus: workOrder?.status,
                isCreating
            });
            window.removeEventListener('error', handleError);
        };
    }, [workOrder?.id, workOrder?.status, isCreating]);

    const handleStatusAction = (action: string) => {
        router.post(route(`${discipline}.work-orders.${action}`, workOrder.id), {}, {
            onSuccess: () => {
                toast.success(`Ordem de serviço ${action === 'approve' ? 'aprovada' : 'atualizada'} com sucesso!`);
            },
            onError: () => {
                toast.error(`Erro ao ${action === 'approve' ? 'aprovar' : 'atualizar'} ordem de serviço.`);
            },
        });
    };

    const handleWorkOrderCreated = () => {
        // This will be called after successful work order creation
        // The WorkOrderFormComponent will handle the redirect
    };

    // Define breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = useMemo(() => [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Ordens de Serviço',
            href: `/${discipline}/work-orders`,
        },
        {
            title: isCreating ? 'Nova Ordem' : workOrder?.work_order_number || 'Ordem de Serviço',
            href: '#',
        },
    ], [discipline, workOrder?.work_order_number, isCreating]);

    // Define tabs
    console.log('[show.tsx] Building tabs array');
    const tabs: any[] = [];

    if (isCreating) {
        // Only show the details tab when creating
        tabs.push({
            id: 'details',
            label: 'Informações Gerais',
            icon: <FileText className="h-4 w-4" />,
            content: (
                <div className="py-8">
                    <WorkOrderFormComponent
                        categories={categories}
                        workOrderTypes={workOrderTypes}
                        plants={plants}
                        areas={areas}
                        sectors={sectors}
                        assets={assets}
                        forms={forms}
                        discipline={discipline}
                        initialMode="edit"
                        onSuccess={handleWorkOrderCreated}
                    />
                </div>
            ),
        });
    } else {
        // Show all tabs for existing work orders
        // 1. Informações Gerais (always first) - using WorkOrderFormComponent in view mode
        tabs.push({
            id: 'details',
            label: 'Informações Gerais',
            icon: <FileText className="h-4 w-4" />,
            content: (
                <div className="py-8">
                    <WorkOrderFormComponent
                        workOrder={workOrder}
                        categories={categories}
                        workOrderTypes={workOrderTypes}
                        plants={plants}
                        areas={areas}
                        sectors={sectors}
                        assets={assets}
                        forms={forms}
                        discipline={discipline}
                        initialMode="view"
                        onSuccess={() => {
                            toast.success('Ordem de serviço atualizada com sucesso!');
                            router.reload();
                        }}
                    />
                </div>
            ),
        });

        // 2. Aprovação (always shown)
        console.log('[show.tsx] Adding approval tab', {
            workOrderStatus: workOrder.status,
            canApprove,
            approvalThreshold
        });
        tabs.push({
            id: 'approval',
            label: 'Aprovação',
            icon: <CheckCircle className="h-4 w-4" />,
            content: (
                <WorkOrderApprovalTab
                    workOrder={workOrder}
                    canApprove={canApprove}
                    approvalThreshold={approvalThreshold}
                    discipline={discipline}
                />
            ),
        });

        // 3. Planejamento (always shown)
        tabs.push({
            id: 'planning',
            label: 'Planejamento',
            icon: <Calendar className="h-4 w-4" />,
            content: (
                <WorkOrderPlanningTab
                    workOrder={workOrder}
                    technicians={technicians}
                    teams={teams}
                    parts={parts}
                    skills={skills}
                    certifications={certifications}
                    canPlan={canPlan}
                    discipline={discipline}
                    onGoToApproval={() => {
                        // Since we can't control the active tab, we'll show an alert
                        alert('Por favor, clique na aba "Aprovação" para aprovar esta ordem de serviço.');
                    }}
                />
            ),
        });

        // 4. Execução (always shown)
        tabs.push({
            id: 'execution',
            label: 'Execução',
            icon: <Play className="h-4 w-4" />,
            content: <WorkOrderExecutionTab workOrder={workOrder} />,
        });

        // Add failure analysis tab if it exists
        if (workOrder.failure_analysis) {
            tabs.push({
                id: 'analysis',
                label: 'Análise de Falha',
                icon: <Wrench className="h-4 w-4" />,
                content: <WorkOrderFailureAnalysisTab workOrder={workOrder} />,
            });
        }

        // Additional tabs (Histórico and Peças)
        tabs.push({
            id: 'history',
            label: 'Histórico',
            icon: <Activity className="h-4 w-4" />,
            content: <WorkOrderHistoryTab workOrder={workOrder} />,
        });

        tabs.push({
            id: 'parts',
            label: 'Peças',
            icon: <Package className="h-4 w-4" />,
            content: <WorkOrderPartsTab workOrder={workOrder} />,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Nova Ordem de Serviço' : `Ordem de Serviço ${workOrder?.work_order_number}`} />

            <ShowLayout
                title={isCreating ? 'Nova Ordem de Serviço' : workOrder?.work_order_number}
                subtitle={isCreating ? 'Criação de nova ordem de serviço' : workOrder?.title}
                editRoute={!isCreating && canEdit && workOrder?.status === 'requested' ? route(`${discipline}.work-orders.edit`, workOrder.id) : ''}
                tabs={tabs}
                defaultActiveTab="details"
                showEditButton={!isCreating && canEdit && workOrder?.status === 'requested'}
            />
        </AppLayout>
    );
} 