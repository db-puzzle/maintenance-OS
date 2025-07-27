import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import {
    Workflow,
    Clock,
    Users,
    Settings,
    CheckCircle
} from 'lucide-react';

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

    const form = useForm({
        name: routing.name || '',
        description: routing.description || '',
        manufacturing_order_id: routing.manufacturing_order?.id?.toString() || '',
        item_id: routing.item?.id?.toString() || '',
        route_template_id: routing.route_template?.id?.toString() || '',
        is_active: routing.is_active
    });

    const tabs = [
        {
            id: 'overview',
            label: 'Visão Geral',
            content: <RoutingOverviewTab routing={routing} effectiveSteps={effectiveSteps} form={form} />
        },
        {
            id: 'steps',
            label: 'Etapas do Processo',
            content: <RoutingStepsTab steps={effectiveSteps} canManage={can.manage_steps} routingId={routing.id} />
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
                title={routing.name}
                subtitle={routing.manufacturing_order ? `Ordem: ${routing.manufacturing_order.order_number}` : 'Roteiro de Produção'}
                editRoute={can.update ? route('production.routing.edit', routing.id) : ''}
                tabs={tabs}
                showEditButton={can.update}
                defaultActiveTab={activeTab}
            />
        </AppLayout>
    );
}

// Overview Tab Component
function RoutingOverviewTab({ routing, effectiveSteps, form }: any) {
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };

    const totalCycleTime = effectiveSteps?.reduce((sum: number, step: any) =>
        sum + (step.cycle_time_minutes || 0), 0) || 0;

    const totalSetupTime = effectiveSteps?.reduce((sum: number, step: any) =>
        sum + (step.setup_time_minutes || 0), 0) || 0;

    const totalTeardownTime = effectiveSteps?.reduce((sum: number, step: any) =>
        sum + (step.teardown_time_minutes || 0), 0) || 0;

    // Mock data for selects - in a real app these would come from props
    const manufacturingOrders = routing.manufacturing_order ? [routing.manufacturing_order] : [];
    const items = routing.item ? [routing.item] : [];
    const routeTemplates = routing.route_template ? [routing.route_template] : [];

    return (
        <div className="space-y-6 py-6">
            {/* Main Information Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações do Roteiro</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                        form={form}
                        name="name"
                        label="Nome do Roteiro"
                        placeholder="Nome do roteiro"
                        view={true}
                    />

                    <ItemSelect
                        label="Status"
                        items={[
                            { id: 1, name: 'Ativo', value: 'true' },
                            { id: 0, name: 'Inativo', value: 'false' }
                        ]}
                        value={routing.is_active ? '1' : '0'}
                        onValueChange={() => { }}
                        view={true}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routing.manufacturing_order && (
                        <div className="grid gap-2">
                            <Label>Ordem de Produção</Label>
                            <div className="bg-background">
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    <Link
                                        href={route('production.orders.show', routing.manufacturing_order.id)}
                                        className="text-primary hover:underline"
                                    >
                                        {routing.manufacturing_order.order_number}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {routing.item && (
                        <div className="grid gap-2">
                            <Label>Item</Label>
                            <div className="bg-background">
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    <Link
                                        href={route('production.items.show', routing.item.id)}
                                        className="text-primary hover:underline"
                                    >
                                        {routing.item.item_number} - {routing.item.name}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {routing.route_template && (
                    <div className="grid gap-2">
                        <Label>Template de Roteiro</Label>
                        <div className="bg-background">
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {routing.route_template.name}
                            </div>
                        </div>
                    </div>
                )}

                {routing.description && (
                    <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <div className="bg-background">
                            <Textarea
                                value={routing.description}
                                readOnly
                                className="bg-muted/20 resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Process Summary Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Resumo do Processo</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        icon={<Workflow className="h-5 w-5" />}
                        label="Total de Etapas"
                        value={effectiveSteps?.length || 0}
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
                        value={effectiveSteps?.length > 0 ? Math.max(...effectiveSteps.map((s: any) => s.operators_required || 0)) : 0}
                    />
                </div>
            </div>

            {/* Metadata Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações de Sistema</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Criado por</Label>
                        <div className="bg-background">
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {routing.created_by?.name || 'Sistema'}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Criado em</Label>
                        <div className="bg-background">
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {new Date(routing.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
            key: 'step_type',
            label: 'Tipo',
            render: (value: unknown) => {
                const typeMap: Record<string, { label: string; variant: any }> = {
                    'standard': { label: 'Padrão', variant: 'default' },
                    'quality_check': { label: 'Checagem de Qualidade', variant: 'secondary' },
                    'rework': { label: 'Retrabalho', variant: 'outline' }
                };
                const type = typeMap[value as string] || { label: value as string, variant: 'default' };
                return <Badge variant={type.variant}>{type.label}</Badge>;
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
            key: 'status',
            label: 'Status',
            render: (value: unknown) => {
                const statusMap: Record<string, { label: string; variant: any }> = {
                    'pending': { label: 'Pendente', variant: 'outline' },
                    'queued': { label: 'Na Fila', variant: 'secondary' },
                    'in_progress': { label: 'Em Progresso', variant: 'default' },
                    'on_hold': { label: 'Em Espera', variant: 'destructive' },
                    'completed': { label: 'Concluído', variant: 'default' },
                    'skipped': { label: 'Pulado', variant: 'secondary' }
                };
                const status = statusMap[value as string] || { label: value as string, variant: 'default' };
                return <Badge variant={status.variant}>{status.label}</Badge>;
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
        }
    ];

    return (
        <div className="space-y-4 py-6">
            <EntityDataTable
                data={steps || []}
                columns={columns}
                loading={false}
            />
        </div>
    );
}

// Helper Components
function SummaryCard({ icon, label, value }: any) {
    return (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-background">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
            </div>
        </div>
    );
} 