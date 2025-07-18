import React, { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import EmptyCard from '@/components/ui/empty-card';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import PartSearchDialog from '@/components/work-orders/PartSearchDialog';
import {
    Plus,
    Trash2,
    Calendar as CalendarIcon,
    Package,
    Search,
    AlertCircle,
    ChevronDownIcon,
    Clock,
    DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
                    icon={CalendarIcon}
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

    const [partSearchOpen, setPartSearchOpen] = useState(false);
    const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
    const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors } = useForm({
        estimated_hours: workOrder.estimated_hours?.toString() || '',
        labor_cost_per_hour: workOrder.labor_cost_per_hour?.toString() || '150.00',
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

    const isViewMode = !canPlan;

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

    // Helper functions for date/time handling
    const parseDateTime = (dateTimeString: string) => {
        if (!dateTimeString) return { date: undefined, time: '' };

        // Parse datetime-local format directly without timezone conversion
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);

        // Create date using local timezone (no conversion)
        const date = new Date(year, month - 1, day);

        // Clean up time part - remove timezone indicator and microseconds
        let cleanTime = timePart || '12:00:00';
        if (cleanTime) {
            cleanTime = cleanTime.replace(/[Z].*$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
            cleanTime = cleanTime.split('.')[0];
            const timeParts = cleanTime.split(':');
            if (timeParts.length === 2) {
                cleanTime = `${timeParts[0]}:${timeParts[1]}:00`;
            }
        }

        return {
            date: date,
            time: cleanTime
        };
    };

    const combineDateTime = (date: Date | undefined, time: string) => {
        if (!date || !time) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const [hours, minutes, seconds = '00'] = time.split(':');
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;

        return `${year}-${month}-${day}T${formattedTime}`;
    };

    const startDateTime = parseDateTime(data.scheduled_start_date);
    const endDateTime = parseDateTime(data.scheduled_end_date);

    const handleAddPart = (part: any) => {
        const newPart: PlanningPart = {
            id: `new-${Date.now()}`,
            part_id: part.id,
            part_number: part.part_number,
            part_name: part.name,
            estimated_quantity: 1,
            unit_cost: part.unit_cost,
            total_cost: part.unit_cost,
        };
        setPlannedParts([...plannedParts, newPart]);
    };

    const handleUpdatePartQuantity = (index: number, quantity: number) => {
        const updatedParts = [...plannedParts];
        updatedParts[index] = {
            ...updatedParts[index],
            estimated_quantity: quantity,
            total_cost: quantity * updatedParts[index].unit_cost
        };
        setPlannedParts(updatedParts);
    };

    const handleRemovePart = (index: number) => {
        const updatedParts = plannedParts.filter((_, i) => i !== index);
        setPlannedParts(updatedParts);
    };

    const selectedPartIds = plannedParts.map(p => p.part_id).filter(Boolean) as number[];

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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Time and Cost Estimation */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Estimativa de Tempo e Custo</h3>
                    
                    <div className="grid gap-4 md:grid-cols-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors,
                            }}
                            name="estimated_hours"
                            label="Horas Estimadas"
                            placeholder="4.0"
                            required
                            view={isViewMode}
                        />

                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors,
                            }}
                            name="labor_cost_per_hour"
                            label="Custo por Hora (R$)"
                            placeholder="150.00"
                            view={isViewMode}
                        />

                        <div className="space-y-2">
                            <Label>Custo de Mão de Obra</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm font-medium">
                                {formatCurrency(data.estimated_labor_cost)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Requer Parada</Label>
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.downtime_required ? 'Sim' : 'Não'}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="downtime_required"
                                        checked={data.downtime_required}
                                        onCheckedChange={(checked) => setData('downtime_required', checked as boolean)}
                                    />
                                    <Label htmlFor="downtime_required" className="text-sm cursor-pointer">
                                        Requer parada do equipamento
                                    </Label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Parts Planning */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Peças Necessárias</h3>
                        {!isViewMode && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPartSearchOpen(true)}
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Adicionar Peça
                            </Button>
                        )}
                    </div>

                    {plannedParts.length > 0 ? (
                        <div className="space-y-2">
                            {plannedParts.map((part, index) => (
                                <div key={part.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{part.part_number} - {part.part_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Custo unitário: {formatCurrency(part.unit_cost)}
                                        </div>
                                    </div>
                                    <div className="w-24">
                                        {isViewMode ? (
                                            <div className="text-center">
                                                <div className="text-sm text-muted-foreground">Qtd</div>
                                                <div className="font-medium">{part.estimated_quantity}</div>
                                            </div>
                                        ) : (
                                            <Input
                                                type="number"
                                                min="1"
                                                value={part.estimated_quantity}
                                                onChange={(e) => handleUpdatePartQuantity(index, parseInt(e.target.value) || 1)}
                                                className="text-center"
                                            />
                                        )}
                                    </div>
                                    <div className="text-right w-32">
                                        <div className="text-sm text-muted-foreground">Total</div>
                                        <div className="font-medium">{formatCurrency(part.total_cost)}</div>
                                    </div>
                                    {!isViewMode && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemovePart(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                <span className="font-medium">Custo Total de Peças:</span>
                                <span className="text-lg font-bold">{formatCurrency(data.estimated_parts_cost)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                            <Package className="h-8 w-8 mx-auto mb-2" />
                            <p>Nenhuma peça adicionada</p>
                        </div>
                    )}
                </div>

                {/* Schedule Planning */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Agendamento</h3>
                    
                    <div className="grid gap-4 md:grid-cols-4">
                        {/* Start Date/Time */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="scheduled_start_date">
                                Data/Hora de Início <span className="text-red-500">*</span>
                            </Label>
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.scheduled_start_date 
                                        ? format(new Date(data.scheduled_start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : 'Não definido'
                                    }
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !startDateTime.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDateTime.date 
                                                        ? format(startDateTime.date, "dd/MM/yyyy", { locale: ptBR })
                                                        : "Selecione a data"
                                                    }
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={startDateTime.date}
                                                    captionLayout="dropdown"
                                                    onSelect={(date) => {
                                                        const newDateTime = combineDateTime(date, startDateTime.time || '08:00:00');
                                                        setData('scheduled_start_date', newDateTime);
                                                        setStartDatePickerOpen(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="time"
                                            step="1"
                                            value={startDateTime.time || '08:00:00'}
                                            onChange={(e) => {
                                                const newDateTime = combineDateTime(startDateTime.date || new Date(), e.target.value);
                                                setData('scheduled_start_date', newDateTime);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                            {errors.scheduled_start_date && (
                                <span className="text-sm text-red-500">{errors.scheduled_start_date}</span>
                            )}
                        </div>

                        {/* End Date/Time */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="scheduled_end_date">
                                Data/Hora de Término <span className="text-red-500">*</span>
                            </Label>
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.scheduled_end_date 
                                        ? format(new Date(data.scheduled_end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : 'Não definido'
                                    }
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !endDateTime.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDateTime.date 
                                                        ? format(endDateTime.date, "dd/MM/yyyy", { locale: ptBR })
                                                        : "Selecione a data"
                                                    }
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={endDateTime.date}
                                                    captionLayout="dropdown"
                                                    onSelect={(date) => {
                                                        const newDateTime = combineDateTime(date, endDateTime.time || '17:00:00');
                                                        setData('scheduled_end_date', newDateTime);
                                                        setEndDatePickerOpen(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="time"
                                            step="1"
                                            value={endDateTime.time || '17:00:00'}
                                            onChange={(e) => {
                                                const newDateTime = combineDateTime(endDateTime.date || new Date(), e.target.value);
                                                setData('scheduled_end_date', newDateTime);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                            {errors.scheduled_end_date && (
                                <span className="text-sm text-red-500">{errors.scheduled_end_date}</span>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <ItemSelect
                            label="Equipe Responsável"
                            items={teams.map(team => ({
                                id: team.id,
                                name: team.name,
                            }))}
                            value={data.assigned_team_id}
                            onValueChange={(value) => setData('assigned_team_id', value)}
                            placeholder="Selecione uma equipe"
                            view={isViewMode}
                            canClear
                        />

                        <ItemSelect
                            label="Técnico Principal"
                            items={technicians.map(tech => ({
                                id: tech.id,
                                name: tech.name,
                            }))}
                            value={data.assigned_technician_id}
                            onValueChange={(value) => setData('assigned_technician_id', value)}
                            placeholder="Selecione um técnico"
                            view={isViewMode}
                            canClear
                        />
                    </div>
                </div>

                {/* Total Cost Summary */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Resumo de Custos</h3>
                    
                    <div className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span>Mão de Obra:</span>
                            <span>{formatCurrency(data.estimated_labor_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Peças:</span>
                            <span>{formatCurrency(data.estimated_parts_cost)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-lg font-bold">
                            <span>Total Estimado:</span>
                            <span>{formatCurrency(data.estimated_total_cost)}</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {canPlan && workOrder.status !== 'scheduled' && (
                    <div className="flex justify-end gap-2 pt-4">
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

            {/* Part Search Dialog */}
            <PartSearchDialog
                open={partSearchOpen}
                onOpenChange={setPartSearchOpen}
                parts={parts}
                selectedParts={selectedPartIds}
                onSelectPart={handleAddPart}
            />
        </div>
    );
} 