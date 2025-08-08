import React, { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import EmptyCard from '@/components/ui/empty-card';
import { TextInput } from '@/components/TextInput';
import { PartSearchDialog } from '@/components/work-orders/PartSearchDialog';
import { SkillsTable } from '@/components/work-orders/SkillsTable';
import { CertificationsTable } from '@/components/work-orders/CertificationsTable';
import { ItemRequirementsSelector } from '@/components/work-orders/ItemRequirementsSelector';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import SkillSheet from '@/components/skills/SkillSheet';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { ColumnConfig } from '@/types/shared';
import { WorkOrder, Team, WorkOrderPart } from '@/types/work-order';
import { User } from '@/types';
import { Part } from '@/types/maintenance';
import {
    Plus,
    Trash2,
    Calendar as CalendarIcon,
    Package,
    Search,
    AlertCircle,
    Shield,
    CheckCircle,
    Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Skill {
    id: number;
    name: string;
    description?: string | null;
    category: string;
}

interface Certification {
    id: number;
    name: string;
    description?: string | null;
    issuing_organization: string;
    validity_period_days?: number | null;
    active: boolean;
}

interface WorkOrderPlanningTabProps {
    workOrder: WorkOrder;
    technicians?: User[];
    teams?: Team[];
    parts?: Part[];
    skills: Skill[];
    certifications: Certification[];
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
    technicians: _technicians = [],
    teams: _teams = [],
    parts = [],
    skills = [],
    certifications = [],
    canPlan,
    discipline,
    onGoToApproval
}: WorkOrderPlanningTabProps) {
    // All hooks must be declared before any conditional returns
    const [plannedParts, setPlannedParts] = useState<PlanningPart[]>(
        workOrder.parts?.map((part: WorkOrderPart) => ({
            id: part.id?.toString(),
            part_id: part.part_id,
            part_number: part.part_number,
            part_name: part.part_name,
            estimated_quantity: Number(part.estimated_quantity) || 1,
            unit_cost: Number(part.unit_cost) || 0,
            total_cost: Number(part.total_cost) || 0,
        })) || []
    );

    const [partSearchOpen, setPartSearchOpen] = useState(false);
    const [skillSheetOpen, setSkillSheetOpen] = useState(false);
    const [certificationSheetOpen, setCertificationSheetOpen] = useState(false);
    const [newOtherReq, setNewOtherReq] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // Initialize selected skills from workOrder data
    const [selectedSkills, setSelectedSkills] = useState<Skill[]>(() => {
        if (!workOrder.required_skills || workOrder.required_skills.length === 0) return [];

        // Map skill names from workOrder to skill objects
        return workOrder.required_skills
            .map((skillName: string) => skills.find(s => s.name === skillName))
            .filter(Boolean) as Skill[];
    });

    // Initialize selected certifications from workOrder data
    const [selectedCertifications, setSelectedCertifications] = useState<Certification[]>(() => {
        if (!workOrder.required_certifications || workOrder.required_certifications.length === 0) return [];

        // Map certification names from workOrder to certification objects
        return workOrder.required_certifications
            .map((certName: string) => certifications.find(c => c.name === certName))
            .filter(Boolean) as Certification[];
    });

    const { data, setData, post, put, processing, errors, clearErrors } = useForm({
        estimated_hours: workOrder.estimated_hours?.toString() || '',
        labor_cost_per_hour: '150.00',
        estimated_labor_cost: workOrder.estimated_labor_cost || 0,
        downtime_required: workOrder.downtime_required || false,
        other_requirements: workOrder.other_requirements || [],
        number_of_people: workOrder.number_of_people?.toString() || '1',
        required_skills: selectedSkills.map(s => s.name),
        required_certifications: selectedCertifications.map(c => c.name),
        parts: [] as PlanningPart[],
        estimated_parts_cost: workOrder.estimated_parts_cost || 0,
        estimated_total_cost: workOrder.estimated_total_cost || 0,
    });

    // Check if work order is in a state that allows showing planning (view or edit)
    const canShowPlanning = !['requested', 'rejected', 'cancelled'].includes(workOrder.status);

    // Check if planning is complete (status is scheduled or beyond)
    const isPlanned = ['planned', 'scheduled', 'in_progress', 'completed', 'verified', 'closed'].includes(workOrder.status);

    // Find the planning completion entry in status history
    const planningEntry = workOrder.status_history?.find((entry) =>
        entry.from_status === 'planned' && entry.to_status === 'scheduled'
    );

    // Also check for any entry that shows the work order was planned
    const planningRelatedEntry = planningEntry || workOrder.status_history?.find((entry) =>
        (entry.from_status === 'approved' && entry.to_status === 'planned') ||
        (entry.from_status === 'planned' && entry.to_status === 'scheduled')
    );

    // Get planning data from work order if status history doesn't have it
    const planningData = planningRelatedEntry || (isPlanned ? {
        changed_by: workOrder.planned_by,
        changedBy: workOrder.planner,
        created_at: workOrder.planned_at || workOrder.updated_at
    } : null);

    const isViewMode = !canPlan || !['approved', 'planned'].includes(workOrder.status) || isPlanned;

    const calculateLaborCost = React.useCallback(() => {
        const hours = parseFloat(String(data.estimated_hours)) || 0;
        const rate = parseFloat(String(data.labor_cost_per_hour)) || 0;
        const people = parseInt(String(data.number_of_people)) || 1;
        return hours * rate * people;
    }, [data.estimated_hours, data.labor_cost_per_hour, data.number_of_people]);

    const calculatePartsCost = React.useCallback(() => {
        return plannedParts.reduce((sum, part) => {
            const partCost = Number(part.total_cost) || 0;
            return sum + partCost;
        }, 0);
    }, [plannedParts]);

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
    }, [data.estimated_hours, data.labor_cost_per_hour, data.number_of_people, plannedParts, calculateLaborCost, calculatePartsCost, setData]);

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

    // Other requirements handlers
    const handleAddOtherReq = () => {
        if (newOtherReq.trim()) {
            const currentReqs = Array.isArray(data.other_requirements) ? data.other_requirements : [];
            setData('other_requirements', [...currentReqs, newOtherReq.trim()]);
            setNewOtherReq('');
        }
    };

    const handleRemoveOtherReq = (index: number) => {
        const currentReqs = Array.isArray(data.other_requirements) ? data.other_requirements : [];
        setData('other_requirements', currentReqs.filter((_: string, i: number) => i !== index));
    };

    // Skills handlers
    const handleAddSkill = (skill: Skill) => {
        if (!selectedSkills.find(s => s.id === skill.id)) {
            const newSelectedSkills = [...selectedSkills, skill];
            setSelectedSkills(newSelectedSkills);
            setData('required_skills', newSelectedSkills.map(s => s.name));
        }
    };

    const handleRemoveSkill = (skillId: number) => {
        const newSelectedSkills = selectedSkills.filter(s => s.id !== skillId);
        setSelectedSkills(newSelectedSkills);
        setData('required_skills', newSelectedSkills.map(s => s.name));
    };

    // Certifications handlers
    const handleAddCertification = (certification: Certification) => {
        if (!selectedCertifications.find(c => c.id === certification.id)) {
            const newSelectedCertifications = [...selectedCertifications, certification];
            setSelectedCertifications(newSelectedCertifications);
            setData('required_certifications', newSelectedCertifications.map(c => c.name));
        }
    };

    const handleRemoveCertification = (certificationId: number) => {
        const newSelectedCertifications = selectedCertifications.filter(c => c.id !== certificationId);
        setSelectedCertifications(newSelectedCertifications);
        setData('required_certifications', newSelectedCertifications.map(c => c.name));
    };

    const handleAddPart = (part: Part) => {
        const unitCost = Number(part.unit_cost) || 0;
        const newPart: PlanningPart = {
            id: `new-${Date.now()}`,
            part_id: part.id,
            part_number: part.part_number,
            part_name: part.name,
            estimated_quantity: 1,
            unit_cost: unitCost,
            total_cost: unitCost * 1,
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

    // Create form wrapper for TextInput components
    const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
        setData(name as keyof typeof data, value as any);
    };
    
    const formWrapper = {
        data: data as Record<string, string | number | boolean | File | null | undefined>,
        setData: handleSetData,
        errors,
        clearErrors: (...fields: string[]) => clearErrors(...(fields as Array<keyof typeof data>))
    };

    // Early return if work order is not in a state that allows planning
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
            {/* Planning Success Message */}
            {isPlanned && planningData && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold">Ordem de Serviço Planejada</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Planejado por</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{planningData.changedBy?.name || 'Sistema'}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Data do planejamento</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                    {format(new Date(planningData.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Separator />
                </div>
            )}

            {/* Show simpler planned message if we don't have planning data but work order is planned */}
            {isPlanned && !planningData && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold">Ordem de Serviço Planejada</h3>
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3 text-sm">
                        Esta ordem de serviço foi planejada e está com status: <Badge variant="outline">{workOrder.status}</Badge>
                    </div>

                    <Separator />
                </div>
            )}

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
                    <h3 className="text-lg font-medium">Horas de Trabalho e Equipe</h3>

                    <div className="grid gap-4 md:grid-cols-4">
                        <TextInput
                            form={formWrapper}
                            name="estimated_hours"
                            label="Horas Estimadas"
                            placeholder="4.0"
                            required
                            view={isViewMode}
                        />

                        <TextInput
                            form={formWrapper}
                            name="number_of_people"
                            label="Número de Pessoas"
                            placeholder="1"
                            required
                            view={isViewMode}
                        />

                        <TextInput
                            form={formWrapper}
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

                {/* Skills and Certifications Planning */}
                <div className="space-y-4">

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Skills Column */}
                        <ItemRequirementsSelector
                            title="Habilidades Necessárias"
                            items={skills}
                            selectedItems={selectedSkills}
                            onAdd={handleAddSkill}
                            onRemove={handleRemoveSkill}
                            onCreateClick={() => setSkillSheetOpen(true)}
                            isViewMode={isViewMode}
                            placeholder="Selecione ou busque uma habilidade..."
                        >
                            <SkillsTable
                                selectedSkills={selectedSkills}
                                isViewMode={isViewMode}
                                onRemoveSkill={handleRemoveSkill}
                            />
                        </ItemRequirementsSelector>

                        {/* Certifications Column */}
                        <ItemRequirementsSelector
                            title="Certificações Necessárias"
                            items={certifications}
                            selectedItems={selectedCertifications}
                            onAdd={handleAddCertification}
                            onRemove={handleRemoveCertification}
                            onCreateClick={() => setCertificationSheetOpen(true)}
                            isViewMode={isViewMode}
                            placeholder="Selecione ou busque uma certificação..."
                        >
                            <CertificationsTable
                                selectedCertifications={selectedCertifications}
                                isViewMode={isViewMode}
                                onRemoveCertification={handleRemoveCertification}
                            />
                        </ItemRequirementsSelector>
                    </div>
                </div>

                <Separator />

                {/* Parts Planning */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium">Peças Necessárias</h4>
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
                                    data={paginatedParts as unknown[]}
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
                        <div className="text-center py-4 text-muted-foreground border rounded-lg min-h-[60px] flex flex-col justify-center">
                            <Package className="h-6 w-6 mx-auto mb-1" />
                            <p className="text-sm">Nenhuma peça adicionada</p>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Other Requirements */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium">Outros Requisitos</h4>
                    </div>

                    {!isViewMode && (
                        <div className="flex gap-2">
                            <Input
                                value={newOtherReq}
                                onChange={(e) => setNewOtherReq(e.target.value)}
                                placeholder="Ex: LOTO obrigatório"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOtherReq())}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleAddOtherReq}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Other Requirements List */}
                    {Array.isArray(data.other_requirements) && data.other_requirements.length > 0 ? (
                        <div className="[&_td]:py-1 [&_td]:text-sm [&_th]:py-1.5 [&_th]:text-sm">
                            <EntityDataTable
                                data={data.other_requirements.map((req: string, index: number) => ({
                                    id: index,
                                    requirement: req,
                                })) as unknown[]}
                                columns={[
                                    {
                                        key: 'requirement',
                                        label: 'Outros Requisitos',
                                        render: (value, row) => {
                                            const req = row as unknown as { requirement: string };
                                            return (
                                                <span className="text-sm">{req.requirement}</span>
                                            );
                                        },
                                    },
                                ]}
                                actions={!isViewMode ? (row: Record<string, unknown>) => {
                                    const req = row as unknown as { id: number };
                                    return (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveOtherReq(req.id)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    );
                                } : undefined}
                                emptyMessage="Nenhum outro requisito definido"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground border rounded-lg min-h-[60px] flex flex-col justify-center">
                            <Shield className="h-6 w-6 mx-auto mb-1" />
                            <p className="text-sm">Nenhum outro requisito adicionado</p>
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
                    // Reload skills to get the newly created skill
                    router.reload({
                        only: ['skills']
                    });
                }}
            />

            {/* Certification Sheet */}
            <CertificationSheet
                open={certificationSheetOpen}
                onOpenChange={setCertificationSheetOpen}
                onClose={() => {
                    setCertificationSheetOpen(false);
                    // Reload certifications to get the newly created certification
                    router.reload({
                        only: ['certifications']
                    });
                }}
            />
        </div>
    );
} 