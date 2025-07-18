import React, { useState, useEffect } from 'react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import EmptyCard from '@/components/ui/empty-card';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { type ColumnConfig } from '@/types/shared';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Eye, FileText, Edit } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';

interface Props {
    assetId: number;
    discipline?: 'maintenance' | 'quality';
    userPermissions: string[];
}

interface WorkOrder {
    id: number;
    work_order_number: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    work_order_category?: string;
    type?: {
        id: number;
        name: string;
    };
    requestedBy?: {
        id: number;
        name: string;
    };
    assignedTechnician?: {
        id: number;
        name: string;
    };
    scheduled_start_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    created_at: string;
    work_order_category_obj?: {
        id: number;
        name: string;
        color: string;
    };
}

interface PaginatedResponse {
    data: WorkOrder[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export default function AssetWorkOrdersTab({ assetId, discipline = 'maintenance', userPermissions }: Props) {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
    });

    const canCreateWorkOrder = userPermissions.includes('create_work_orders');
    const canViewWorkOrder = userPermissions.includes('view_work_orders');
    const canEditWorkOrder = userPermissions.includes('edit_work_orders');

    // Fetch work orders for this asset
    const fetchWorkOrders = async (page = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(route('asset-hierarchy.assets.work-orders', assetId), {
                params: {
                    page,
                    per_page: 10,
                },
            });

            // Transform the response data to match our interface
            const transformedData = response.data.data.map((item: any) => ({
                id: item.work_order_id || item.id,
                work_order_number: item.work_order_number || `#${item.work_order_id || item.id}`,
                title: item.routine_name || item.title || 'Ordem de Serviço',
                status: item.status,
                priority: item.priority || 'medium',
                scheduled_start_date: item.scheduled_start_date,
                actual_start_date: item.started_at,
                actual_end_date: item.completed_at,
                created_at: item.created_at,
                executor_name: item.executor_name,
                requestedBy: item.requestedBy,
                assignedTechnician: item.executor ? {
                    id: item.executor.id,
                    name: item.executor.name,
                } : undefined,
            }));

            setWorkOrders(transformedData);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                per_page: response.data.per_page,
                total: response.data.total,
                from: response.data.from || 0,
                to: response.data.to || 0,
            });
        } catch (error) {
            console.error('Error fetching work orders:', error);
            toast.error('Erro ao carregar ordens de serviço');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkOrders();
    }, [assetId]);

    // Column configuration
    const columns: ColumnConfig[] = [
        {
            key: 'work_order_number',
            label: 'Número',
            sortable: true,
            width: 'w-[120px]',
            render: (value) => value as React.ReactNode,
        },
        {
            key: 'title',
            label: 'Título',
            sortable: true,
            render: (value) => value as React.ReactNode,
        },
        {
            key: 'priority',
            label: 'Prioridade',
            render: (value: any) => <WorkOrderPriorityIndicator priority={value} showLabel={false} />,
            width: 'w-[80px]',
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: any) => <WorkOrderStatusBadge status={value} />,
            width: 'w-[150px]',
        },
        {
            key: 'executor_name',
            label: 'Executor',
            render: (value: any, row: any) => (row.assignedTechnician?.name || value || '-') as React.ReactNode,
            width: 'w-[150px]',
        },
        {
            key: 'scheduled_start_date',
            label: 'Data Programada',
            render: (value: any) => value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : '-',
            sortable: true,
            width: 'w-[130px]',
        },
        {
            key: 'created_at',
            label: 'Criada em',
            render: (value: any) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }),
            sortable: true,
            width: 'w-[130px]',
        },
    ];

    const handlePageChange = (page: number) => {
        fetchWorkOrders(page);
    };

    const handleSort = (columnKey: string) => {
        // TODO: Implement sorting
        console.log('Sort by:', columnKey);
    };

    const handleRowClick = (workOrder: WorkOrder) => {
        if (canViewWorkOrder) {
            router.visit(route(`${discipline}.work-orders.show`, workOrder.id));
        }
    };

    const handleNewWorkOrder = () => {
        // Navigate to work order creation with the asset pre-selected
        router.visit(route(`${discipline}.work-orders.show`, { 
            workOrder: 'new',
            asset_id: assetId 
        }));
    };

    const renderActions = (workOrder: WorkOrder) => {
        const actions = [];

        if (canViewWorkOrder) {
            actions.push({
                label: 'Visualizar',
                icon: Eye,
                onClick: () => router.visit(route(`${discipline}.work-orders.show`, workOrder.id)),
            });
        }

        if (canEditWorkOrder && workOrder.status === 'requested') {
            actions.push({
                label: 'Editar',
                icon: Edit,
                onClick: () => router.visit(route(`${discipline}.work-orders.edit`, workOrder.id)),
            });
        }

        return actions.length > 0 ? <EntityActionDropdown actions={actions} /> : null;
    };

    return (
        <div className="space-y-4">
            {/* Header with title and new button */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ordens de Serviço</h3>
                {canCreateWorkOrder && (
                    <Button onClick={handleNewWorkOrder} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Ordem de Serviço
                    </Button>
                )}
            </div>

            {/* Work orders table or empty state */}
            {workOrders.length === 0 && !loading ? (
                <EmptyCard
                    icon={FileText}
                    title="Nenhuma ordem de serviço"
                    description="Não há ordens de serviço registradas para este ativo"
                    primaryButtonText={canCreateWorkOrder ? "Nova ordem de serviço" : undefined}
                    primaryButtonAction={canCreateWorkOrder ? handleNewWorkOrder : undefined}
                />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <EntityDataTable
                            data={workOrders}
                            columns={columns}
                            loading={loading}
                            onRowClick={canViewWorkOrder ? handleRowClick : undefined}
                            actions={renderActions}
                            emptyMessage="Nenhuma ordem de serviço encontrada"
                            onSort={handleSort}
                        />
                        {!loading && workOrders.length > 0 && (
                            <div className="border-t p-4">
                                <EntityPagination
                                    currentPage={pagination.current_page}
                                    lastPage={pagination.last_page}
                                    perPage={pagination.per_page}
                                    total={pagination.total}
                                    from={pagination.from}
                                    to={pagination.to}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}