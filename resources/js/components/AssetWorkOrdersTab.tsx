import React, { useState, useEffect } from 'react';
import { ColumnVisibility } from '@/components/data-table';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkOrderStatusBadge } from '@/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityIndicator } from '@/components/work-orders/WorkOrderPriorityIndicator';
import { type ColumnConfig } from '@/types/shared';
import { WorkOrderStatus } from '@/types/work-order';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
    assetId: number;
    discipline?: 'maintenance' | 'quality';
    userPermissions: string[];
    isCompressed?: boolean;
}

interface WorkOrder extends Record<string, unknown> {
    id: number;
    work_order_number: string;
    title: string;
    description?: string;
    status: string;
    priority_score: number;
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
    executor_name?: string;
}



export default function AssetWorkOrdersTab({ assetId, discipline = 'maintenance', userPermissions, isCompressed = false }: Props) {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
    });

    const canCreateWorkOrder = userPermissions.includes('work-orders.create');
    const canViewWorkOrder = userPermissions.includes('work-orders.view');

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('workOrderColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            work_order_number: true,
            title: true,
            priority_score: true,
            status: true,
            executor_name: true,
            scheduled_start_date: true,
            created_at: true,
        };
    });

    // Fetch work orders for this asset
    const fetchWorkOrders = async (page = 1, searchQuery = search) => {
        setLoading(true);
        try {
            const response = await axios.get(route('asset-hierarchy.assets.work-orders', assetId), {
                params: {
                    page,
                    per_page: 10,
                    search: searchQuery,
                },
            });

            // Check if response.data.data exists and is an array
            if (!response.data.data || !Array.isArray(response.data.data)) {
                setWorkOrders([]);
                setPagination({
                    current_page: 1,
                    last_page: 1,
                    per_page: 10,
                    total: 0,
                    from: 0,
                    to: 0,
                });
                return;
            }

            // Transform the response data to match our interface
            const transformedData = response.data.data.map((item: WorkOrder) => ({
                id: item.work_order_id || item.id,
                work_order_number: item.work_order_number || `#${item.work_order_id || item.id}`,
                title: item.routine_name || item.title || 'Ordem de Serviço',
                status: item.status,
                priority_score: item.priority_score || 50,
                scheduled_start_date: item.scheduled_start_date,
                actual_start_date: item.started_at,
                actual_end_date: item.completed_at,
                created_at: item.created_at,
                executor_name: item.executor_name,
                requestedBy: item.requestedBy,
                assignedTechnician: item.executor ? {
                    id: (item.executor as unknown).id,
                    name: (item.executor as unknown).name,
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
            key: 'priority_score',
            label: 'Prioridade',
            render: (value) => (
                <WorkOrderPriorityIndicator
                    priorityScore={(value as number) || 50}
                    showLabel={false}
                />
            ),
            width: 'w-[80px]',
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <WorkOrderStatusBadge status={value as WorkOrderStatus} />,
            width: 'w-[150px]',
        },
        {
            key: 'executor_name',
            label: 'Executor',
            render: (value, row) => ((row as WorkOrder).assignedTechnician?.name || value || '-') as React.ReactNode,
            width: 'w-[150px]',
        },
        {
            key: 'scheduled_start_date',
            label: 'Data Programada',
            render: (value) => {
                if (!value) return '-';
                try {
                    const date = new Date(value as string | number | Date);
                    if (isNaN(date.getTime())) return '-';
                    return format(date, 'dd/MM/yyyy', { locale: ptBR });
                } catch {
                    return '-';
                }
            },
            sortable: true,
            width: 'w-[130px]',
        },
        {
            key: 'created_at',
            label: 'Criada em',
            render: (value) => {
                if (!value) return '-';
                try {
                    const date = new Date(value as string | number | Date);
                    if (isNaN(date.getTime())) return '-';
                    return format(date, 'dd/MM/yyyy', { locale: ptBR });
                } catch {
                    return '-';
                }
            },
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

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchWorkOrders(1, value);
    };

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('workOrderColumnsVisibility', JSON.stringify(newVisibility));
    };



    return (
        <div className="space-y-6">
            {/* Header with search and actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                    <div className={cn(
                        "relative transition-all duration-200",
                        isCompressed ? "w-[300px]" : "w-[380px]"
                    )}>
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar ordens de serviço..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className={cn(
                                "pl-10 transition-all duration-200",
                                isCompressed ? "h-8 text-sm" : "h-10"
                            )}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ColumnVisibility
                        columns={columns.map((col) => ({
                            id: col.key,
                            header: col.label,
                            cell: () => null,
                            width: 'w-auto',
                        }))}
                        columnVisibility={columnVisibility}
                        onColumnVisibilityChange={handleColumnVisibilityChange}
                    />
                    {canCreateWorkOrder && (
                        <Button onClick={handleNewWorkOrder} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Ordem de Serviço
                        </Button>
                    )}
                </div>
            </div>

            {/* Work orders table */}
            <div className="space-y-4">
                <EntityDataTable
                    data={workOrders}
                    columns={columns}
                    loading={loading}
                    onRowClick={canViewWorkOrder ? handleRowClick : undefined}
                    emptyMessage="Nenhuma ordem de serviço encontrada"
                    onSort={handleSort}
                    columnVisibility={columnVisibility}
                />

                <EntityPagination
                    pagination={{
                        current_page: pagination.current_page,
                        last_page: pagination.last_page,
                        per_page: pagination.per_page,
                        total: pagination.total,
                        from: pagination.from,
                        to: pagination.to,
                    }}
                    onPageChange={handlePageChange}
                />
            </div>
        </div>
    );
}