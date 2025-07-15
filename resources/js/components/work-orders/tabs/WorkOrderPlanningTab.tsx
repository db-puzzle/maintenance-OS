import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmptyCard from '@/components/ui/empty-card';
import {
    Plus,
    Trash2,
    Clock,
    DollarSign,
    Package,
    Calendar,
    Shield,
    AlertCircle,
    CheckCircle,
    Wrench,
    ChevronRight
} from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';
import { format } from 'date-fns';

interface WorkOrderPlanningTabProps {
    workOrder: any;
    technicians?: any[];
    teams?: any[];
    parts?: any[];
    skills?: string[];
    certifications?: string[];
    canPlan: boolean;
    discipline: 'maintenance' | 'quality';
    onGoToApproval?: () => void;
}

interface PlanningPart {
    id?: string;
    part_id?: number;
    part_number?: string;
    part_name: string;
    estimated_quantity: number;
    unit_cost: number;
    total_cost: number;
    available?: number;
}

export function WorkOrderPlanningTab({
    workOrder,
    technicians = [],
    teams = [],
    parts = [],
    skills = [],
    certifications = [],
    canPlan,
    discipline,
    onGoToApproval
}: WorkOrderPlanningTabProps) {
    // Check if work order is in a state that allows planning
    const canShowPlanning = ['approved', 'planned', 'scheduled'].includes(workOrder.status);

    if (!canShowPlanning) {
        return (
            <div className="py-12">
                <EmptyCard
                    icon={Calendar}
                    title="Ordem de serviço ainda não foi aprovada"
                    description="O planejamento só pode ser realizado após a aprovação da ordem de serviço"
                    primaryButtonText={workOrder.status === 'requested' ? "Ir para Aprovação" : undefined}
                    primaryButtonAction={workOrder.status === 'requested' ? onGoToApproval : undefined}
                />
            </div>
        );
    }

    const [plannedParts, setPlannedParts] = useState<PlanningPart[]>(
        workOrder.parts?.map((part: any) => ({
            id: part.id?.toString(),
            part_id: part.part_id,
            part_number: part.part_number,
            part_name: part.part_name,
            estimated_quantity: part.estimated_quantity,
            unit_cost: part.unit_cost,
            total_cost: part.total_cost,
        })) || []
    );

    const { data, setData, post, put, processing, errors } = useForm({
        estimated_hours: workOrder.estimated_hours?.toString() || '',
        labor_cost_per_hour: '150.00',
        estimated_labor_cost: workOrder.estimated_labor_cost || 0,
        downtime_required: workOrder.downtime_required || false,
        safety_requirements: workOrder.safety_requirements || [],
        required_skills: workOrder.required_skills || [],
        required_certifications: workOrder.required_certifications || [],
        parts: [] as any[],
        scheduled_start_date: workOrder.scheduled_start_date || '',
        scheduled_end_date: workOrder.scheduled_end_date || '',
        assigned_team_id: workOrder.assigned_team_id?.toString() || '',
        assigned_technician_id: workOrder.assigned_technician_id?.toString() || '',
        estimated_parts_cost: workOrder.estimated_parts_cost || 0,
        estimated_total_cost: workOrder.estimated_total_cost || 0,
    });

    const [newSafetyReq, setNewSafetyReq] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [newCert, setNewCert] = useState('');

    const calculateLaborCost = () => {
        const hours = parseFloat(data.estimated_hours) || 0;
        const rate = parseFloat(data.labor_cost_per_hour) || 0;
        return hours * rate;
    };

    const calculatePartsCost = () => {
        return plannedParts.reduce((sum, part) => sum + part.total_cost, 0);
    };

    const calculateTotalCost = () => {
        return calculateLaborCost() + calculatePartsCost();
    };

    React.useEffect(() => {
        setData(prev => ({
            ...prev,
            estimated_labor_cost: calculateLaborCost(),
            estimated_parts_cost: calculatePartsCost(),
            estimated_total_cost: calculateTotalCost(),
            parts: plannedParts,
        }));
    }, [data.estimated_hours, data.labor_cost_per_hour, plannedParts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (workOrder.status === 'approved') {
            post(route(`${discipline}.work-orders.planning.store`, workOrder.id));
        } else {
            put(route(`${discipline}.work-orders.planning.update`, workOrder.id));
        }
    };

    const handleCompletePlanning = () => {
        const saveRoute = workOrder.status === 'approved'
            ? route(`${discipline}.work-orders.planning.store`, workOrder.id)
            : route(`${discipline}.work-orders.planning.update`, workOrder.id);

        const saveMethod = workOrder.status === 'approved' ? post : put;

        saveMethod(saveRoute, {
            ...data,
            preserveScroll: true,
            onSuccess: () => {
                post(route(`${discipline}.work-orders.planning.complete`, workOrder.id));
            }
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '';
        return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
    };

    const handleAddPart = () => {
        const newPart: PlanningPart = {
            id: `new-${Date.now()}`,
            part_name: '',
            estimated_quantity: 1,
            unit_cost: 0,
            total_cost: 0,
        };
        setPlannedParts([...plannedParts, newPart]);
    };

    const handleUpdatePart = (index: number, updates: Partial<PlanningPart>) => {
        const updatedParts = [...plannedParts];
        updatedParts[index] = {
            ...updatedParts[index],
            ...updates,
            total_cost: (updates.estimated_quantity || updatedParts[index].estimated_quantity) *
                (updates.unit_cost || updatedParts[index].unit_cost)
        };
        setPlannedParts(updatedParts);
        setData('parts', updatedParts);
    };

    const handleRemovePart = (index: number) => {
        const updatedParts = plannedParts.filter((_, i) => i !== index);
        setPlannedParts(updatedParts);
        setData('parts', updatedParts);
    };

    const handleAddSafetyReq = () => {
        if (newSafetyReq.trim()) {
            setData('safety_requirements', [...data.safety_requirements, newSafetyReq.trim()]);
            setNewSafetyReq('');
        }
    };

    const handleAddSkill = () => {
        if (newSkill.trim()) {
            setData('required_skills', [...data.required_skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleAddCert = () => {
        if (newCert.trim()) {
            setData('required_certifications', [...data.required_certifications, newCert.trim()]);
            setNewCert('');
        }
    };

    return (
        <div className="space-y-6 py-6">
            {!canPlan && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Você não tem permissão para planejar esta ordem de serviço.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                {/* Resource Planning */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Planejamento de Recursos</CardTitle>
                        <CardDescription>
                            Estime o tempo e os custos de mão de obra
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="estimated_hours">
                                    Horas Estimadas <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="estimated_hours"
                                    type="number"
                                    step="0.5"
                                    value={data.estimated_hours}
                                    onChange={(e) => setData('estimated_hours', e.target.value)}
                                    placeholder="4.0"
                                    disabled={!canPlan}
                                />
                                {errors.estimated_hours && (
                                    <p className="text-sm text-red-500">{errors.estimated_hours}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="labor_cost_per_hour">Custo por Hora (R$)</Label>
                                <Input
                                    id="labor_cost_per_hour"
                                    type="number"
                                    step="0.01"
                                    value={data.labor_cost_per_hour}
                                    onChange={(e) => setData('labor_cost_per_hour', e.target.value)}
                                    disabled={!canPlan}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="font-medium">Custo Estimado de Mão de Obra:</span>
                            <span className="text-lg font-bold">{formatCurrency(data.estimated_labor_cost)}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="downtime_required"
                                checked={data.downtime_required}
                                onCheckedChange={(checked) => setData('downtime_required', checked as boolean)}
                                disabled={!canPlan}
                            />
                            <Label htmlFor="downtime_required" className="cursor-pointer">
                                Requer Parada do Equipamento
                            </Label>
                        </div>

                        <Separator />

                        {/* Safety Requirements */}
                        <div className="space-y-2">
                            <Label>Requisitos de Segurança</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newSafetyReq}
                                    onChange={(e) => setNewSafetyReq(e.target.value)}
                                    placeholder="Ex: LOTO obrigatório"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSafetyReq())}
                                    disabled={!canPlan}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleAddSafetyReq}
                                    disabled={!canPlan}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.safety_requirements.map((req: string, index: number) => (
                                    <Badge key={index} variant="secondary">
                                        <Shield className="h-3 w-3 mr-1" />
                                        {req}
                                        {canPlan && (
                                            <button
                                                type="button"
                                                onClick={() => setData('safety_requirements',
                                                    data.safety_requirements.filter((_: string, i: number) => i !== index)
                                                )}
                                                className="ml-2"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Parts Planning */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Planejamento de Peças</CardTitle>
                        <CardDescription>
                            Adicione as peças necessárias para a execução
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                {plannedParts.map((part, index) => (
                                    <div key={part.id} className="border rounded-lg p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div className="md:col-span-2 space-y-2">
                                                <Label>Nome da Peça</Label>
                                                <ItemSelect
                                                    items={parts.map(p => ({
                                                        id: p.id,
                                                        name: `${p.part_number} - ${p.name}`,
                                                    }))}
                                                    value={part.part_id?.toString() || ''}
                                                    onValueChange={(value) => {
                                                        const selectedPart = parts.find(p => p.id.toString() === value);
                                                        if (selectedPart) {
                                                            handleUpdatePart(index, {
                                                                part_id: selectedPart.id,
                                                                part_number: selectedPart.part_number,
                                                                part_name: selectedPart.name,
                                                                unit_cost: selectedPart.unit_cost,
                                                                available: selectedPart.available_quantity,
                                                            });
                                                        }
                                                    }}
                                                    placeholder="Selecione ou digite o nome"
                                                    canCreate={true}
                                                    disabled={!canPlan}
                                                />
                                                {part.available !== undefined && part.available < part.estimated_quantity && (
                                                    <p className="text-sm text-yellow-600">
                                                        ⚠️ Disponível: {part.available} unidades
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Quantidade</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={part.estimated_quantity}
                                                    onChange={(e) => handleUpdatePart(index, {
                                                        estimated_quantity: parseInt(e.target.value) || 1
                                                    })}
                                                    disabled={!canPlan}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Custo Unitário</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={part.unit_cost}
                                                    onChange={(e) => handleUpdatePart(index, {
                                                        unit_cost: parseFloat(e.target.value) || 0
                                                    })}
                                                    disabled={!canPlan}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Total: {formatCurrency(part.total_cost)}
                                            </span>
                                            {canPlan && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemovePart(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Remover
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {canPlan && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddPart}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Peça
                                    </Button>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg mt-4">
                            <span className="font-medium">Custo Estimado de Peças:</span>
                            <span className="text-lg font-bold">{formatCurrency(data.estimated_parts_cost)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule Planning */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Agendamento</CardTitle>
                        <CardDescription>
                            Defina quando e quem executará o trabalho
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="scheduled_start_date">
                                    Data/Hora de Início <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="scheduled_start_date"
                                    type="datetime-local"
                                    value={formatDate(data.scheduled_start_date)}
                                    onChange={(e) => setData('scheduled_start_date', e.target.value)}
                                    disabled={!canPlan}
                                />
                                {errors.scheduled_start_date && (
                                    <p className="text-sm text-red-500">{errors.scheduled_start_date}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduled_end_date">
                                    Data/Hora de Término <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="scheduled_end_date"
                                    type="datetime-local"
                                    value={formatDate(data.scheduled_end_date)}
                                    onChange={(e) => setData('scheduled_end_date', e.target.value)}
                                    disabled={!canPlan}
                                />
                                {errors.scheduled_end_date && (
                                    <p className="text-sm text-red-500">{errors.scheduled_end_date}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="assigned_team_id">Equipe Responsável</Label>
                                <ItemSelect
                                    items={teams.map(team => ({
                                        id: team.id,
                                        name: team.name,
                                    }))}
                                    value={data.assigned_team_id}
                                    onValueChange={(value) => setData('assigned_team_id', value)}
                                    placeholder="Selecione uma equipe"
                                    disabled={!canPlan}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assigned_technician_id">Técnico Principal</Label>
                                <ItemSelect
                                    items={technicians.map(tech => ({
                                        id: tech.id,
                                        name: tech.name,
                                    }))}
                                    value={data.assigned_technician_id}
                                    onValueChange={(value) => setData('assigned_technician_id', value)}
                                    placeholder="Selecione um técnico"
                                    disabled={!canPlan}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Cost Summary */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Resumo de Custos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Mão de Obra:</span>
                                <span>{formatCurrency(data.estimated_labor_cost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Peças:</span>
                                <span>{formatCurrency(data.estimated_parts_cost)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total Estimado:</span>
                                <span>{formatCurrency(data.estimated_total_cost)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                {canPlan && workOrder.status !== 'scheduled' && (
                    <div className="flex justify-end gap-2">
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={processing}
                        >
                            {processing ? 'Salvando...' : 'Salvar Rascunho'}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCompletePlanning}
                            disabled={processing || !data.estimated_hours || !data.scheduled_start_date || !data.scheduled_end_date}
                        >
                            Concluir Planejamento
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
} 