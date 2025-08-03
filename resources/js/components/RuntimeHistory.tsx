import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Clock, TrendingUp, User, Calendar, Edit3, Gauge } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import EmptyCard from '@/components/ui/empty-card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface RuntimeMeasurement {
    id: number;
    asset_id: number;
    user_id: number;
    user?: {
        id: number;
        name: string;
    };
    reported_hours: number;
    source: 'manual' | 'shift_change' | 'shift_update' | 'iot' | 'api';
    notes?: string;
    measurement_datetime: string;
    created_at: string;
    updated_at: string;
    previous_hours: number;
    hours_difference: number;
}
interface RuntimeHistoryProps {
    assetId: number;
    activeTab?: string;
    parentVisible?: boolean;
}
export default function RuntimeHistory({ assetId, activeTab, parentVisible = false }: RuntimeHistoryProps) {
    const [loading, setLoading] = useState(false);
    const [measurements, setMeasurements] = useState<{
        data: RuntimeMeasurement[];
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
        sort: 'measurement_datetime',
        direction: 'desc' as 'asc' | 'desc',
        per_page: 10,
    });
    const fetchMeasurements = useCallback(async () => {
        if (!assetId) return;
        setLoading(true);
        try {
            const response = await axios.get(route('asset-hierarchy.assets.runtime.history', assetId), {
                params: {
                    page: measurements.current_page,
                    per_page: filters.per_page,
                    sort: filters.sort,
                    direction: filters.direction,
                },
            });
            setMeasurements(response.data);
        } catch (error: any) {
            if (error.response?.status === 500) {
                toast.error('Erro no servidor ao carregar histórico de horímetro');
            } else {
                toast.error('Erro ao carregar histórico de horímetro');
            }
            // Set empty data to avoid rendering errors
            setMeasurements({
                data: [],
                current_page: 1,
                last_page: 1,
                per_page: 10,
                total: 0,
                from: null,
                to: null,
            });
        } finally {
            setLoading(false);
        }
    }, [assetId, measurements.current_page, filters.per_page, filters.sort, filters.direction]);
    useEffect(() => {
        if (assetId) {
            fetchMeasurements();
        }
    }, [assetId, fetchMeasurements]);
    // Fetch data when both parent is visible and we're on the horimetro tab
    useEffect(() => {
        if (activeTab === 'horimetro' && parentVisible && assetId) {
            fetchMeasurements();
        }
    }, [activeTab, parentVisible, assetId]);
    const handleSort = (column: string) => {
        const newDirection = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        setFilters({
            ...filters,
            sort: column,
            direction: newDirection,
        });
    };
    const handlePageChange = (page: number) => {
        setMeasurements(prev => ({ ...prev, current_page: page }));
    };
    const handlePerPageChange = (perPage: number) => {
        setFilters(prev => ({ ...prev, per_page: perPage }));
        setMeasurements(prev => ({ ...prev, current_page: 1 }));
    };
    const getSourceBadge = (source: string) => {
        const badges = {
            manual: { label: 'Manual', className: 'bg-blue-100 text-blue-800' },
            shift_change: { label: 'Mudança de Turno', className: 'bg-yellow-100 text-yellow-800' },
            shift_update: { label: 'Atualização de Turno', className: 'bg-orange-100 text-orange-800' },
            iot: { label: 'IoT', className: 'bg-purple-100 text-purple-800' },
            api: { label: 'API', className: 'bg-green-100 text-green-800' },
        };
        const badge = badges[source as keyof typeof badges] || { label: source, className: 'bg-gray-100 text-gray-800' };
        return <Badge className={badge.className}>{badge.label}</Badge>;
    };
    const formatDateTime = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return '-';
        }
    };
    const columns = [
        {
            key: 'measurement_datetime',
            label: 'Data da Medição',
            sortable: true,
            width: 'w-[180px]',
            render: (value: unknown) => formatDateTime(value as string),
        },
        {
            key: 'created_at',
            label: 'Data do Reporte',
            sortable: true,
            width: 'w-[180px]',
            render: (value: unknown) => formatDateTime(value as string),
        },
        {
            key: 'reported_hours',
            label: 'Horímetro',
            sortable: true,
            width: 'w-[120px]',
            render: (value: unknown, row: unknown) => {
                const measurement = row as RuntimeMeasurement;
                const hours = typeof measurement.reported_hours === 'number'
                    ? measurement.reported_hours
                    : parseFloat(measurement.reported_hours as any) || 0;
                return (
                    <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{hours.toFixed(1)}h</span>
                    </div>
                );
            },
        },
        {
            key: 'hours_difference',
            label: 'Diferença',
            sortable: false,
            width: 'w-[120px]',
            render: (value: unknown, row: unknown) => {
                const measurement = row as RuntimeMeasurement;
                const diff = typeof measurement.hours_difference === 'number'
                    ? measurement.hours_difference
                    : parseFloat(measurement.hours_difference as any) || 0;
                const isPositive = diff > 0;
                const isNegative = diff < 0;
                return (
                    <div className={`flex items-center gap-1 ${isNegative ? 'text-red-600' :
                        isPositive ? 'text-green-600' :
                            'text-muted-foreground'
                        }`}>
                        <span className="font-mono">{isPositive ? '+' : ''}{diff.toFixed(1)}h</span>
                    </div>
                );
            },
        },
        {
            key: 'source',
            label: 'Origem',
            sortable: true,
            width: 'w-[160px]',
            render: (value: unknown) => getSourceBadge(value as string),
        },
        {
            key: 'user',
            label: 'Reportado por',
            sortable: false,
            width: 'w-[150px]',
            render: (_value: unknown, row: unknown) => {
                const measurement = row as RuntimeMeasurement;
                return measurement.user ? (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{measurement.user.name}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">Sistema</span>
                );
            },
        },
        {
            key: 'notes',
            label: 'Observações',
            sortable: false,
            render: (value: unknown) => {
                const notes = value as string;
                return notes ? (
                    <span className="text-sm text-muted-foreground truncate max-w-[300px] block" title={notes}>
                        {notes}
                    </span>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
    ];
    if (!assetId) {
        return (
            <EmptyCard
                icon={Clock}
                title="Nenhum ativo selecionado"
                description="Selecione um ativo para visualizar o histórico de horímetro"
            />
        );
    }
    if (measurements.data.length === 0 && !loading) {
        return (
            <EmptyCard
                icon={Gauge}
                title="Nenhuma medição registrada"
                description="Ainda não há registros de horímetro para este ativo"
            />
        );
    }
    return (
        <div className="space-y-4">
            <EntityDataTable
                data={measurements.data as unknown as Record<string, unknown>[]}
                columns={columns}
                loading={loading}
                onSort={handleSort}
            />
            <EntityPagination
                pagination={{
                    current_page: measurements.current_page,
                    last_page: measurements.last_page,
                    per_page: measurements.per_page,
                    total: measurements.total,
                    from: measurements.from,
                    to: measurements.to,
                }}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
            />
        </div>
    );
} 