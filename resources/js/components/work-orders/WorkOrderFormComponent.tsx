import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Checkbox } from '@/components/ui/checkbox';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { toast } from 'sonner';
import { Pencil, Save } from 'lucide-react';
import { MAINTENANCE_CATEGORIES, QUALITY_CATEGORIES } from '@/types/work-order';
import type { WorkOrder } from '@/types/work-order';

// Icon imports for work order types
import {
    Clock,
    Activity,
    Droplet,
    AlertTriangle,
    Wrench as Tool,
    RefreshCw,
    Eye,
    Thermometer,
    Package,
    TrendingUp,
    Zap,
    type LucideIcon
} from 'lucide-react';

// Icon mapping for work order types
const iconMap: Record<string, LucideIcon> = {
    'clock': Clock,
    'activity': Activity,
    'droplet': Droplet,
    'alert-triangle': AlertTriangle,
    'tool': Tool,
    'refresh-cw': RefreshCw,
    'eye': Eye,
    'thermometer': Thermometer,
    'package': Package,
    'trending-up': TrendingUp,
    'zap': Zap,
};

interface WorkOrderFormData {
    // Basic Information
    work_order_type_id: string;
    work_order_category: string;
    title: string;
    description: string;

    // Asset/Location
    plant_id: string;
    area_id: string;
    sector_id: string;
    asset_id: string;

    // Priority & Scheduling
    priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
    priority_score: number;
    requested_due_date: string;
    downtime_required: boolean;

    // Additional Information
    form_id: string;
    external_reference: string;
    warranty_claim: boolean;
    tags: string[];

    // Hidden fields
    source_type: 'manual';
    discipline: 'maintenance' | 'quality';

    // Index signature for form compatibility
    [key: string]: string | number | boolean | string[] | 'manual' | 'maintenance' | 'quality' | 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
}

interface WorkOrderFormComponentProps {
    workOrder?: WorkOrder;
    workOrderTypes: Array<{ id: number; name: string; category: string; icon?: string }>;
    plants: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; plant_id: number }>;
    sectors: Array<{ id: number; name: string; area_id: number }>;
    assets: Array<{ id: number; tag: string; name: string; plant_id: number; area_id: number; sector_id?: number }>;
    forms: Array<{ id: number; name: string }>;
    discipline: 'maintenance' | 'quality';
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function WorkOrderFormComponent({
    workOrder,
    workOrderTypes,
    plants,
    areas,
    sectors,
    assets,
    forms,
    discipline = 'maintenance',
    initialMode = 'view',
    onSuccess,
    onCancel
}: WorkOrderFormComponentProps) {
    const isEditing = !!workOrder;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Initialize form data
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm<WorkOrderFormData>({
        work_order_type_id: workOrder?.work_order_type_id?.toString() || '',
        work_order_category: workOrder?.work_order_category || (discipline === 'maintenance' ? 'corrective' : 'calibration'),
        title: workOrder?.title || '',
        description: workOrder?.description || '',
        plant_id: workOrder?.asset?.plant_id?.toString() || '',
        area_id: workOrder?.asset?.area_id?.toString() || '',
        sector_id: workOrder?.asset?.sector_id?.toString() || '',
        asset_id: workOrder?.asset_id?.toString() || '',
        priority: workOrder?.priority || 'normal',
        priority_score: workOrder?.priority_score || 40,
        requested_due_date: workOrder?.requested_due_date || '',
        downtime_required: workOrder?.downtime_required || false,
        form_id: workOrder?.form_id?.toString() || '',
        external_reference: workOrder?.external_reference || '',
        warranty_claim: workOrder?.warranty_claim || false,
        tags: workOrder?.tags || [],
        source_type: 'manual',
        discipline: discipline,
    });

    // Get discipline-specific categories
    const categories = discipline === 'maintenance' ? MAINTENANCE_CATEGORIES : QUALITY_CATEGORIES;

    // Transform categories for ItemSelect
    const categoriesForSelect = useMemo(() => {
        return categories.map((category, index) => ({
            id: index + 1, // ItemSelect expects numeric ids
            name: category.label,
            value: category.value,
        }));
    }, [categories]);

    // Priority options for ItemSelect
    const priorityOptions = useMemo(() => [
        { id: 1, name: 'Emergência (Score: 100)', value: 'emergency' },
        { id: 2, name: 'Urgente (Score: 80)', value: 'urgent' },
        { id: 3, name: 'Alta (Score: 60)', value: 'high' },
        { id: 4, name: 'Normal (Score: 40)', value: 'normal' },
        { id: 5, name: 'Baixa (Score: 20)', value: 'low' },
    ], []);

    // Transform workOrderTypes to include actual icon components
    const workOrderTypesWithIcons = useMemo(() => {
        return workOrderTypes.map(type => ({
            ...type,
            icon: type.icon && iconMap[type.icon] ? iconMap[type.icon] : undefined
        }));
    }, [workOrderTypes]);

    // Filter areas based on selected plant
    const filteredAreas = useMemo(() => {
        return areas.filter(area => area.plant_id === parseInt(data.plant_id));
    }, [areas, data.plant_id]);

    // Filter sectors based on selected area
    const filteredSectors = useMemo(() => {
        return sectors.filter(sector => sector.area_id === parseInt(data.area_id));
    }, [sectors, data.area_id]);

    // Filter assets based on selections
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            if (data.sector_id) {
                return asset.sector_id === parseInt(data.sector_id);
            }
            if (data.area_id) {
                return asset.area_id === parseInt(data.area_id);
            }
            if (data.plant_id) {
                return asset.plant_id === parseInt(data.plant_id);
            }
            return true;
        });
    }, [assets, data.plant_id, data.area_id, data.sector_id]);

    // Update priority score based on priority
    const updatePriorityScore = (priority: string) => {
        const scores = {
            emergency: 100,
            urgent: 80,
            high: 60,
            normal: 40,
            low: 20,
        };
        setData({
            ...data,
            priority: priority as any,
            priority_score: scores[priority as keyof typeof scores],
        });
    };

    const handleSave = () => {
        if (isEditing) {
            // Update existing work order
            put(route(`${discipline}.work-orders.update`, workOrder.id), {
                onSuccess: () => {
                    toast.success('Ordem de serviço atualizada com sucesso!');
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar ordem de serviço');
                },
            });
        } else {
            // Create new work order
            post(route(`${discipline}.work-orders.store`), {
                onSuccess: () => {
                    toast.success('Ordem de serviço criada com sucesso!');
                    // The backend will handle the redirect to the work order show page
                },
                onError: (errors) => {
                    toast.error('Erro ao criar ordem de serviço', {
                        description: 'Verifique os campos e tente novamente.'
                    });
                },
            });
        }
    };

    const handleCancel = () => {
        if (isEditing && mode === 'edit') {
            // Reset form to original data
            reset();
            setMode('view');
        } else if (onCancel) {
            onCancel();
        } else {
            // Navigate back to work orders index page
            router.visit(route(`${discipline}.work-orders.index`));
        }
    };

    const handleEdit = () => {
        setMode('edit');
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSave();
            }}
            className="space-y-6"
        >
            {/* Basic Information Section */}
            <div className="space-y-4">

                {/* Title */}
                <div className="space-y-2 -mt-2">
                    <Label htmlFor="title">Título*</Label>
                    {isViewMode ? (
                        <div className="rounded-md border bg-muted/20 p-2 text-sm">
                            {data.title || 'Sem título'}
                        </div>
                    ) : (
                        <>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="Digite um título descritivo"
                                required
                            />
                            {errors.title && <span className="text-sm text-red-500">{errors.title}</span>}
                        </>
                    )}
                </div>

                {/* Category, Type, Priority and Due Date Row */}
                <div className="grid gap-4 md:grid-cols-[25%_25%_25%_25%]">

                    {/* Category */}
                    <div className="space-y-2">
                        <ItemSelect
                            label="Categoria*"
                            items={categoriesForSelect}
                            value={categoriesForSelect.find(cat => cat.value === data.work_order_category)?.id.toString() || ''}
                            onValueChange={(value) => {
                                const selectedCategory = categoriesForSelect.find(cat => cat.id.toString() === value);
                                if (selectedCategory) {
                                    setData('work_order_category', selectedCategory.value as any);
                                }
                            }}
                            placeholder="Selecione a categoria"
                            error={errors.work_order_category}
                            required
                            view={isViewMode}
                            canCreate={false}
                        />
                    </div>

                    {/* Work Order Type */}
                    <ItemSelect
                        label="Tipo de Ordem*"
                        items={workOrderTypesWithIcons}
                        value={data.work_order_type_id}
                        onValueChange={(value) => {
                            const type = workOrderTypesWithIcons.find(t => t.id.toString() === value);
                            setData({
                                ...data,
                                work_order_type_id: value,
                                work_order_category: type?.category || 'corrective',
                            });
                        }}
                        placeholder="Selecione o tipo"
                        error={errors.work_order_type_id}
                        required
                        view={isViewMode}
                    />
                    {/* Priority */}
                    <ItemSelect
                        label="Prioridade*"
                        items={priorityOptions}
                        value={priorityOptions.find(priority => priority.value === data.priority)?.id.toString() || ''}
                        onValueChange={(value) => {
                            const selectedPriority = priorityOptions.find(priority => priority.id.toString() === value);
                            if (selectedPriority) {
                                updatePriorityScore(selectedPriority.value);
                            }
                        }}
                        placeholder="Selecione a prioridade"
                        error={errors.priority}
                        required
                        view={isViewMode}
                        canCreate={false}
                    />

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label htmlFor="requested_due_date">Data de Vencimento Solicitada*</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {data.requested_due_date ?
                                    new Date(data.requested_due_date).toLocaleDateString('pt-BR') :
                                    'Não definida'
                                }
                            </div>
                        ) : (
                            <Input
                                id="requested_due_date"
                                type="datetime-local"
                                value={data.requested_due_date}
                                onChange={(e) => setData('requested_due_date', e.target.value)}
                                required
                            />
                        )}
                        {errors.requested_due_date && (
                            <span className="text-sm text-red-500">{errors.requested_due_date}</span>
                        )}
                    </div>

                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    {isViewMode ? (
                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                            {data.description || 'Sem descrição'}
                        </div>
                    ) : (
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descreva o problema ou serviço necessário"
                            rows={4}
                        />
                    )}
                </div>
            </div>

            {/* Asset Selection Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Localização e Ativo</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Plant */}
                    <ItemSelect
                        label="Planta*"
                        items={plants}
                        value={data.plant_id}
                        onValueChange={(value) => {
                            setData({
                                ...data,
                                plant_id: value,
                                area_id: '',
                                sector_id: '',
                                asset_id: '',
                            });
                        }}
                        placeholder="Selecione a planta"
                        error={errors.plant_id}
                        required={!isViewMode}
                        view={isViewMode}
                    />

                    {/* Area */}
                    <ItemSelect
                        label="Área*"
                        items={filteredAreas}
                        value={data.area_id}
                        onValueChange={(value) => {
                            setData({
                                ...data,
                                area_id: value,
                                sector_id: '',
                                asset_id: '',
                            });
                        }}
                        placeholder="Selecione a área"
                        error={errors.area_id}
                        disabled={!data.plant_id}
                        required={!isViewMode}
                        view={isViewMode}
                    />

                    {/* Sector */}
                    <ItemSelect
                        label="Setor"
                        items={filteredSectors}
                        value={data.sector_id}
                        onValueChange={(value) => {
                            setData({
                                ...data,
                                sector_id: value,
                                asset_id: '',
                            });
                        }}
                        placeholder="Selecione o setor (opcional)"
                        error={errors.sector_id}
                        disabled={!data.area_id}
                        canClear
                        view={isViewMode}
                    />

                    {/* Asset */}
                    <ItemSelect
                        label="Ativo*"
                        items={filteredAssets.map(asset => ({
                            ...asset,
                            name: `${asset.tag} - ${asset.name}`,
                        }))}
                        value={data.asset_id}
                        onValueChange={(value) => setData('asset_id', value)}
                        placeholder="Selecione o ativo"
                        error={errors.asset_id}
                        disabled={!data.area_id}
                        searchable
                        required={!isViewMode}
                        view={isViewMode}
                    />
                </div>
            </div>

            {/* Additional Information Section */}
            {!isViewMode && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Informações Adicionais</h3>

                    {/* Form Template */}
                    <ItemSelect
                        label="Template de Formulário"
                        items={forms}
                        value={data.form_id}
                        onValueChange={(value) => setData('form_id', value)}
                        placeholder="Selecione um formulário (opcional)"
                        canClear
                        view={isViewMode}
                    />

                    {/* Downtime Required */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="downtime_required"
                            checked={data.downtime_required}
                            onCheckedChange={(checked) => setData('downtime_required', checked as boolean)}
                            disabled={isViewMode}
                        />
                        <Label htmlFor="downtime_required">
                            Requer parada do equipamento
                        </Label>
                    </div>

                    {/* External Reference */}
                    <div className="space-y-2">
                        <Label htmlFor="external_reference">Referência Externa</Label>
                        <Input
                            id="external_reference"
                            value={data.external_reference}
                            onChange={(e) => setData('external_reference', e.target.value)}
                            placeholder="Número do pedido, ticket, etc."
                        />
                    </div>

                    {/* Warranty Claim */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="warranty_claim"
                            checked={data.warranty_claim}
                            onCheckedChange={(checked) => setData('warranty_claim', checked === true)}
                            disabled={isViewMode}
                        />
                        <Label htmlFor="warranty_claim">
                            Solicitação de garantia
                        </Label>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
                {/* Left side - empty for create mode */}
                <div />

                {/* Right side - action buttons */}
                <div className="flex gap-2">
                    {isViewMode ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleEdit}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                            >
                                {processing ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar Ordem')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </form>
    );
} 