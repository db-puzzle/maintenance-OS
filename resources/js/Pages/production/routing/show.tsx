import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import {
    Workflow,
    Clock,
    Users,
    Settings,
    CheckCircle,
    Play,
    Pause,
    GitBranch,
    AlertCircle,
    Timer,
    FileText
} from 'lucide-react';
import { StepStatusBadge } from '@/components/production/StepStatusBadge';
import { StepTypeBadge } from '@/components/production/StepTypeBadge';
import RoutingStepsTab from '@/components/production/RoutingStepsTab';
import RoutingStepsTableTab from '@/components/production/RoutingStepsTableTab';
import { ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';

interface Props {
    routing: any;
    effectiveSteps: any[];
    templates?: any[];
    workCells?: WorkCell[];
    stepTypes?: Record<string, string>;
    forms?: Form[];
    openRouteBuilder?: string | null;
    can: {
        update: boolean;
        delete: boolean;
        manage_steps: boolean;
        execute_steps: boolean;
    };
}

export default function RoutingShow({ routing, effectiveSteps, templates, workCells, stepTypes, forms, openRouteBuilder, can }: Props) {
    const [activeTab, setActiveTab] = useState('overview');

    const form = useForm({
        name: routing.name || '',
        description: routing.description || '',
        manufacturing_order_id: routing.manufacturing_order?.id?.toString() || '',
        item_id: routing.item?.id?.toString() || '',
        route_template_id: routing.route_template?.id?.toString() || '',
        is_active: routing.is_active
    });

    // Calculate route progress
    const completedSteps = effectiveSteps.filter(step => step.status === 'completed').length;
    const totalSteps = effectiveSteps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Calculate total times
    const totalEstimatedTime = effectiveSteps.reduce((sum, step) =>
        sum + (step.setup_time_minutes || 0) + (step.cycle_time_minutes || 0), 0
    );

    const totalActualTime = effectiveSteps.reduce((sum, step) => {
        if (step.actual_start_time && step.actual_end_time) {
            const start = new Date(step.actual_start_time);
            const end = new Date(step.actual_end_time);
            return sum + (end.getTime() - start.getTime()) / 60000; // Convert to minutes
        }
        return sum;
    }, 0);

    const tabs = [
        {
            id: 'overview',
            label: 'Visão Geral',
            content: <RoutingOverviewTab
                routing={routing}
                effectiveSteps={effectiveSteps}
                form={form}
                progressPercentage={progressPercentage}
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                totalEstimatedTime={totalEstimatedTime}
                totalActualTime={totalActualTime}
                onTabChange={setActiveTab}
            />
        },
        {
            id: 'steps-table',
            label: 'Lista de Etapas',
            content: <RoutingStepsTableTab
                steps={effectiveSteps}
                canManage={can.manage_steps}
                canExecute={can.execute_steps}
                routingId={routing.id}
            />
        },
        {
            id: 'steps',
            label: 'Configuração',
            fullWidth: true,
            content: <RoutingStepsTab
                routing={routing}
                steps={effectiveSteps}
                canManage={can.manage_steps}
                canExecute={can.execute_steps}
                routingId={routing.id}
                templates={templates}
                workCells={workCells}
                stepTypes={stepTypes}
                forms={forms}
                openRouteBuilder={openRouteBuilder}
            />
        },
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
                subtitle={
                    <div className="flex items-center gap-4">
                        {routing.manufacturing_order && (
                            <span>
                                Ordem: <Link href={route('production.orders.show', routing.manufacturing_order.id)} className="text-primary hover:underline">
                                    {routing.manufacturing_order.order_number}
                                </Link>
                            </span>
                        )}
                        <Badge variant={routing.is_active ? 'default' : 'secondary'}>
                            {routing.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </div>
                }
                editRoute=""
                tabs={tabs}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
            />
        </AppLayout>
    );
}

// Overview Tab Component
function RoutingOverviewTab({
    routing,
    effectiveSteps,
    form,
    progressPercentage,
    completedSteps,
    totalSteps,
    totalEstimatedTime,
    totalActualTime,
    onTabChange
}: any) {
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${Math.round(mins)}min` : `${hours}h`;
    };

    const totalSetupTime = effectiveSteps?.reduce((sum: number, step: any) =>
        sum + (step.setup_time_minutes || 0), 0) || 0;

    const totalCycleTime = effectiveSteps?.reduce((sum: number, step: any) =>
        sum + (step.cycle_time_minutes || 0), 0) || 0;

    return (
        <div className="space-y-6 py-6">

            {/* Process Summary Section */}
            <div className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        icon={<Workflow className="h-5 w-5" />}
                        label="Total de Etapas"
                        value={effectiveSteps?.length || 0}
                        onClick={() => onTabChange('steps-table')}
                        clickable={true}
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
                        icon={<Timer className="h-5 w-5" />}
                        label="Tempo Total"
                        value={formatDuration(totalCycleTime + totalSetupTime)}
                    />
                </div>
            </div>

            {/* Main Information Section */}
            <div className="space-y-4">
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

            {/* Metadata Section */}
            <div className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Criado por</Label>
                        <div className="bg-background">
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {routing.created_by_user?.name || 'Sistema'}
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

// Helper Components
function SummaryCard({ icon, label, value, onClick, clickable }: any) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 p-4 border rounded-lg bg-background",
                clickable && "cursor-pointer hover:bg-muted/50 transition-colors"
            )}
            onClick={onClick}
        >
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{value}</p>
            </div>
        </div>
    );
} 