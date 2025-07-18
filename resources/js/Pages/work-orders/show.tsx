import React, { useMemo, useEffect, useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import {
    WorkOrderStatusBadge,
    WorkOrderPriorityIndicator,
    WorkOrderFormComponent,
    WorkOrderStatusProgress
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
    preselectedAssetId?: string | number;
    preselectedAsset?: any;
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
    forms = [],
    preselectedAssetId,
    preselectedAsset
}: Props) {
    const [activeTab, setActiveTab] = useState('details');

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

    // Helper function to get tab label by ID
    const getTabLabelById = (tabId: string): string => {
        const tabMapping: Record<string, string> = {
            'details': 'Informações Gerais',
            'status': 'Status',
            'approval': 'Aprovação',
            'planning': 'Planejamento',
            'execution': 'Execução',
            'analysis': 'Análise de Falha',
            'history': 'Histórico',
            'parts': 'Peças'
        };
        return tabMapping[tabId] || tabId;
    };

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
                        preselectedAssetId={preselectedAssetId}
                        preselectedAsset={preselectedAsset}
                    />
                </div>
            ),
        });
    } else {
        // Show all tabs for existing work orders
        // 1. Status (progress tracking) - now first
        tabs.push({
            id: 'status',
            label: 'Status',
            icon: <Activity className="h-4 w-4" />,
            content: (
                <div className="py-8">
                    <WorkOrderStatusProgress
                        currentStatus={workOrder.status}
                        workOrder={workOrder}
                        onTabChange={(tabId) => {
                            setActiveTab(tabId);
                        }}
                    />
                </div>
            ),
        });

        // 2. Informações Gerais - using WorkOrderFormComponent in view mode
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

        // 3. Aprovação (always shown)
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

        // 4. Planejamento (always shown)
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
                        setActiveTab('approval');
                    }}
                />
            ),
        });

        // 5. Execução (always shown)
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
                subtitle={
                    isCreating ? (
                        'Criação de nova ordem de serviço'
                    ) : workOrder?.asset ? (
                        <Link
                            href={route('asset-hierarchy.assets.show', workOrder.asset.id)}
                            className="text-muted-foreground hover:underline"
                        >
                            {workOrder.asset.tag}
                        </Link>
                    ) : (
                        workOrder?.title
                    )
                }
                editRoute={!isCreating && canEdit && workOrder?.status === 'requested' ? route(`${discipline}.work-orders.edit`, workOrder.id) : ''}
                tabs={tabs}
                defaultActiveTab="details"
                showEditButton={!isCreating && canEdit && workOrder?.status === 'requested'}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
            />
        </AppLayout>
    );
} 