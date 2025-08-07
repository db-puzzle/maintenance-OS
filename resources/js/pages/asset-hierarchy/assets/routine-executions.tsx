import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { type WorkOrder } from '@/types/work-order';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Clock, FileText, User } from 'lucide-react';
interface Routine {
    id: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    form?: {
        id: number;
        name: string;
    };
}
interface Props {
    asset: Asset;
    routine: Routine;
    workOrders: {
        data: WorkOrder[];
        current_page: number;
        last_page: number;
        total: number;
    };
}
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ativos',
        href: '/asset-hierarchy/assets',
    },
    {
        title: 'Detalhes do Ativo',
        href: '#',
    },
    {
        title: 'Ordens de Trabalho da Rotina',
        href: '#',
    },
];
export default function RoutineWorkOrders({ asset, routine, workOrders }: Props) {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                        Concluída
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        Em Andamento
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="default" className="bg-gray-100 text-gray-800">
                        Pendente
                    </Badge>
                );
            case 'approved':
                return (
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                        Aprovada
                    </Badge>
                );
            case 'cancelled':
                return <Badge variant="destructive">Cancelada</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };
    const getTriggerInfo = () => {
        if (routine.trigger_type === 'runtime_hours') {
            return `${routine.trigger_runtime_hours} horas de operação`;
        } else {
            return `${routine.trigger_calendar_days} dias`;
        }
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ordens de Trabalho - ${routine.name}`} />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Link href={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' })}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Voltar
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold">Ordens de Trabalho da Rotina</h1>
                        <p className="text-muted-foreground">
                            {routine.name} • {asset.tag}
                        </p>
                    </div>
                </div>
                {/* Estatísticas */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-muted-foreground text-sm">Total de Ordens</p>
                                    <p className="text-2xl font-bold">{workOrders.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-muted-foreground text-sm">Frequência</p>
                                    <p className="text-sm font-medium">{getTriggerInfo()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="text-muted-foreground text-sm">Formulário</p>
                                    <p className="text-sm font-medium">{routine.form?.name || 'Não configurado'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Lista de Ordens de Trabalho */}
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Ordens de Trabalho</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {workOrders.data.length === 0 ? (
                            <div className="py-8 text-center">
                                <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                <h3 className="mb-2 text-lg font-semibold">Nenhuma ordem encontrada</h3>
                                <p className="text-muted-foreground">Esta rotina ainda não gerou ordens de trabalho.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {workOrders.data.map((workOrder) => (
                                    <div key={workOrder.id} className="rounded-lg border p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="text-muted-foreground h-5 w-5" />
                                                <div>
                                                    <Link
                                                        href={route('work-orders.show', workOrder.id)}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {workOrder.title}
                                                    </Link>
                                                    <p className="text-muted-foreground text-sm">
                                                        Criada em {formatDate(workOrder.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">{getStatusBadge(workOrder.status)}</div>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                            {workOrder.assigned_technician && (
                                                <div className="flex items-center gap-1">
                                                    <User className="h-4 w-4" />
                                                    {workOrder.assigned_technician.name}
                                                </div>
                                            )}
                                            {workOrder.requested_due_date && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    Vence em {formatDate(workOrder.requested_due_date)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* Paginação */}
                {workOrders.last_page > 1 && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: workOrders.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={`/asset-hierarchy/assets/${asset.id}/routines/${routine.id}/work-orders?page=${page}`}
                                    className={`rounded px-3 py-1 ${page === workOrders.current_page ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    {page}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
