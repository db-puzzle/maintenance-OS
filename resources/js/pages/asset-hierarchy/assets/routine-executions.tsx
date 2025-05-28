import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

interface RoutineExecution {
    id: number;
    status: string;
    executed_at: string;
    executed_by: {
        id: number;
        name: string;
    };
    form_execution?: {
        id: number;
        responses: Array<{
            id: number;
            task: {
                id: number;
                description: string;
            };
            value: string;
        }>;
    };
}

interface Routine {
    id: number;
    name: string;
    type: number;
    trigger_hours: number;
    form?: {
        id: number;
        name: string;
    };
}

interface Props {
    asset: Asset;
    routine: Routine;
    executions: {
        data: RoutineExecution[];
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
        title: 'Execuções da Rotina',
        href: '#',
    },
];

const routineTypes = [
    { value: 1, label: 'Inspeção' },
    { value: 2, label: 'Rotina de Manutenção' },
    { value: 3, label: 'Relatório de Manutenção' }
];

export default function RoutineExecutions({ asset, routine, executions }: Props) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-100 text-green-800">Concluída</Badge>;
            case 'in_progress':
                return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Em Andamento</Badge>;
            case 'failed':
                return <Badge variant="destructive">Falhou</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const routineType = routineTypes.find(t => t.value === routine.type)?.label || 'Desconhecido';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Execuções - ${routine.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' })}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Voltar
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold">Execuções da Rotina</h1>
                        <p className="text-muted-foreground">
                            {routine.name} • {asset.tag} • {routineType}
                        </p>
                    </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Execuções</p>
                                    <p className="text-2xl font-bold">{executions.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Última Execução</p>
                                    <p className="text-sm font-medium">
                                        {executions.data.length > 0 
                                            ? formatDate(executions.data[0].executed_at)
                                            : 'Nunca executada'
                                        }
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Formulário</p>
                                    <p className="text-sm font-medium">
                                        {routine.form?.name || 'Não configurado'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de Execuções */}
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Execuções</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {executions.data.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Nenhuma execução encontrada</h3>
                                <p className="text-muted-foreground">
                                    Esta rotina ainda não foi executada.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {executions.data.map((execution) => (
                                    <div key={execution.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">
                                                        Execução #{execution.id}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(execution.executed_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(execution.status)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                {execution.executed_by.name}
                                            </div>
                                            {execution.form_execution && (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4" />
                                                    {execution.form_execution.responses.length} respostas
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
                {executions.last_page > 1 && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: executions.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={route('maintenance.assets.routines.executions', {
                                        asset: asset.id,
                                        routine: routine.id,
                                        page
                                    })}
                                    className={`px-3 py-1 rounded ${
                                        page === executions.current_page
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
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