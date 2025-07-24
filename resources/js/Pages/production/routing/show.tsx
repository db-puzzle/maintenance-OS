import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import {
    Workflow,
    Clock,
    Users,
    Settings,
    GitBranch,
    Edit,
    Play,
    Pause,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    routing: any;
    effectiveSteps: any[];
    can: {
        update: boolean;
        delete: boolean;
        manage_steps: boolean;
    };
}

export default function RoutingShow({ routing, effectiveSteps, can }: Props) {
    const [activeTab, setActiveTab] = useState('overview');

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const totalCycleTime = effectiveSteps.reduce((sum, step) =>
        sum + (step.cycle_time_minutes || 0), 0
    );

    const totalSetupTime = effectiveSteps.reduce((sum, step) =>
        sum + (step.setup_time_minutes || 0), 0
    );

    const tabs = [
        {
            id: 'overview',
            label: 'Visão Geral',
            content: <RoutingOverviewTab routing={routing} effectiveSteps={effectiveSteps} />
        },
        {
            id: 'steps',
            label: 'Etapas do Processo',
            content: <RoutingStepsTab steps={effectiveSteps} canManage={can.manage_steps} routingId={routing.id} />
        },
        {
            id: 'where-used',
            label: 'Onde é Usado',
            content: <RoutingWhereUsedTab routing={routing} />
        }
    ];

    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Roteiros', href: route('production.routing.index') },
        { title: routing.name, href: '' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Roteiro - ${routing.name}`} />

            <ShowLayout
                title={routing.routing_number}
                subtitle={routing.name}
                editRoute={can.update && routing.routing_type === 'defined' ?
                    route('production.routing.edit', routing.id) :
                    ''
                }
                tabs={tabs}
                showEditButton={can.update && routing.routing_type === 'defined'}
                defaultActiveTab={activeTab}

            />
        </AppLayout>
    );
}

// Overview Tab Component
function RoutingOverviewTab({ routing, effectiveSteps }: any) {
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const totalCycleTime = effectiveSteps.reduce((sum: number, step: any) =>
        sum + (step.cycle_time_minutes || 0), 0
    );

    const totalSetupTime = effectiveSteps.reduce((sum: number, step: any) =>
        sum + (step.setup_time_minutes || 0), 0
    );

    const totalTeardownTime = effectiveSteps.reduce((sum: number, step: any) =>
        sum + (step.teardown_time_minutes || 0), 0
    );

    return (
        <div className="space-y-6 py-6">
            {/* Routing Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Roteiro</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <DetailItem
                                label="Número do Roteiro"
                                value={routing.routing_number}
                            />
                            <DetailItem
                                label="Nome"
                                value={routing.name}
                            />
                            <DetailItem
                                label="Item"
                                value={
                                    <Link
                                        href={route('production.items.show', routing.bom_item?.id)}
                                        className="text-primary hover:underline"
                                    >
                                        {routing.bom_item?.item?.item_number} - {routing.bom_item?.item?.name}
                                    </Link>
                                }
                            />
                            <DetailItem
                                label="Tipo"
                                value={
                                    <Badge variant={routing.routing_type === 'defined' ? 'default' : 'secondary'}>
                                        {routing.routing_type === 'defined' ? 'Definido' : 'Herdado'}
                                    </Badge>
                                }
                            />
                        </div>
                        <div className="space-y-4">
                            <DetailItem
                                label="Status"
                                value={
                                    <Badge variant={routing.is_active ? 'default' : 'secondary'}>
                                        {routing.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                }
                            />
                            {routing.parent_routing && (
                                <DetailItem
                                    label="Herdado de"
                                    value={
                                        <Link
                                            href={route('production.routing.show', routing.parent_routing.id)}
                                            className="text-primary hover:underline"
                                        >
                                            {routing.parent_routing.routing_number} - {routing.parent_routing.name}
                                        </Link>
                                    }
                                />
                            )}
                            <DetailItem
                                label="Criado por"
                                value={routing.created_by?.name || 'Sistema'}
                            />
                            <DetailItem
                                label="Criado em"
                                value={new Date(routing.created_at).toLocaleDateString('pt-BR')}
                            />
                        </div>
                    </div>
                    {routing.description && (
                        <div className="mt-6">
                            <DetailItem
                                label="Descrição"
                                value={routing.description}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Process Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumo do Processo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <SummaryCard
                            icon={<Workflow className="h-5 w-5" />}
                            label="Total de Etapas"
                            value={effectiveSteps.length}
                        />
                        <SummaryCard
                            icon={<Clock className="h-5 w-5" />}
                            label="Tempo de Ciclo"
                            value={formatDuration(totalCycleTime)}
                        />
                        <SummaryCard
                            icon={<Settings className="h-5 w-5" />}
                            label="Tempo de Setup"
                            value={formatDuration(totalSetupTime)}
                        />
                        <SummaryCard
                            icon={<Users className="h-5 w-5" />}
                            label="Operadores Necessários"
                            value={Math.max(...effectiveSteps.map((s: any) => s.operators_required || 0))}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Steps Tab Component
function RoutingStepsTab({ steps, canManage, routingId }: any) {
    const columns: ColumnConfig[] = [
        {
            key: 'step_number',
            label: '#',
            width: 'w-[60px]',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="text-center font-medium">{String(value)}</div>
            )
        },
        {
            key: 'name',
            label: 'Nome da Etapa',
            render: (value: unknown, row: Record<string, unknown>) => {
                const step = row as any;
                return (
                    <div>
                        <div className="font-medium">{step.name}</div>
                        {step.operation_code && (
                            <div className="text-sm text-muted-foreground">
                                Código: {step.operation_code}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'work_cell',
            label: 'Célula de Trabalho',
            render: (value: unknown, row: Record<string, unknown>) => {
                const step = row as any;
                return step.work_cell ? (
                    <div>
                        <div className="font-medium">{step.work_cell.code}</div>
                        <div className="text-sm text-muted-foreground">
                            {step.work_cell.name}
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                );
            }
        },
        {
            key: 'cycle_time_minutes',
            label: 'Tempo de Ciclo',
            width: 'w-[120px]',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="text-center">
                    {value ? `${value} min` : '—'}
                </div>
            )
        },
        {
            key: 'setup_time_minutes',
            label: 'Setup',
            width: 'w-[100px]',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="text-center text-sm">
                    {value ? `${value} min` : '—'}
                </div>
            )
        },
        {
            key: 'operators_required',
            label: 'Operadores',
            width: 'w-[100px]',
            headerAlign: 'center',
            render: (value: unknown) => (
                <div className="text-center">
                    <Badge variant="outline">{value || 0}</Badge>
                </div>
            )
        }
    ];

    return (
        <div className="py-6">
            <Card>
                <CardContent className="p-0">
                    <EntityDataTable
                        data={steps as any}
                        columns={columns}
                        loading={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// Where Used Tab Component
function RoutingWhereUsedTab({ routing }: any) {
    const childRoutings = routing.child_routings || [];

    if (childRoutings.length === 0) {
        return (
            <div className="py-6">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Este roteiro não é herdado por outros itens</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const columns: ColumnConfig[] = [
        {
            key: 'bom_item',
            label: 'Item',
            render: (value: unknown, row: Record<string, unknown>) => {
                const childRouting = row as any;
                return (
                    <Link
                        href={route('production.items.show', childRouting.bom_item?.id)}
                        className="text-primary hover:underline"
                    >
                        {childRouting.bom_item?.item?.item_number} - {childRouting.bom_item?.item?.name}
                    </Link>
                );
            }
        },
        {
            key: 'routing_number',
            label: 'Roteiro',
            render: (value: unknown, row: Record<string, unknown>) => {
                const childRouting = row as any;
                return (
                    <Link
                        href={route('production.routing.show', childRouting.id)}
                        className="text-primary hover:underline"
                    >
                        {childRouting.routing_number}
                    </Link>
                );
            }
        }
    ];

    return (
        <div className="py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Itens que Herdam este Roteiro</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <EntityDataTable
                        data={childRoutings as any}
                        columns={columns}
                        loading={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// Helper Components
function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm">{value || '—'}</dd>
        </div>
    );
}

function SummaryCard({ icon, label, value }: any) {
    return (
        <div className="flex items-center gap-3 p-4 border rounded-lg">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
            </div>
        </div>
    );
} 