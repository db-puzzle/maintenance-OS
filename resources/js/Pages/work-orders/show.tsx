import React, { useMemo, useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { WorkOrder, WorkOrderCategory, WorkOrderType, Asset as WorkOrderAsset, Team, Form } from '@/types/work-order';
import { User } from '@/types';
import { Asset } from '@/types/asset-hierarchy';
import { Plant } from '@/types/entities/plant';
import { Area } from '@/types/entities/area';
import { Sector } from '@/types/entities/sector';
import { Part } from '@/types/maintenance';
import { Skill, Certification } from '@/types/entities/skill';
import {
    WorkOrderStatusProgress
} from '@/components/work-orders';

interface TabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}
import {
    WorkOrderApprovalTab,
    WorkOrderPlanningTab,
    WorkOrderScheduleTab,
    WorkOrderExecutionTab,
    WorkOrderHistoryTab,
    WorkOrderPartsTab,
    WorkOrderFailureAnalysisTab,
    WorkOrderGeneralTab
} from '@/components/work-orders/tabs';

import { type BreadcrumbItem } from '@/types';
import {
    Play,
    Calendar,
    Clock,
    Package,
    FileText,
    CheckCircle,
    Activity,
    Wrench
} from 'lucide-react';
interface Props {
    workOrder?: WorkOrder;
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
    technicians?: User[];
    teams?: Team[];
    parts?: Part[];
    skills?: Skill[];
    certifications?: Certification[];
    isCreating?: boolean;
    categories?: WorkOrderCategory[];
    workOrderTypes?: WorkOrderType[];
    plants?: Plant[];
    areas?: Area[];
    sectors?: Sector[];
    assets?: Asset[];
    forms?: Form[];
    preselectedAssetId?: string | number;
    preselectedAsset?: Asset;
}
export default function ShowWorkOrder({
    workOrder,
    discipline,
    canEdit,
    canApprove,
    canPlan,

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
    useEffect(() => {
        // Add error event listener to catch React errors
        const handleError = () => {
            // Error handling without logging
        };
        window.addEventListener('error', handleError);
        return () => {
            window.removeEventListener('error', handleError);
        };
    }, [workOrder?.id, workOrder?.status, isCreating]);

    const handleWorkOrderCreated = () => {
        // This will be called after successful work order creation
        // The page should redirect automatically via the controller
    };

    // If not creating and no workOrder provided, show error
    if (!isCreating && !workOrder) {
        return (
            <AppLayout breadcrumbs={[]}>
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Ordem de serviço não encontrada</p>
                </div>
            </AppLayout>
        );
    }

    // After this point, workOrder is guaranteed to be defined when not creating
    const definedWorkOrder = workOrder as WorkOrder;

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

    // Build tabs dynamically
    const tabs: TabItem[] = useMemo(() => {
        const tabs: TabItem[] = [];

        // If workOrder is undefined and we're not creating, return empty tabs
        if (!isCreating && !workOrder) {
            return [];
        }

        if (isCreating) {
            // Only show the details tab when creating
            tabs.push({
                id: 'details',
                label: 'Informações Gerais',
                icon: <FileText className="h-4 w-4" />,
                content: (
                    <WorkOrderGeneralTab
                        categories={categories}
                        workOrderTypes={workOrderTypes}
                        plants={plants}
                        areas={areas}
                        sectors={sectors}
                        assets={assets}
                        forms={forms}
                        discipline={discipline}
                        isCreating={true}
                        preselectedAssetId={preselectedAssetId}
                        preselectedAsset={preselectedAsset}
                        onWorkOrderCreated={handleWorkOrderCreated}
                    />
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
                            currentStatus={workOrder!.status}
                            workOrder={workOrder!}
                            onTabChange={(tabId) => {
                                setActiveTab(tabId);
                            }}
                        />
                    </div>
                ),
            });
            // 2. Informações Gerais - using WorkOrderGeneralTab component
            tabs.push({
                id: 'details',
                label: 'Informações Gerais',
                icon: <FileText className="h-4 w-4" />,
                content: (
                    <WorkOrderGeneralTab
                        workOrder={definedWorkOrder}
                        categories={categories}
                        workOrderTypes={workOrderTypes}
                        plants={plants}
                        areas={areas}
                        sectors={sectors}
                        assets={assets}
                        forms={forms}
                        discipline={discipline}
                        isCreating={false}
                    />
                ),
            });
            // 3. Aprovação (always shown)
            tabs.push({
                id: 'approval',
                label: 'Aprovação',
                icon: <CheckCircle className="h-4 w-4" />,
                content: (
                    <WorkOrderApprovalTab
                        workOrder={definedWorkOrder}
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
                        workOrder={definedWorkOrder}
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
            // 5. Agendamento (always shown)
            tabs.push({
                id: 'schedule',
                label: 'Agendamento',
                icon: <Clock className="h-4 w-4" />,
                content: (
                    <WorkOrderScheduleTab
                        workOrder={definedWorkOrder}
                        technicians={technicians}
                        teams={teams}
                        canSchedule={canPlan} // Using same permission as planning for now
                        discipline={discipline}
                    />
                ),
            });
            // 6. Execução (always shown)
            tabs.push({
                id: 'execution',
                label: 'Execução',
                icon: <Play className="h-4 w-4" />,
                content: <WorkOrderExecutionTab workOrder={definedWorkOrder} />,
            });
            // Add failure analysis tab if it exists
            if (workOrder?.failure_analysis) {
                tabs.push({
                    id: 'analysis',
                    label: 'Análise de Falha',
                    icon: <Wrench className="h-4 w-4" />,
                    content: <WorkOrderFailureAnalysisTab workOrder={definedWorkOrder} />,
                });
            }
            // Additional tabs (Histórico and Peças)
            tabs.push({
                id: 'history',
                label: 'Histórico',
                icon: <Activity className="h-4 w-4" />,
                content: <WorkOrderHistoryTab workOrder={definedWorkOrder} />,
            });
            tabs.push({
                id: 'parts',
                label: 'Peças',
                icon: <Package className="h-4 w-4" />,
                content: <WorkOrderPartsTab workOrder={definedWorkOrder} />,
            });
        }
        return tabs;
    }, [
        isCreating,
        workOrder,
        categories,
        workOrderTypes,
        plants,
        areas,
        sectors,
        assets,
        forms,
        discipline,
        technicians,
        teams,
        parts,
        skills,
        certifications,
        canPlan,
        canApprove,
        approvalThreshold,
        activeTab,
        setActiveTab,
        handleWorkOrderCreated,
        workOrder?.failure_analysis,
    ]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Nova Ordem de Serviço' : `Ordem de Serviço ${workOrder?.work_order_number || ''}`} />
            <ShowLayout
                title={isCreating ? 'Nova Ordem de Serviço' : definedWorkOrder?.work_order_number || ''}
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