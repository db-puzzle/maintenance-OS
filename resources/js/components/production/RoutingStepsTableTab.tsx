import React from 'react';
import { router } from '@inertiajs/react';
import {
    Play,
    Timer,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { StepStatusBadge } from '@/components/production/StepStatusBadge';
import { StepTypeBadge } from '@/components/production/StepTypeBadge';
import { ManufacturingStep } from '@/types/production';

interface ExtendedManufacturingStep extends ManufacturingStep {
    dependency?: {
        name: string;
        status: string;
    };
}

interface Props {
    steps: ManufacturingStep[];
    canManage: boolean;
    canExecute: boolean;
    routingId: number;
}
export default function RoutingStepsTableTab({
    steps,
    canManage: _canManage,
    canExecute,
    routingId: _routingId
}: Props) {
    const handleStartStep = (stepId: number) => {
        router.get(route('production.steps.execute', stepId));
    };
    const getStepActions = (step: ManufacturingStep) => {
        if (!canExecute) return null;
        const canStart = !step.depends_on_step_id ||
            ((step as ExtendedManufacturingStep).dependency && ['completed', 'in_progress'].includes((step as ExtendedManufacturingStep).dependency!.status));
        switch (step.status) {
            case 'pending':
            case 'queued':
                return canStart ? (
                    <Button size="sm" onClick={() => handleStartStep(step.id)}>
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                    </Button>
                ) : (
                    <Button size="sm" disabled>
                        Aguardando
                    </Button>
                );
            case 'in_progress':
                return (
                    <Button size="sm" variant="secondary" onClick={() => handleStartStep(step.id)}>
                        <Timer className="h-4 w-4 mr-1" />
                        Continuar
                    </Button>
                );
            case 'on_hold':
                return (
                    <Button size="sm" variant="outline" onClick={() => handleStartStep(step.id)}>
                        <Play className="h-4 w-4 mr-1" />
                        Retomar
                    </Button>
                );
            case 'completed':
                return step.quality_result === 'failed' ? (
                    <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Falhou
                    </Badge>
                ) : (
                    <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concluído
                    </Badge>
                );
            default:
                return null;
        }
    };
    const columns: ColumnConfig<ManufacturingStep>[] = [
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
            render: (value: unknown, row) => {
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{row.name}</div>
                        {row.depends_on_step_id && (row as ExtendedManufacturingStep).dependency && (
                            <div className="text-xs text-muted-foreground">
                                Depende de: {(row as ExtendedManufacturingStep).dependency!.name}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'step_type',
            label: 'Tipo',
            render: (value: unknown) => <StepTypeBadge type={value as 'standard' | 'quality_check' | 'rework'} />
        },
        {
            key: 'work_cell',
            label: 'Célula de Trabalho',
            render: (value: unknown, row) => {
                return row.work_cell ? (
                    <div>
                        <div className="font-medium">{row.work_cell.code}</div>
                        <div className="text-sm text-muted-foreground">
                            {row.work_cell.name}
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
            render: (value: unknown) => <StepStatusBadge status={value as 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'completed' | 'skipped'} />
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
            key: 'actions',
            label: 'Ações',
            width: 'w-[150px]',
            headerAlign: 'center',
            render: (value: unknown, row) => (
                <div className="flex justify-center">
                    {getStepActions(row)}
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