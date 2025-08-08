import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Play, Pause, Check, X, ChevronLeft, ChevronRight,
    CheckCircle
} from 'lucide-react';
import { ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { User } from '@/types';
import { Form, FormTask } from '@/types/work-order';

import { StepExecutionTimer } from '@/components/production/StepExecutionTimer';
import { StepTypeBadge } from '@/components/production/StepTypeBadge';
import { toast } from 'sonner';
interface Props {
    step: ManufacturingStep & {
        manufacturing_route: {
            id: number;
            name: string;
            steps?: ManufacturingStep[];
            manufacturing_order?: {
                id: number;
                order_number: string;
                quantity: number;
                item?: {
                    id: number;
                    name: string;
                    item_number: string;
                };
            };
        };
        form?: Form & {
            current_version?: {
                tasks: FormTask[];
            };
        };
        executions?: ManufacturingStepExecution[];
    };
    execution?: ManufacturingStepExecution;
    currentUser: User;
    canExecute: boolean;
}
type ExecutionState = 'starting' | 'in_progress' | 'quality_check' | 'completing' | 'completed';
export default function StepExecute({ step, execution, currentUser, canExecute }: Props) {
    const [state, setState] = useState<ExecutionState>(() => {
        if (execution) {
            if (execution.status === 'completed') return 'completed';
            if (step.step_type === 'quality_check' && !execution.quality_result) return 'quality_check';
            return 'in_progress';
        }
        return 'starting';
    });
    const [showHoldDialog, setShowHoldDialog] = useState(false);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [formTaskIndex, setFormTaskIndex] = useState(0);
    const form = useForm({
        operator_id: execution?.executed_by || currentUser.id,
        work_cell_id: step.work_cell_id?.toString() || '',
        part_number: execution?.part_number || 1,
        total_parts: execution?.total_parts || 1,
        notes: '',
        hold_reason: '',
        quality_result: '',
        quality_notes: '',
        failure_action: '',
        quantity_completed: 0,
        quantity_scrapped: 0,
    });
    const totalParts = step.quality_check_mode === 'every_part'
        ? step.manufacturing_route.manufacturing_order?.quantity || 1
        : step.quality_check_mode === 'sampling'
            ? step.sampling_size || 1
            : 1;
    const handleBegin = () => {
        router.post(route('production.steps.start', step.id), {
            operator_id: form.data.operator_id,
            work_cell_id: form.data.work_cell_id,
            part_number: form.data.part_number,
            total_parts: totalParts,
        }, {
            onSuccess: () => {
                setState('in_progress');
                toast.success('Etapa iniciada');
            },
        });
    };
    const handlePause = () => {
        setShowHoldDialog(true);
    };
    const handleConfirmHold = () => {
        if (!execution) return;
        router.post(route('production.steps.hold', [step.id, execution.id]), {
            reason: form.data.hold_reason,
            notes: form.data.notes,
        }, {
            onSuccess: () => {
                setShowHoldDialog(false);
                toast.success('Etapa pausada');
                router.get(route('production.routing.show', step.manufacturing_route_id));
            },
        });
    };
    const handleQualityResult = (result: 'passed' | 'failed') => {
        if (!execution) return;
        if (result === 'failed' && !form.data.failure_action) {
            toast.error('Selecione uma ação para a falha');
            return;
        }
        router.post(route('production.steps.quality', [step.id, execution.id]), {
            quality_result: result,
            quality_notes: form.data.quality_notes,
            failure_action: form.data.failure_action,
        }, {
            onSuccess: () => {
                if (result === 'passed') {
                    // Check if there are more parts to check
                    if (currentPartIndex < totalParts - 1) {
                        setCurrentPartIndex(currentPartIndex + 1);
                        form.setData('quality_result', '');
                        form.setData('quality_notes', '');
                    } else {
                        setState('completing');
                    }
                } else {
                    toast.error('Qualidade reprovada');
                    if (form.data.failure_action === 'rework') {
                        toast.info('Etapa de retrabalho será criada');
                    }
                    setState('completing');
                }
            },
        });
    };
    const handleComplete = () => {
        if (!execution) return;
        router.post(route('production.steps.complete', [step.id, execution.id]), {
            notes: form.data.notes,
            quantity_completed: form.data.quantity_completed || step.manufacturing_route.manufacturing_order?.quantity || 1,
            quantity_scrapped: form.data.quantity_scrapped || 0,
        }, {
            onSuccess: () => {
                setState('completed');
                toast.success('Etapa concluída');
                setTimeout(() => {
                    router.get(route('production.routing.show', step.manufacturing_route_id));
                }, 2000);
            },
        });
    };
    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Roteiros', href: route('production.routing.index') },
        { title: step.manufacturing_route.name, href: route('production.routing.show', step.manufacturing_route_id) },
        { title: `Etapa ${step.step_number}`, href: '' }
    ];
    if (!canExecute) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Executar - ${step.name}`} />
                <div className="max-w-2xl mx-auto p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Acesso Negado</CardTitle>
                            <CardDescription>
                                Você não tem permissão para executar esta etapa.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </AppLayout>
        );
    }
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Executar - ${step.name}`} />
            <div className="max-w-4xl mx-auto p-4 pb-20">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">{step.name}</h1>
                        <StepTypeBadge type={step.step_type} />
                    </div>
                    <p className="text-muted-foreground">
                        Etapa {step.step_number} de {step.manufacturing_route.steps?.length || '?'}
                    </p>
                </div>
                {/* Context Bar */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Ordem</p>
                                <p className="font-medium">
                                    {step.manufacturing_route.manufacturing_order?.order_number || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Item</p>
                                <p className="font-medium">
                                    {step.manufacturing_route.manufacturing_order?.item?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Quantidade</p>
                                <p className="font-medium">
                                    {step.manufacturing_route.manufacturing_order?.quantity || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Célula</p>
                                <p className="font-medium">
                                    {step.work_cell?.name || '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {/* Main Content based on State */}
                {state === 'starting' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Iniciar Etapa</CardTitle>
                            <CardDescription>
                                Confirme as informações antes de iniciar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Operador</Label>
                                <div className="p-3 bg-muted rounded-md">
                                    {currentUser.name}
                                </div>
                            </div>
                            {step.work_cell && (
                                <div className="space-y-2">
                                    <Label>Célula de Trabalho</Label>
                                    <div className="p-3 bg-muted rounded-md">
                                        {step.work_cell.name}
                                    </div>
                                </div>
                            )}
                            {step.step_type === 'quality_check' && (
                                <div className="space-y-2">
                                    <Label>Modo de Verificação</Label>
                                    <div className="p-3 bg-muted rounded-md">
                                        {step.quality_check_mode === 'every_part' && `Cada Peça (${totalParts} total)`}
                                        {step.quality_check_mode === 'entire_lot' && 'Lote Inteiro'}
                                        {step.quality_check_mode === 'sampling' && `Amostragem (${totalParts} peças)`}
                                    </div>
                                </div>
                            )}
                            <Button
                                size="lg"
                                className="w-full"
                                onClick={handleBegin}
                            >
                                <Play className="h-5 w-5 mr-2" />
                                Iniciar Etapa
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {state === 'in_progress' && execution && (
                    <div className="space-y-6">
                        {/* Timer */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Tempo Decorrido</p>
                                    <StepExecutionTimer
                                        startTime={execution.started_at || new Date()}
                                        isPaused={false}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        {/* Form Tasks */}
                        {step.form?.current_version?.tasks && step.form.current_version.tasks.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Tarefas</CardTitle>
                                        <span className="text-sm text-muted-foreground">
                                            {formTaskIndex + 1} de {step.form.current_version.tasks.length}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(formTaskIndex / step.form.current_version.tasks.length) * 100}
                                        className="h-2"
                                    />
                                </CardHeader>
                                <CardContent>
                                    {/* Task content would go here - simplified for this example */}
                                    <div className="space-y-4">
                                        <p className="font-medium">
                                            {step.form.current_version.tasks[formTaskIndex]?.description}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                disabled={formTaskIndex === 0}
                                                onClick={() => setFormTaskIndex(formTaskIndex - 1)}
                                            >
                                                Anterior
                                            </Button>
                                            <Button
                                                className="flex-1"
                                                onClick={() => {
                                                    if (formTaskIndex < step.form!.current_version!.tasks.length - 1) {
                                                        setFormTaskIndex(formTaskIndex + 1);
                                                    } else {
                                                        setState(step.step_type === 'quality_check' ? 'quality_check' : 'completing');
                                                    }
                                                }}
                                            >
                                                {formTaskIndex < step.form.current_version.tasks.length - 1 ? 'Próxima' : 'Concluir Tarefas'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1"
                                onClick={handlePause}
                            >
                                <Pause className="h-5 w-5 mr-2" />
                                Pausar
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1"
                                onClick={() => setState(step.step_type === 'quality_check' ? 'quality_check' : 'completing')}
                                disabled={step.form && formTaskIndex < (step.form.current_version?.tasks.length || 0) - 1}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                {step.step_type === 'quality_check' ? 'Verificar Qualidade' : 'Concluir'}
                            </Button>
                        </div>
                    </div>
                )}
                {state === 'quality_check' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Verificação de Qualidade</CardTitle>
                                <CardDescription>
                                    {step.quality_check_mode === 'every_part' && (
                                        <span>Peça {currentPartIndex + 1} de {totalParts}</span>
                                    )}
                                    {step.quality_check_mode === 'sampling' && (
                                        <span>Amostra {currentPartIndex + 1} de {totalParts}</span>
                                    )}
                                    {step.quality_check_mode === 'entire_lot' && (
                                        <span>Verificação do Lote Completo</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Notas da Verificação</Label>
                                    <Textarea
                                        value={form.data.quality_notes}
                                        onChange={(e) => form.setData('quality_notes', e.target.value)}
                                        placeholder="Observações sobre a qualidade..."
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => {
                                            form.setData('quality_result', 'failed');
                                            if (step.quality_check_mode === 'every_part' || step.quality_check_mode === 'sampling') {
                                                // For multi-part checks, failing one fails all
                                                setState('completing');
                                            }
                                        }}
                                    >
                                        <X className="h-5 w-5 mr-2" />
                                        Reprovar
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleQualityResult('passed')}
                                    >
                                        <Check className="h-5 w-5 mr-2" />
                                        Aprovar
                                    </Button>
                                </div>
                                {form.data.quality_result === 'failed' && (
                                    <div className="space-y-2 pt-4 border-t">
                                        <Label>Ação para Falha</Label>
                                        <RadioGroup
                                            value={form.data.failure_action}
                                            onValueChange={(value) => form.setData('failure_action', value)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="scrap" id="scrap" />
                                                <Label htmlFor="scrap">Descartar</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="rework" id="rework" />
                                                <Label htmlFor="rework">Retrabalho</Label>
                                            </div>
                                        </RadioGroup>
                                        <Button
                                            className="w-full mt-4"
                                            onClick={() => handleQualityResult('failed')}
                                            disabled={!form.data.failure_action}
                                        >
                                            Confirmar Reprovação
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* Navigation for multi-part checks */}
                        {(step.quality_check_mode === 'every_part' || step.quality_check_mode === 'sampling') &&
                            currentPartIndex < totalParts - 1 && (
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPartIndex(Math.max(0, currentPartIndex - 1))}
                                        disabled={currentPartIndex === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        {currentPartIndex + 1} / {totalParts}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPartIndex(Math.min(totalParts - 1, currentPartIndex + 1))}
                                        disabled={currentPartIndex === totalParts - 1}
                                    >
                                        Próxima
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                    </div>
                )}
                {state === 'completing' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Concluir Etapa</CardTitle>
                            <CardDescription>
                                Revise as informações antes de finalizar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {execution && (
                                <div className="bg-muted rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Tempo Total</span>
                                        <StepExecutionTimer
                                            startTime={execution.started_at || new Date()}
                                            isPaused={false}
                                            className="text-base font-mono"
                                        />
                                    </div>
                                    {step.step_type === 'quality_check' && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Resultado</span>
                                            <Badge variant={form.data.quality_result === 'passed' ? 'default' : 'destructive'}>
                                                {form.data.quality_result === 'passed' ? 'Aprovado' : 'Reprovado'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Quantidade Produzida</Label>
                                <Input
                                    type="number"
                                    value={form.data.quantity_completed}
                                    onChange={(e) => form.setData('quantity_completed', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade Descartada</Label>
                                <Input
                                    type="number"
                                    value={form.data.quantity_scrapped}
                                    onChange={(e) => form.setData('quantity_scrapped', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Observações</Label>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Notas sobre a execução..."
                                    rows={3}
                                />
                            </div>
                            <Button
                                size="lg"
                                className="w-full"
                                onClick={handleComplete}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Finalizar Etapa
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {state === 'completed' && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold">Etapa Concluída!</h3>
                                <p className="text-muted-foreground">
                                    Redirecionando para o roteiro...
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            {/* Hold Dialog */}
            <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pausar Etapa</DialogTitle>
                        <DialogDescription>
                            Informe o motivo para pausar esta etapa
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <RadioGroup
                            value={form.data.hold_reason}
                            onValueChange={(value) => form.setData('hold_reason', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="material_shortage" id="material" />
                                <Label htmlFor="material">Falta de Material</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="equipment_issue" id="equipment" />
                                <Label htmlFor="equipment">Problema no Equipamento</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="quality_concern" id="quality" />
                                <Label htmlFor="quality">Preocupação com Qualidade</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="other" id="other" />
                                <Label htmlFor="other">Outro</Label>
                            </div>
                        </RadioGroup>
                        <div className="space-y-2">
                            <Label>Observações (opcional)</Label>
                            <Textarea
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="Detalhes adicionais..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowHoldDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmHold} disabled={!form.data.hold_reason}>
                            Confirmar Pausa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 