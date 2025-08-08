import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Calendar, ClipboardCheck, Eye, FileText, Shield, Gauge } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { Badge } from '@/components/ui/badge';
import { useExportManager } from '@/hooks/use-export-manager';
import { toast } from 'sonner';
import EmptyCard from '@/components/ui/empty-card';
import RuntimeHistory from '@/components/RuntimeHistory';
interface ExecutionData {
    id: number | string;
    work_order_id?: number;
    routine?: {
        id: number;
        name: string;
        description?: string;
    } | null;
    routine_name?: string;
    executor?: {
        id: number;
        name: string;
    } | null;
    executor_name?: string;
    form_version?: {
        id: number;
        version_number: string;
        published_at: string;
    } | null;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    duration_minutes: number | null;
    progress: number;
    task_summary?: {
        total: number;
        completed: number;
        with_issues: number;
    };
}
interface ExecutionHistoryProps {
    assetId?: number;
}
export default function ExecutionHistory({ assetId }: ExecutionHistoryProps) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('executions');
    const [isParentVisible, setIsParentVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [executions, setExecutions] = useState<{
        data: ExecutionData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    }>({
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: null,
        to: null,
    });
    const [filters, setFilters] = useState({
        sort: 'started_at',
        direction: 'desc' as 'asc' | 'desc',
        per_page: 10,
    });
    const _ = useExportManager();
    // Detect when the parent Histórico tab becomes visible
    useEffect(() => {
        const currentElement = containerRef.current;
        if (!currentElement) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsParentVisible(entry.isIntersecting);
                });
            },
            {
                threshold: 0.1,
            }
        );
        observer.observe(currentElement);
        return () => {
            observer.unobserve(currentElement);
        };
    }, []);
    const fetchExecutions = useCallback(async () => {
        if (!assetId) return;
        setLoading(true);
        try {
            const response = await axios.get(route('asset-hierarchy.assets.work-order-history', assetId), {
                params: {
                    page: executions.current_page,
                    per_page: filters.per_page,
                    sort: filters.sort,
                    direction: filters.direction,
                    category: 'preventive',
                },
            });
            // Transform work order data to match the expected execution format
            // Handle the response structure from the API
            let workOrdersData = [];
            let paginationInfo = null;
            if (response.data.success && response.data.data) {
                // The actual work orders are in response.data.data.data
                workOrdersData = response.data.data.data || [];
                paginationInfo = response.data.data;
            } else if (Array.isArray(response.data)) {
                workOrdersData = response.data;
            }
            const transformedData = Array.isArray(workOrdersData) ? workOrdersData.map((workOrder: any) => ({
                id: workOrder.execution?.id || workOrder.id,
                work_order_id: workOrder.id,
                routine_name: workOrder.title,
                executor_name: workOrder.execution?.executedBy?.name || 'N/A',
                status: workOrder.execution?.status || 'pending',
                started_at: workOrder.execution?.started_at || workOrder.actual_start_date,
                completed_at: workOrder.execution?.completed_at || workOrder.actual_end_date,
                duration_minutes: workOrder.execution?.started_at && workOrder.execution?.completed_at
                    ? Math.floor((new Date(workOrder.execution.completed_at).getTime() - new Date(workOrder.execution.started_at).getTime()) / 60000)
                    : null,
                progress: workOrder.execution?.status === 'completed' ? 100 : 50,
                form_version: workOrder.form_version_id ? {
                    id: workOrder.form_version_id,
                    version_number: 'v1.0',
                    published_at: workOrder.created_at
                } : null,
            })) : [];
            // Use pagination info if available, otherwise use defaults
            const finalPaginationData = paginationInfo || {
                current_page: 1,
                last_page: 1,
                per_page: 10,
                total: transformedData.length,
                from: transformedData.length > 0 ? 1 : null,
                to: transformedData.length,
            };
            setExecutions({
                data: transformedData,
                current_page: finalPaginationData.current_page || 1,
                last_page: finalPaginationData.last_page || 1,
                per_page: finalPaginationData.per_page || 10,
                total: finalPaginationData.total || 0,
                from: finalPaginationData.from || null,
                to: finalPaginationData.to || null,
            });
        } catch (error) {
            console.error('Error fetching executions:', error);
            toast.error('Erro ao carregar histórico de execuções');
        } finally {
            setLoading(false);
        }
    }, [assetId, executions.current_page, filters.per_page, filters.sort, filters.direction]);
    useEffect(() => {
        if (assetId) {
            fetchExecutions();
        }
    }, [assetId, fetchExecutions]);
    const handleSort = (column: string) => {
        const newDirection = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        setFilters({
            ...filters,
            sort: column,
            direction: newDirection,
        });
    };
    const handlePageChange = (page: number) => {
        setExecutions(prev => ({ ...prev, current_page: page }));
    };
    const handlePerPageChange = (perPage: number) => {
        setFilters(prev => ({ ...prev, per_page: perPage }));
        setExecutions(prev => ({ ...prev, current_page: 1 }));
    };
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('pt-BR');
    };
    const handleExportSingle = async (executionId: number) => {
        // For now, disable export functionality until work order export is implemented
        toast.info('Exportação de ordens de serviço será implementada em breve');
        return;
        /* TODO: Implement work order export
        try {
            const response = await fetch(`/maintenance/work-orders/${executionId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    format: 'pdf',
                    template: 'standard',
                    include_images: true,
                    compress_images: true,
                    include_signatures: false,
                    paper_size: 'A4',
                    delivery: {
                        method: 'download',
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Export failed: ${response.statusText}`);
            }
            // Find the execution data to get the routine name
            const execution = executions.data.find(e => e.id === executionId);
            const description = execution
                ? `Execution #${executionId} - ${execution.routine?.name || execution.routine_name || 'Sem nome'}`
                : `Execution #${executionId}`;
            // Add to export manager
            addExport({
                id: data.export_id,
                type: 'single',
                description,
                status: 'processing',
                progress: 0,
            });
            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/maintenance/routines/exports/${data.export_id}/status`, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const statusData = await statusResponse.json();
                    // Update progress in export manager
                    if (statusData.progress_percentage) {
                        updateExport(data.export_id, {
                            progress: statusData.progress_percentage,
                        });
                    }
                    if (statusData.status === 'completed' && statusData.download_url) {
                        clearInterval(pollInterval);
                        // Update export manager with completion
                        updateExport(data.export_id, {
                            status: 'completed',
                            downloadUrl: statusData.download_url,
                            completedAt: new Date(),
                        });
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        // Update export manager with failure
                        updateExport(data.export_id, {
                            status: 'failed',
                            error: 'The export process failed. Please try again.',
                        });
                    }
                } catch (error) {
                    console.error('Status polling error:', error);
                }
            }, 2000);
            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 300000);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while exporting');
        }
        */
    };
    const columns = [
        {
            key: 'id',
            label: 'ID',
            sortable: true,
            width: 'w-[80px]',
            render: (value: unknown) => `#${value}`,
        },
        {
            key: 'routine_name',
            label: 'Rotina',
            sortable: true,
            width: 'w-[200px]',
            render: (value: unknown, row: unknown) => {
                const execution = row as ExecutionData;
                // Handle both nested and flat data structures
                const routineName = execution.routine?.name || execution.routine_name;
                const routineDescription = execution.routine?.description;
                if (!routineName) {
                    return <div className="text-muted-foreground">N/A</div>;
                }
                return (
                    <div>
                        <div className="font-medium">{routineName}</div>
                        {routineDescription && (
                            <div className="text-muted-foreground text-sm">{routineDescription}</div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'executor_name',
            label: 'Executor',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown, row: unknown) => {
                const execution = row as ExecutionData;
                // Handle both nested and flat data structures
                const executorName = execution.executor?.name || execution.executor_name;
                if (!executorName) {
                    return 'N/A';
                }
                return executorName;
            },
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value: unknown, row: unknown) => {
                const execution = row as ExecutionData;
                return (
                    <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(execution.status)}>{execution.status.replace('_', ' ')}</Badge>
                        {execution.status === 'in_progress' && (
                            <span className="text-muted-foreground text-xs">{execution.progress}%</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'started_at',
            label: 'Iniciado em',
            sortable: true,
            width: 'w-[180px]',
            render: (value: unknown) => formatDate(value as string | null),
        },
        {
            key: 'form_version',
            label: 'Versão',
            sortable: false,
            width: 'w-[120px]',
            render: (value: unknown, row: unknown) => {
                const execution = row as ExecutionData;
                if (!execution.form_version) {
                    return <span className="text-muted-foreground text-sm">N/A</span>;
                }
                return <span className="font-mono text-sm">{execution.form_version.version_number}</span>;
            },
        },
    ];
    if (!assetId) {
        return (
            <EmptyCard
                icon={Calendar}
                title="Nenhum ativo selecionado"
                description="Selecione um ativo para visualizar o histórico de execuções"
                primaryButtonText=""
                primaryButtonAction={() => { }}
            />
        );
    }
    return (
        <div ref={containerRef} className="space-y-4">
            <Tabs defaultValue="executions" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="executions" className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Ordens de Serviço
                    </TabsTrigger>
                    <TabsTrigger value="horimetro" className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Horímetro
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Auditoria
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="executions" className="mt-4">
                    {executions.data.length === 0 && !loading ? (
                        <EmptyCard
                            icon={Calendar}
                            title="Nenhuma ordem de serviço registrada"
                            description="Ainda não há ordens de serviço para este ativo"
                            primaryButtonText=""
                            primaryButtonAction={() => { }}
                        />
                    ) : (
                        <>
                            <div className="space-y-4">
                                <EntityDataTable
                                    data={executions.data as unknown as Record<string, unknown>[]}
                                    columns={columns}
                                    loading={loading}
                                    onRowClick={(execution) => {
                                        const exec = execution as unknown as ExecutionData & { work_order_id?: number };
                                        if (exec.work_order_id) {
                                            router.visit(`/maintenance/work-orders/${exec.work_order_id}`);
                                        }
                                    }}
                                    onSort={handleSort}
                                    actions={(execution) => {
                                        const exec = execution as unknown as ExecutionData & { work_order_id?: number };
                                        return (
                                            <EntityActionDropdown
                                                additionalActions={[
                                                    {
                                                        label: 'Visualizar',
                                                        icon: <Eye className="h-4 w-4" />,
                                                        onClick: () => {
                                                            if (exec.work_order_id) {
                                                                router.visit(`/maintenance/work-orders/${exec.work_order_id}`);
                                                            }
                                                        },
                                                    },
                                                    {
                                                        label: 'Exportar PDF',
                                                        icon: <FileText className="h-4 w-4" />,
                                                        onClick: () => handleExportSingle(Number(exec.id)),
                                                    },
                                                ]}
                                            />
                                        );
                                    }}
                                />
                                <EntityPagination
                                    pagination={{
                                        current_page: executions.current_page,
                                        last_page: executions.last_page,
                                        per_page: executions.per_page,
                                        total: executions.total,
                                        from: executions.from,
                                        to: executions.to,
                                    }}
                                    onPageChange={handlePageChange}
                                    onPerPageChange={handlePerPageChange}
                                />
                            </div>
                        </>
                    )}
                </TabsContent>
                <TabsContent value="horimetro" className="mt-4">
                    <RuntimeHistory assetId={assetId} activeTab={activeTab} parentVisible={isParentVisible} />
                </TabsContent>
                <TabsContent value="audit" className="mt-4">
                    <EmptyCard
                        icon={Shield}
                        title="Auditoria em desenvolvimento"
                        description="O histórico de auditoria para este ativo estará disponível em breve"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
} 