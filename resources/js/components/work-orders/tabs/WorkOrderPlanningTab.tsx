import React, { useState, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmptyCard from '@/components/ui/empty-card';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import PartSearchDialog from '@/components/work-orders/PartSearchDialog';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import SkillSheet from '@/components/skills/SkillSheet';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { ColumnConfig } from '@/types/shared';
import {
    Plus,
    Trash2,
    Calendar as CalendarIcon,
    Package,
    Search,
    AlertCircle,
    Shield,
    Wrench,
    CheckCircle,
    Edit3,
} from 'lucide-react';
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
    available?: number;
}

interface EditableCellProps {
    value: string | number;
    onChange: (value: string) => void;
    type?: 'text' | 'number';
    min?: string | number;
    step?: string | number;
    placeholder?: string;
    className?: string;
    formatDisplay?: (value: string | number) => string;
}

function EditableCell({
    value,
    onChange,
    type = 'text',
    min,
    step,
    placeholder,
    className,
    formatDisplay
}: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        onChange(tempValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempValue(value.toString());
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isEditing) {
        return (
            <div
                className={cn(
                    "group relative flex items-center justify-between w-full h-full -m-1 p-1 rounded cursor-pointer hover:bg-muted/50 transition-colors",
                    className
                )}
                onClick={() => setIsEditing(true)}
                title="Clique para editar"
            >
                <span className="flex-1">{formatDisplay ? formatDisplay(value) : value}</span>
                <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
            </div>
        );
    }

    return (
        <input
            ref={inputRef}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            min={min}
            step={step}
            placeholder={placeholder}
            className={cn(
                "w-full px-1.5 py-1 text-sm bg-background border-0 outline-none focus:ring-2 focus:ring-ring rounded",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                className
            )}
        />
    );
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
    // Check if work order is in a state that allows showing planning (view or edit)
    const canShowPlanning = !['requested', 'rejected', 'cancelled'].includes(workOrder.status);

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
            estimated_quantity: Number(part.estimated_quantity) || 1,
            unit_cost: Number(part.unit_cost) || 0,
            total_cost: Number(part.total_cost) || 0,
            available: part.available_quantity,
        })) || []
    );

    const [partSearchOpen, setPartSearchOpen] = useState(false);
    const [skillSheetOpen, setSkillSheetOpen] = useState(false);
    const [certificationSheetOpen, setCertificationSheetOpen] = useState(false);
    const [newSafetyReq, setNewSafetyReq] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [newCert, setNewCert] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const { data, setData, post, put, processing, errors, clearErrors } = useForm({
        estimated_hours: workOrder.estimated_hours?.toString() || '',
        labor_cost_per_hour: workOrder.labor_cost_per_hour?.toString() || '150.00',
        estimated_labor_cost: workOrder.estimated_labor_cost || 0,
        downtime_required: workOrder.downtime_required || false,
        safety_requirements: workOrder.safety_requirements || [],
        required_skills: workOrder.required_skills || [],
        required_certifications: workOrder.required_certifications || [],
        parts: [] as any[],
        estimated_parts_cost: workOrder.estimated_parts_cost || 0,
        estimated_total_cost: workOrder.estimated_total_cost || 0,
    });

    const isViewMode = !canPlan || !['approved', 'planned'].includes(workOrder.status);

    const calculateLaborCost = () => {
        const hours = parseFloat(data.estimated_hours) || 0;
        const rate = parseFloat(data.labor_cost_per_hour) || 0;
        return hours * rate;
    };

    const calculatePartsCost = () => {
        return plannedParts.reduce((sum, part) => {
            const partCost = Number(part.total_cost) || 0;
            return sum + partCost;
        }, 0);
    };

    React.useEffect(() => {
        const laborCost = calculateLaborCost();
        const partsCost = calculatePartsCost();
        const totalCost = laborCost + partsCost;

        setData(prev => ({
            ...prev,
            estimated_labor_cost: laborCost,
            estimated_parts_cost: partsCost,
            estimated_total_cost: totalCost,
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

    // Safety requirements handlers
    const handleAddSafetyReq = () => {
        if (newSafetyReq.trim()) {
            setData('safety_requirements', [...data.safety_requirements, newSafetyReq.trim()]);
            setNewSafetyReq('');
        }
    };

    const handleRemoveSafetyReq = (index: number) => {
        setData('safety_requirements', data.safety_requirements.filter((_: string, i: number) => i !== index));
    };

    // Skills handlers
    const handleAddSkill = () => {
        if (newSkill.trim()) {
            setData('required_skills', [...data.required_skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (index: number) => {
        setData('required_skills', data.required_skills.filter((_: string, i: number) => i !== index));
    };

    // Certifications handlers
    const handleAddCert = () => {
        if (newCert.trim()) {
            setData('required_certifications', [...data.required_certifications, newCert.trim()]);
            setNewCert('');
        }
    };

    const handleRemoveCert = (index: number) => {
        setData('required_certifications', data.required_certifications.filter((_: string, i: number) => i !== index));
    };

    const handleAddPart = (part: any) => {
        const unitCost = Number(part.unit_cost) || 0;
        const newPart: PlanningPart = {
            id: `new-${Date.now()}`,
            part_id: part.id,
            part_number: part.part_number,
            part_name: part.name,
            estimated_quantity: 1,
            unit_cost: unitCost,
            total_cost: unitCost * 1,
            available: part.available_quantity,
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
    };

    const handleUpdatePartQuantity = (index: number, quantity: number) => {
        handleUpdatePart(index, { estimated_quantity: quantity });
    };

    const handleRemovePart = (index: number) => {
        const updatedParts = plannedParts.filter((_, i) => i !== index);
        setPlannedParts(updatedParts);
    };

    const selectedPartIds = plannedParts.map(p => p.part_id).filter(Boolean) as number[];

    // Pagination logic
    const paginatedParts = useMemo(() => {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        return plannedParts.slice(startIndex, endIndex);
    }, [plannedParts, currentPage, perPage]);

    const totalPages = Math.ceil(plannedParts.length / perPage);

    // Reset to first page when parts change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [plannedParts.length]);

    // Parts table columns configuration
    const partsColumns: ColumnConfig[] = [
        {
            key: 'part_number',
            label: 'Código',
            width: 'w-[150px]',
            render: (value, row) => {
                const part = row as unknown as PlanningPart;
                return <span className="font-mono text-sm">{part.part_number || '-'}</span>;
            },
        },
        {
            key: 'part_name',
            label: 'Nome da Peça',
            render: (value, row) => {
                const part = row as unknown as PlanningPart;
                return (
                    <div>
                        <span className="text-sm">{part.part_name}</span>
                        {part.available !== undefined && part.available < part.estimated_quantity && (
                            <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Disponível: {part.available} unidades
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'estimated_quantity',
            label: 'Quantidade',
            width: 'w-[140px]',
            headerAlign: 'center',
            render: (value, row) => {
                const part = row as unknown as PlanningPart;
                const rowIndex = paginatedParts.findIndex(p => p.id === part.id);
                const actualIndex = (currentPage - 1) * perPage + rowIndex;
                return isViewMode ? (
                    <div className="text-center">{part.estimated_quantity}</div>
                ) : (
                    <EditableCell
                        value={part.estimated_quantity}
                        onChange={(val) => handleUpdatePartQuantity(actualIndex, parseInt(val) || 1)}
                        type="number"
                        min="1"
                        className="text-center"
                    />
                );
            },
        },
        {
            key: 'unit_cost',
            label: 'Custo Unitário',
            width: 'w-[160px]',
            headerAlign: 'right',
            render: (value, row) => {
                const part = row as unknown as PlanningPart;
                const rowIndex = paginatedParts.findIndex(p => p.id === part.id);
                const actualIndex = (currentPage - 1) * perPage + rowIndex;
                return isViewMode ? (
                    <div className="text-right">{formatCurrency(part.unit_cost)}</div>
                ) : (
                    <EditableCell
                        value={part.unit_cost}
                        onChange={(val) => handleUpdatePart(actualIndex, {
                            unit_cost: parseFloat(val) || 0
                        })}
                        type="number"
                        step="0.01"
                        className="text-right"
                        formatDisplay={(val) => formatCurrency(Number(val))}
                    />
                );
            },
        },
        {
            key: 'total_cost',
            label: 'Total',
            width: 'w-[160px]',
            headerAlign: 'right',
            render: (value, row) => {
                const part = row as unknown as PlanningPart;
                return <div className="text-right font-medium">{formatCurrency(part.total_cost)}</div>;
            },
        },
    ];

    // Actions for each row (remove button)
    const partsActions = !isViewMode ? (row: Record<string, unknown>) => {
        const part = row as unknown as PlanningPart;
        const partIndex = plannedParts.findIndex(p => p.id === part.id);
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePart(partIndex)}
                className="h-8 w-8 p-0"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );
    } : undefined;

    return (
        <div className="space-y-6 py-6">
            {!canPlan && ['approved', 'planned'].includes(workOrder.status) && (
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
                    <h3 className="text-lg font-medium">Horas de Trabalho</h3>

                    <div className="grid gap-4 md:grid-cols-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: clearErrors as (...fields: string[]) => void,
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
                                clearErrors: clearErrors as (...fields: string[]) => void,
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

                <Separator />

                {/* Safety Requirements, Skills, and Certifications */}
                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Requisitos e Qualificações</h3>

                    {/* Safety Requirements */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Requisitos de Segurança</Label>
                            {!isViewMode && (
                                <div className="flex gap-2">
                                    <Input
                                        value={newSafetyReq}
                                        onChange={(e) => setNewSafetyReq(e.target.value)}
                                        placeholder="Ex: LOTO obrigatório"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSafetyReq())}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleAddSafetyReq}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {data.safety_requirements.map((req: string, index: number) => (
                                    <Badge key={index} variant="secondary">
                                        <Shield className="h-3 w-3 mr-1" />
                                        {req}
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSafetyReq(index)}
                                                className="ml-2"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                                {data.safety_requirements.length === 0 && (
                                    <span className="text-sm text-muted-foreground">Nenhum requisito de segurança definido</span>
                                )}
                            </div>
                        </div>

                        {/* Required Skills */}
                        <div className="space-y-2">
                            <Label>Habilidades Necessárias</Label>
                            {!isViewMode && (
                                <div className="flex gap-2">
                                    <ItemSelect
                                        items={skills.map((skill, index) => ({ id: index + 1, name: skill }))}
                                        value={skills.findIndex(s => s === newSkill) + 1 ? (skills.findIndex(s => s === newSkill) + 1).toString() : ''}
                                        onValueChange={(value) => {
                                            if (value === 'create-new') {
                                                setSkillSheetOpen(true);
                                            } else {
                                                const index = parseInt(value) - 1;
                                                if (index >= 0 && index < skills.length) {
                                                    setNewSkill(skills[index]);
                                                }
                                            }
                                        }}
                                        placeholder="Selecione uma habilidade"
                                        canCreate={true}
                                        createLabel="Criar nova habilidade"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleAddSkill}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {data.required_skills.map((skill: string, index: number) => (
                                    <Badge key={index} variant="secondary">
                                        <Wrench className="h-3 w-3 mr-1" />
                                        {skill}
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSkill(index)}
                                                className="ml-2"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                                {data.required_skills.length === 0 && (
                                    <span className="text-sm text-muted-foreground">Nenhuma habilidade específica requerida</span>
                                )}
                            </div>
                        </div>

                        {/* Required Certifications */}
                        <div className="space-y-2">
                            <Label>Certificações Necessárias</Label>
                            {!isViewMode && (
                                <div className="flex gap-2">
                                    <ItemSelect
                                        items={certifications.map((cert, index) => ({ id: index + 1, name: cert }))}
                                        value={certifications.findIndex(c => c === newCert) + 1 ? (certifications.findIndex(c => c === newCert) + 1).toString() : ''}
                                        onValueChange={(value) => {
                                            if (value === 'create-new') {
                                                setCertificationSheetOpen(true);
                                            } else {
                                                const index = parseInt(value) - 1;
                                                if (index >= 0 && index < certifications.length) {
                                                    setNewCert(certifications[index]);
                                                }
                                            }
                                        }}
                                        placeholder="Selecione uma certificação"
                                        canCreate={true}
                                        createLabel="Criar nova certificação"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleAddCert}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {data.required_certifications.map((cert: string, index: number) => (
                                    <Badge key={index} variant="secondary">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {cert}
                                        {!isViewMode && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCert(index)}
                                                className="ml-2"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                                {data.required_certifications.length === 0 && (
                                    <span className="text-sm text-muted-foreground">Nenhuma certificação específica requerida</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

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
                        <div className="space-y-4">
                            <div className="[&_td]:py-1 [&_td]:text-sm [&_th]:py-1.5 [&_th]:text-sm">
                                <EntityDataTable
                                    data={paginatedParts as any[]}
                                    columns={partsColumns}
                                    actions={partsActions}
                                    emptyMessage="Nenhuma peça adicionada"
                                />
                            </div>

                            {/* Show pagination only if more than 10 parts */}
                            {plannedParts.length > 10 && (
                                <EntityPagination
                                    pagination={{
                                        current_page: currentPage,
                                        last_page: totalPages,
                                        per_page: perPage,
                                        total: plannedParts.length,
                                        from: (currentPage - 1) * perPage + 1,
                                        to: Math.min(currentPage * perPage, plannedParts.length),
                                    }}
                                    onPageChange={setCurrentPage}
                                    onPerPageChange={setPerPage}
                                    perPageOptions={[10, 20, 30, 50]}
                                />
                            )}

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

                <Separator />

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
                {canPlan && ['approved', 'planned'].includes(workOrder.status) && (
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
                            disabled={processing || !data.estimated_hours}
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

            {/* Skill Sheet */}
            <SkillSheet
                open={skillSheetOpen}
                onOpenChange={setSkillSheetOpen}
                onClose={() => {
                    setSkillSheetOpen(false);
                    // Reload the page to get updated skills list
                    window.location.reload();
                }}
            />

            {/* Certification Sheet */}
            <CertificationSheet
                open={certificationSheetOpen}
                onOpenChange={setCertificationSheetOpen}
                onClose={() => {
                    setCertificationSheetOpen(false);
                    // Reload the page to get updated certifications list
                    window.location.reload();
                }}
            />
        </div>
    );
} 