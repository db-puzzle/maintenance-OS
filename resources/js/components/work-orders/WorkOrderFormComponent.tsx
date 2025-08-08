import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { Switch } from '@/components/ui/switch';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { AssetSearchDialog } from '@/components/work-orders/AssetSearchDialog';
import { DeleteWorkOrder } from '@/components/work-orders/delete-work-order';
import { toast } from 'sonner';
import { Pencil, ChevronDownIcon, Search } from 'lucide-react';

import type { WorkOrder, WorkOrderCategory } from '@/types/work-order';

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
    work_order_category_id: string;
    title: string;
    description: string;

    // Asset/Location
    plant_id: string;
    area_id: string;
    sector_id: string;
    asset_id: string;

    // Priority & Scheduling
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
    [key: string]: string | number | boolean | string[] | 'manual' | 'maintenance' | 'quality';
}

interface WorkOrderFormComponentProps {
    workOrder?: WorkOrder;
    categories: WorkOrderCategory[];
    workOrderTypes: Array<{
        id: number;
        name: string;
        category: string;
        work_order_category_id: number;
        icon?: string;
        color?: string;
        default_priority_score?: number;
    }>;
    plants: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; plant_id: number }>;
    sectors: Array<{ id: number; name: string; area_id: number }>;
    assets: Array<{ id: number; tag: string; name: string; plant_id: number; area_id: number; sector_id?: number }>;
    forms: Array<{ id: number; name: string }>;
    discipline: 'maintenance' | 'quality';
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
    onCancel?: () => void;
    preselectedAssetId?: string | number;
    preselectedAsset?: { id: number; tag: string; name: string; plant_id: number; area_id: number; sector_id?: number };
}

export function WorkOrderFormComponent({
    workOrder,
    categories,
    workOrderTypes,
    plants,
    areas,
    sectors,
    assets,
    forms,
    discipline = 'maintenance',
    initialMode = 'view',
    onSuccess,
    onCancel,
    preselectedAssetId,
    preselectedAsset
}: WorkOrderFormComponentProps) {
    const isEditing = !!workOrder;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Date picker state
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    // Asset search dialog state
    const [assetSearchOpen, setAssetSearchOpen] = useState(false);

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Initialize form data
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm<WorkOrderFormData>({
        work_order_type_id: workOrder?.work_order_type_id?.toString() || '',
        work_order_category_id: workOrder?.work_order_category_id?.toString() || '',
        title: workOrder?.title || '',
        description: workOrder?.description || '',
        plant_id: workOrder?.asset?.plant_id?.toString() || preselectedAsset?.plant_id?.toString() || '',
        area_id: workOrder?.asset?.area_id?.toString() || preselectedAsset?.area_id?.toString() || '',
        sector_id: workOrder?.asset?.sector_id?.toString() || preselectedAsset?.sector_id?.toString() || '',
        asset_id: workOrder?.asset_id?.toString() || preselectedAssetId?.toString() || '',
        priority_score: workOrder?.priority_score || 50,
        requested_due_date: workOrder?.requested_due_date || '',
        downtime_required: workOrder?.downtime_required || false,
        form_id: workOrder?.form_id?.toString() || '',
        external_reference: workOrder?.external_reference || '',
        warranty_claim: workOrder?.warranty_claim || false,
        tags: workOrder?.tags || [],
        source_type: 'manual',
        discipline: discipline,
    });

    // Transform categories for ItemSelect
    const categoriesForSelect = useMemo(() => {
        return (categories || []).map(category => ({
            id: category.id,
            name: category.name,
            value: category.code,
        }));
    }, [categories]);



    // Filter work order types based on selected category
    const filteredWorkOrderTypes = useMemo(() => {
        if (!data.work_order_category_id) return workOrderTypes || [];
        return (workOrderTypes || []).filter(type =>
            type.work_order_category_id === parseInt(data.work_order_category_id)
        );
    }, [workOrderTypes, data.work_order_category_id]);

    // Transform workOrderTypes to include actual icon components
    const workOrderTypesWithIcons = useMemo(() => {
        return filteredWorkOrderTypes.map(type => ({
            ...type,
            icon: type.icon && iconMap[type.icon] ? iconMap[type.icon] : undefined
        }));
    }, [filteredWorkOrderTypes]);



    // Get the selected asset details
    const selectedAsset = useMemo(() => {
        if (!data.asset_id) return null;
        return (assets || []).find(asset => asset.id === parseInt(data.asset_id));
    }, [data.asset_id, assets]);

    // Handle asset selection from dialog
    const handleAssetSelect = (assetId: string) => {
        const asset = (assets || []).find(a => a.id === parseInt(assetId));
        if (asset) {
            setData({
                ...data,
                asset_id: assetId,
                plant_id: asset.plant_id ? asset.plant_id.toString() : '',
                area_id: asset.area_id ? asset.area_id.toString() : '',
                sector_id: asset.sector_id?.toString() || '',
            });
        }
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
            // Remove timezone indicator (Z or +/-HHMM)
            cleanTime = cleanTime.replace(/[Z].*$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
            // Remove microseconds (keep only HH:MM:SS)
            cleanTime = cleanTime.split('.')[0];
            // Ensure we have at least HH:MM:SS format
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

        // Format date as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Ensure time has seconds
        const [hours, minutes, seconds = '00'] = time.split(':');
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;

        // Return in datetime-local format
        return `${year}-${month}-${day}T${formattedTime}`;
    };

    // Parse current datetime value
    const currentDateTime = parseDateTime(data.requested_due_date);

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
        // Only allow editing if work order is in 'requested' status
        if (workOrder && workOrder.status !== 'requested') {
            toast.error('Esta ordem de serviço não pode ser editada pois já foi aprovada.');
            return;
        }
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

                {/* Title and Asset Selection Row */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr] -mt-2">

                    {/* Asset Selection */}
                    <div className="space-y-2">
                        <Label>Ativo{discipline === 'maintenance' && !isViewMode ? '*' : ''}</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {selectedAsset ? (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{selectedAsset.tag}</span>
                                        <span className="text-muted-foreground">{selectedAsset.name}</span>
                                    </div>
                                ) : (
                                    'Nenhum ativo selecionado'
                                )}
                            </div>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant={preselectedAssetId ? "secondary" : "outline"}
                                    className="w-full justify-between"
                                    onClick={() => !preselectedAssetId && setAssetSearchOpen(true)}
                                    disabled={!!preselectedAssetId}
                                >
                                    {selectedAsset ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{selectedAsset.tag}</span>
                                            <span className="text-muted-foreground">{selectedAsset.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Search className="h-4 w-4" />
                                            <span>Selecionar Ativo</span>
                                        </div>
                                    )}
                                    {!preselectedAssetId && <ChevronDownIcon className="h-4 w-4" />}
                                </Button>
                                {errors.asset_id && <span className="text-sm text-red-500">{errors.asset_id}</span>}
                            </>
                        )}
                    </div>

                    {/* Title - spans 3 columns */}
                    <div className="md:col-span-3">
                        <TextInput
                            form={{ 
                                data: data as Record<string, string | number | boolean | File | null | undefined>, 
                                setData: setData as any, 
                                errors, 
                                clearErrors 
                            }}
                            name="title"
                            label="Título"
                            placeholder="Digite um título descritivo"
                            required={!isViewMode}
                            view={isViewMode}
                        />
                    </div>

                </div>

                {/* Category, Type, Priority and Due Date Row */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr]">

                    {/* Category */}
                    <div className="space-y-2">
                        <ItemSelect
                            label="Categoria"
                            items={categoriesForSelect}
                            value={data.work_order_category_id || ''}
                            onValueChange={(value) => {
                                const selectedCategory = (categories || []).find(cat => cat.id.toString() === value);
                                if (selectedCategory) {
                                    setData(prev => ({
                                        ...prev,
                                        work_order_category_id: value,
                                        work_order_type_id: '', // Reset type when category changes
                                    }));
                                }
                            }}
                            placeholder="Selecione a categoria"
                            error={errors.work_order_category_id}
                            required={!isViewMode}
                            view={isViewMode}
                            canCreate={false}
                        />
                    </div>

                    {/* Work Order Type */}
                    <ItemSelect
                        label="Tipo de Ordem"
                        items={workOrderTypesWithIcons}
                        value={data.work_order_type_id}
                        onValueChange={(value) => {
                            const type = workOrderTypesWithIcons.find(t => t.id.toString() === value);
                            if (type && type.default_priority_score) {
                                setData(prev => ({
                                    ...prev,
                                    work_order_type_id: value,
                                    priority_score: type.default_priority_score || 50,
                                }));
                            } else {
                                setData('work_order_type_id', value);
                            }
                        }}
                        placeholder={!isViewMode && !data.work_order_category_id ? "Selecione uma categoria primeiro" : "Selecione o tipo"}
                        error={errors.work_order_type_id}
                        required={!isViewMode}
                        view={isViewMode}
                        disabled={!isViewMode && !data.work_order_category_id}
                    />
                    {/* Priority */}
                    <div className="space-y-2">
                        <Label htmlFor="priority_score">Prioridade (0-100)</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {data.priority_score}
                            </div>
                        ) : (
                            <>
                                <Input
                                    id="priority_score"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={data.priority_score}
                                    onChange={(e) => setData('priority_score', parseInt(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                    onWheel={(e) => e.preventDefault()}
                                    placeholder="50"
                                    disabled={processing}
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </>
                        )}
                        {errors.priority_score && <span className="text-sm text-red-500">{errors.priority_score}</span>}
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2 min-w-0">
                        <Label>Data de Vencimento Solicitada</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {data.requested_due_date ? (
                                    `${new Date(data.requested_due_date).toLocaleDateString('pt-BR')} às ${new Date(data.requested_due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                ) : (
                                    'Não definida'
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2 min-w-0">
                                <div className="flex-1 min-w-0">
                                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between font-normal"
                                                type="button"
                                            >
                                                <span className="truncate">
                                                    {currentDateTime.date ?
                                                        currentDateTime.date.toLocaleDateString('pt-BR') :
                                                        "Selecionar data"
                                                    }
                                                </span>
                                                <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={currentDateTime.date}
                                                captionLayout="dropdown"
                                                onSelect={(date) => {
                                                    const newDateTime = combineDateTime(date, currentDateTime.time || '12:00:00');
                                                    setData('requested_due_date', newDateTime);
                                                    setDatePickerOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Input
                                        type="time"
                                        step="1"
                                        value={currentDateTime.time || '12:00:00'}
                                        onChange={(e) => {
                                            const newDateTime = combineDateTime(currentDateTime.date || new Date(), e.target.value);
                                            setData('requested_due_date', newDateTime);
                                        }}
                                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                    />
                                </div>
                            </div>
                        )}
                        {errors.requested_due_date && (
                            <span className="text-sm text-red-500">{errors.requested_due_date}</span>
                        )}
                    </div>

                </div>

                {/* Description Row */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr]">
                    <div className="space-y-2 md:col-span-4">
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

                {/* Additional Information Row */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr]">
                    {/* Form Template */}
                    <div className="space-y-2">
                        <ItemSelect
                            label="Template de Formulário"
                            items={forms}
                            value={data.form_id}
                            onValueChange={(value) => setData('form_id', value)}
                            placeholder="Selecione um formulário (opcional)"
                            canClear
                            view={isViewMode}
                        />
                    </div>

                    {/* External Reference */}
                    <div className="space-y-2">
                        <Label htmlFor="external_reference">Referência Externa</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {data.external_reference || 'Sem referência'}
                            </div>
                        ) : (
                            <Input
                                id="external_reference"
                                value={data.external_reference}
                                onChange={(e) => setData('external_reference', e.target.value)}
                                placeholder="Número do pedido, ticket, etc."
                            />
                        )}
                    </div>

                    {/* Downtime Required */}
                    <div className="space-y-2">
                        <Label htmlFor="downtime_required">Parada Requerida</Label>
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
                                    disabled={isViewMode}
                                />
                                <Label htmlFor="downtime_required" className="text-sm">
                                    Requer parada do equipamento
                                </Label>
                            </div>
                        )}
                    </div>

                    {/* Warranty Claim */}
                    <div className="space-y-2">
                        <Label htmlFor="warranty_claim">Garantia</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {data.warranty_claim ? 'Sim' : 'Não'}
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 pt-2">
                                <Switch
                                    id="warranty_claim"
                                    checked={data.warranty_claim}
                                    onCheckedChange={(checked) => setData('warranty_claim', checked === true)}
                                    disabled={isViewMode}
                                />
                                <Label htmlFor="warranty_claim" className="text-sm">
                                    Solicitação de garantia
                                </Label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Asset Search Dialog */}
            <AssetSearchDialog
                open={assetSearchOpen}
                onOpenChange={setAssetSearchOpen}
                assets={assets}
                plants={plants}
                areas={areas}
                sectors={sectors}
                selectedAssetId={data.asset_id}
                onSelectAsset={handleAssetSelect}
            />

            {/* Action Buttons */}
            {isEditing && (
                <div className="flex justify-between pt-4">
                    {/* Left side - delete button when in edit mode */}
                    <div>
                        {!isViewMode && workOrder && (
                            <DeleteWorkOrder
                                workOrderId={workOrder.id}
                                workOrderNumber={workOrder.work_order_number}
                                discipline={discipline}
                            />
                        )}
                    </div>

                    {/* Right side - action buttons */}
                    <div className="flex gap-2">
                        {isViewMode ? (
                            workOrder?.status === 'requested' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleEdit}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            )
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
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Action buttons for create mode */}
            {!isEditing && (
                <div className="flex justify-end pt-4">
                    <div className="flex gap-2">
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
                            {processing ? 'Criando...' : 'Criar Ordem'}
                        </Button>
                    </div>
                </div>
            )}
        </form>
    );
} 