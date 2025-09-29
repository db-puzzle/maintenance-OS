import { useForm, router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, Infinity as InfinityIcon, Save, X, CheckCircle2, XCircle } from 'lucide-react';
import StateButton from '@/components/StateButton';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import { WorkCell } from '@/types/production';
import { PortalProvider } from '@/contexts/PortalContext';

interface WorkCellForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    description: string;
    cell_type: 'internal' | 'external';
    has_finite_capacity: boolean;
    default_production_rate_per_hour: string;
    default_unit_of_measure: string;
    default_setup_time_minutes: string;
    max_parallel_executions: string;
    shift_id: string;
    plant_id: string;
    area_id: string;
    sector_id: string;
    manufacturer_id: string;
    is_active: boolean;
}

interface CreateWorkCellSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    workCell?: WorkCell;
    isNew?: boolean;
    onSuccess?: (workCell: WorkCell) => void;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    triggerIcon?: React.ReactNode;
    // Available options
    plants?: { id: number; name: string }[];
    shifts?: { id: number; name: string }[];
    manufacturers?: { id: number; name: string }[];
    unitsOfMeasure?: {
        id: number;
        code: string;
        name: string;
        symbol?: string;
        uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    }[];
}

const CreateWorkCellSheet: React.FC<CreateWorkCellSheetProps> = ({
    isOpen,
    onOpenChange,
    workCell,
    isNew = true,
    onSuccess,
    triggerText = 'Nova Célula de Trabalho',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    triggerIcon,
    plants = [],
    shifts = [],
    manufacturers = [],
    unitsOfMeasure = [],
}) => {
    const { data, setData, processing } = useForm<WorkCellForm>({
        name: workCell?.name || '',
        description: workCell?.description || '',
        cell_type: workCell?.cell_type || 'internal',
        has_finite_capacity: workCell?.has_finite_capacity ?? false,
        default_production_rate_per_hour: workCell?.default_production_rate_per_hour?.toString() || '',
        default_unit_of_measure: workCell?.default_unit_of_measure || 'PC',
        default_setup_time_minutes: workCell?.default_setup_time_minutes?.toString() || '0',
        max_parallel_executions: workCell?.max_parallel_executions?.toString() || '1',
        shift_id: workCell?.shift_id?.toString() || '',
        plant_id: workCell?.plant_id?.toString() || '',
        area_id: workCell?.area_id?.toString() || '',
        sector_id: workCell?.sector_id?.toString() || '',
        manufacturer_id: workCell?.manufacturer_id?.toString() || '',
        is_active: workCell?.is_active ?? true,
    });
    const [internalSheetOpen, setInternalSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sheetContentEl, setSheetContentEl] = useState<HTMLDivElement | null>(null);

    // Local state for client-side validation errors
    const [errors, setErrors] = useState<Partial<Record<keyof WorkCellForm, string>>>({});

    // Location state
    const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
    const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);

    const nameInputRef = useRef<HTMLInputElement>(null);

    // Group units of measure by type for better organization
    const uomByType = React.useMemo(() => {
        const grouped: Record<string, typeof unitsOfMeasure> = {};
        unitsOfMeasure.forEach(uom => {
            if (!grouped[uom.uom_type]) {
                grouped[uom.uom_type] = [];
            }
            grouped[uom.uom_type].push(uom);
        });
        return grouped;
    }, [unitsOfMeasure]);

    // Create custom clearErrors function for local state
    const clearErrors = (...fields: (keyof WorkCellForm)[]) => {
        if (fields.length === 0) {
            setErrors({});
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                fields.forEach(field => delete newErrors[field]);
                return newErrors;
            });
        }
    };

    // Create form adapter for TextInput components
    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Validation function for parallel executions
    const validateParallelExecutions = (value: string): boolean => {
        // Allow empty string while typing
        if (value === '') return true;

        // Check if it's a valid number pattern (digits only)
        if (!/^\d+$/.test(value)) return false;

        const num = parseInt(value);
        // Allow any positive number up to 999
        return !isNaN(num) && num <= 999;
    };

    // Determina se deve usar controle interno ou externo
    const sheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
    const setSheetOpen = isOpen !== undefined && onOpenChange ? onOpenChange : setInternalSheetOpen;

    // Atualiza os dados quando o workCell muda
    useEffect(() => {
        if (workCell && workCell.id) {
            setData({
                name: workCell.name || '',
                description: workCell.description || '',
                cell_type: workCell.cell_type || 'internal',
                has_finite_capacity: workCell.has_finite_capacity ?? false,
                default_production_rate_per_hour: workCell.default_production_rate_per_hour?.toString() || '',
                default_unit_of_measure: workCell.default_unit_of_measure || 'PC',
                default_setup_time_minutes: workCell.default_setup_time_minutes?.toString() || '0',
                max_parallel_executions: workCell.max_parallel_executions?.toString() || '1',
                shift_id: workCell.shift_id?.toString() || '',
                plant_id: workCell.plant_id?.toString() || '',
                area_id: workCell.area_id?.toString() || '',
                sector_id: workCell.sector_id?.toString() || '',
                manufacturer_id: workCell.manufacturer_id?.toString() || '',
                is_active: workCell.is_active ?? true,
            });
        }
    }, [workCell, setData]);

    // Fetch areas when plant changes
    useEffect(() => {
        if (data.plant_id) {
            fetch(route('production.work-cells.get-areas', { plant: data.plant_id }))
                .then(response => response.json())
                .then(data => setAreas(data))
                .catch(error => console.error('Error fetching areas:', error));
        } else {
            setAreas([]);
            setSectors([]);
        }
    }, [data.plant_id]);

    // Fetch sectors when area changes
    useEffect(() => {
        if (data.area_id) {
            fetch(route('production.work-cells.get-sectors', { area: data.area_id }))
                .then(response => response.json())
                .then(data => setSectors(data))
                .catch(error => console.error('Error fetching sectors:', error));
        } else {
            setSectors([]);
        }
    }, [data.area_id]);

    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (sheetOpen && isNew) {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        nameInputRef.current.select();
                    }
                });
            };
            // Try multiple times with increasing delays to handle animation and focus traps
            const timeouts = [100, 300, 500];
            const timers = timeouts.map((delay) => setTimeout(focusInput, delay));
            // Cleanup timeouts
            return () => {
                timers.forEach((timer) => clearTimeout(timer));
            };
        }
    }, [sheetOpen, isNew]);

    const updateData = (key: keyof WorkCellForm, value: string | number | boolean | null | undefined) => {
        setData(key, value);
        // Clear error for this field when user starts typing
        if (errors[key]) {
            clearErrors(key);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (isSubmitting || processing) {
            return;
        }

        // Set submitting state immediately
        setIsSubmitting(true);

        // Client-side validation
        clearErrors(); // Clear any existing errors first

        const validationErrors: Record<string, string> = {};
        if (!data.name) validationErrors.name = 'Nome é obrigatório';
        if (!data.cell_type) validationErrors.cell_type = 'Tipo de célula é obrigatório';

        // Validate finite capacity requirements - shift is only required for cells with finite capacity
        if (data.has_finite_capacity && !data.shift_id) {
            validationErrors.shift_id = 'Turno é obrigatório para células com capacidade finita';
        }

        // Validate parallel executions
        if (data.has_finite_capacity) {
            const parallelExecutions = parseInt(data.max_parallel_executions);
            if (!data.max_parallel_executions || isNaN(parallelExecutions) || parallelExecutions < 1) {
                validationErrors.max_parallel_executions = 'Execuções paralelas deve ser pelo menos 1';
            }
        }

        // Validate external cell requirements
        if (data.cell_type === 'external' && !data.manufacturer_id) {
            validationErrors.manufacturer_id = 'Fabricante é obrigatório para células externas';
        }

        // Set validation errors if any exist
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstError = Object.values(validationErrors)[0];
            toast.error(firstError);
            setIsSubmitting(false); // Reset submitting state on validation error
            return;
        }

        const url = isNew
            ? route('production.work-cells.store')
            : route('production.work-cells.update', { workCell: workCell?.id });
        const method = isNew ? 'post' : 'put';

        // Convert empty strings to null for numeric fields
        const payload = {
            ...data,
            default_production_rate_per_hour: data.default_production_rate_per_hour || null,
            default_setup_time_minutes: parseInt(data.default_setup_time_minutes) || 0,
            max_parallel_executions: parseInt(data.max_parallel_executions) || 1,
            shift_id: data.shift_id || null,
            plant_id: data.plant_id || null,
            area_id: data.area_id || null,
            sector_id: data.sector_id || null,
            manufacturer_id: data.manufacturer_id || null,
        };

        router[method](url, payload, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                // Success message is handled by the backend flash data
                setSheetOpen(false);
                setIsSubmitting(false); // Reset submitting state on success

                // Reset form if creating new
                if (isNew) {
                    setData({
                        name: '',
                        description: '',
                        cell_type: 'internal',
                        has_finite_capacity: false,
                        default_production_rate_per_hour: '',
                        default_unit_of_measure: 'PC',
                        default_setup_time_minutes: '0',
                        max_parallel_executions: '1',
                        shift_id: '',
                        plant_id: '',
                        area_id: '',
                        sector_id: '',
                        manufacturer_id: '',
                        is_active: true,
                    });
                }

                // Call onSuccess callback if provided
                if (onSuccess) {
                    // Debug: log the entire page props to see what's available
                    console.log('Page props after work cell creation:', page.props);

                    // Try to get the work cell from flash data
                    const flashData = (page.props as { flash?: { workCell?: WorkCell } }).flash;
                    const workCellData = flashData?.workCell;

                    console.log('Flash data:', flashData);
                    console.log('Work cell data:', workCellData);

                    if (workCellData) {
                        onSuccess(workCellData);
                    } else {
                        console.warn('No work cell data found in response');
                    }
                }
            },
            onError: (serverErrors) => {
                setErrors(serverErrors as Partial<Record<keyof WorkCellForm, string>>);
                const firstError = Object.values(serverErrors)[0];
                toast.error(firstError || 'Erro ao salvar célula de trabalho');
                setIsSubmitting(false); // Reset submitting state on error
            },
            onFinish: () => {
                // This will run whether the request succeeds or fails
                // But we're already handling it in onSuccess and onError
            },
        });
    };

    const handleCancel = () => {
        // Reset form to original values
        if (workCell) {
            setData({
                name: workCell.name || '',
                description: workCell.description || '',
                cell_type: workCell.cell_type || 'internal',
                has_finite_capacity: workCell.has_finite_capacity ?? false,
                default_production_rate_per_hour: workCell.default_production_rate_per_hour?.toString() || '',
                default_unit_of_measure: workCell.default_unit_of_measure || 'PC',
                default_setup_time_minutes: workCell.default_setup_time_minutes?.toString() || '0',
                max_parallel_executions: workCell.max_parallel_executions?.toString() || '1',
                shift_id: workCell.shift_id?.toString() || '',
                plant_id: workCell.plant_id?.toString() || '',
                area_id: workCell.area_id?.toString() || '',
                sector_id: workCell.sector_id?.toString() || '',
                manufacturer_id: workCell.manufacturer_id?.toString() || '',
                is_active: workCell.is_active ?? true,
            });
        } else {
            setData({
                name: '',
                description: '',
                cell_type: 'internal',
                has_finite_capacity: false,
                default_production_rate_per_hour: '',
                default_unit_of_measure: 'PC',
                default_setup_time_minutes: '0',
                max_parallel_executions: '1',
                shift_id: '',
                plant_id: '',
                area_id: '',
                sector_id: '',
                manufacturer_id: '',
                is_active: true,
            });
        }
        setErrors({});
        setIsSubmitting(false); // Reset submitting state
        setSheetOpen(false);
    };

    const sheetContent = (
        <SheetContent ref={setSheetContentEl} className="w-full overflow-y-auto sm:max-w-[650px]">
            <PortalProvider container={sheetContentEl}>
                <form onSubmit={handleSubmit}>
                    <SheetHeader>
                        <SheetTitle>{isNew ? 'Nova Célula de Trabalho' : 'Editar Célula de Trabalho'}</SheetTitle>
                        <SheetDescription>
                            {isNew ? 'Preencha os dados para criar uma nova célula de trabalho.' : 'Atualize os dados da célula de trabalho.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 px-4">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <TextInput
                                ref={nameInputRef}
                                form={formAdapter}
                                name="name"
                                label="Nome da Célula"
                                placeholder="Nome da célula de trabalho"
                                required
                                disabled={isSubmitting || processing}
                            />
                            <TextInput
                                form={formAdapter}
                                name="description"
                                label="Descrição"
                                placeholder="Descrição da célula de trabalho"
                                disabled={isSubmitting || processing}
                            />
                        </div>

                        {/* Tipo de Célula */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Tipo de Célula</h3>
                            <div className="space-y-3">
                                <StateButton
                                    icon={Building2}
                                    title="Célula Interna"
                                    description="Célula de trabalho operada internamente pela empresa"
                                    selected={data.cell_type === 'internal'}
                                    onClick={() => {
                                        updateData('cell_type', 'internal');
                                        // Clear manufacturer when switching to internal
                                        updateData('manufacturer_id', '');
                                    }}
                                    disabled={isSubmitting || processing}
                                />
                                {data.cell_type === 'internal' && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-4">
                                            <ItemSelect
                                                label="Planta"
                                                items={plants}
                                                value={data.plant_id}
                                                onValueChange={(value) => {
                                                    updateData('plant_id', value);
                                                    // Clear dependent fields
                                                    updateData('area_id', '');
                                                    updateData('sector_id', '');
                                                }}
                                                placeholder="Selecione uma planta"
                                                error={errors.plant_id}
                                                canClear
                                            />
                                            {data.plant_id && (
                                                <ItemSelect
                                                    label="Área"
                                                    items={areas}
                                                    value={data.area_id}
                                                    onValueChange={(value) => {
                                                        updateData('area_id', value);
                                                        // Clear dependent field
                                                        updateData('sector_id', '');
                                                    }}
                                                    placeholder="Selecione uma área"
                                                    error={errors.area_id}
                                                    canClear
                                                />
                                            )}
                                            {data.area_id && (
                                                <ItemSelect
                                                    label="Setor"
                                                    items={sectors}
                                                    value={data.sector_id}
                                                    onValueChange={(value) => updateData('sector_id', value)}
                                                    placeholder="Selecione um setor"
                                                    error={errors.sector_id}
                                                    canClear
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                                <StateButton
                                    icon={Factory}
                                    title="Célula Externa"
                                    description="Célula de trabalho operada por um fornecedor externo"
                                    selected={data.cell_type === 'external'}
                                    onClick={() => {
                                        updateData('cell_type', 'external');
                                        // Clear location fields when switching to external
                                        updateData('plant_id', '');
                                        updateData('area_id', '');
                                        updateData('sector_id', '');
                                    }}
                                    disabled={isSubmitting || processing}
                                />
                                {data.cell_type === 'external' && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-4">
                                            <ItemSelect
                                                label="Fabricante"
                                                items={manufacturers}
                                                value={data.manufacturer_id}
                                                onValueChange={(value) => updateData('manufacturer_id', value)}
                                                placeholder="Selecione um fabricante"
                                                error={errors.manufacturer_id}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Capacidade */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Capacidade</h3>
                            <div className="space-y-3">
                                <StateButton
                                    icon={InfinityIcon}
                                    title="Capacidade Infinita"
                                    description="A célula tem capacidade ilimitada (ex: operações terceirizadas)"
                                    selected={!data.has_finite_capacity}
                                    onClick={() => {
                                        updateData('has_finite_capacity', false);
                                        // Clear finite capacity related fields
                                        updateData('shift_id', '');
                                        updateData('default_production_rate_per_hour', '');
                                        updateData('default_setup_time_minutes', '0');
                                        updateData('max_parallel_executions', '1');
                                    }}
                                    disabled={isSubmitting || processing}
                                />
                                <StateButton
                                    icon={Building2}
                                    title="Capacidade Finita"
                                    description="A célula tem limitações de capacidade baseadas em turnos e taxas de produção"
                                    selected={data.has_finite_capacity}
                                    onClick={() => updateData('has_finite_capacity', true)}
                                    disabled={isSubmitting || processing}
                                />
                                {data.has_finite_capacity && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-4">
                                            <ItemSelect
                                                label="Turno"
                                                items={shifts}
                                                value={data.shift_id}
                                                onValueChange={(value) => updateData('shift_id', value)}
                                                placeholder="Selecione um turno"
                                                error={errors.shift_id}
                                                required
                                                canClear
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <TextInput
                                                            form={formAdapter}
                                                            name="default_production_rate_per_hour"
                                                            label="Taxa Padrão de Produção"
                                                            placeholder="100"
                                                            disabled={isSubmitting || processing}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground mb-2 whitespace-nowrap">por hora</span>
                                                </div>
                                                <div>
                                                    <Label htmlFor="default_unit_of_measure">Unidade de Medida</Label>
                                                    <Select
                                                        value={data.default_unit_of_measure}
                                                        onValueChange={(value) => updateData('default_unit_of_measure', value)}
                                                        disabled={isSubmitting || processing}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecione uma unidade" />
                                                        </SelectTrigger>
                                                        <SelectContent container={sheetContentEl}>
                                                            {Object.entries(uomByType).map(([type, units]) => (
                                                                <SelectGroup key={type}>
                                                                    <SelectLabel>
                                                                        {type === 'COUNT' ? 'Contagem' :
                                                                            type === 'MASS' ? 'Massa' :
                                                                                type === 'LENGTH' ? 'Comprimento' :
                                                                                    type === 'AREA' ? 'Área' :
                                                                                        type === 'VOLUME' ? 'Volume' :
                                                                                            type === 'TIME' ? 'Tempo' : type}
                                                                    </SelectLabel>
                                                                    {units.map((uom) => (
                                                                        <SelectItem key={uom.id} value={uom.code}>
                                                                            {uom.code} - {uom.name}
                                                                            {uom.symbol && ` (${uom.symbol})`}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.default_unit_of_measure && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.default_unit_of_measure}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-end gap-2">
                                                        <div className="flex-1">
                                                            <TextInput
                                                                form={formAdapter}
                                                                name="default_setup_time_minutes"
                                                                label="Tempo Padrão de Setup"
                                                                placeholder="30"
                                                                type="number"
                                                                min="0"
                                                                max="9999"
                                                                disabled={isSubmitting || processing}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-muted-foreground pb-1 whitespace-nowrap">minutos</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">Tempo padrão de preparação/setup em minutos</p>
                                                </div>
                                                <div>
                                                    <TextInput
                                                        form={formAdapter}
                                                        name="max_parallel_executions"
                                                        label="Execuções Paralelas Máximas"
                                                        placeholder="1"
                                                        type="number"
                                                        min="1"
                                                        max="999"
                                                        required
                                                        disabled={isSubmitting || processing}
                                                        validateInput={validateParallelExecutions}
                                                        helperText="Máximo de operações em paralelo"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Status</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <StateButton
                                    icon={CheckCircle2}
                                    title="Ativa"
                                    description="Célula de trabalho está ativa e disponível para uso"
                                    selected={data.is_active}
                                    onClick={() => updateData('is_active', true)}
                                    disabled={isSubmitting || processing}
                                    variant="green"
                                />
                                <StateButton
                                    icon={XCircle}
                                    title="Inativa"
                                    description="Célula de trabalho está inativa e não disponível para uso"
                                    selected={!data.is_active}
                                    onClick={() => updateData('is_active', false)}
                                    disabled={isSubmitting || processing}
                                    variant="red"
                                />
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6">
                        <Button type="submit" disabled={isSubmitting || processing}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting || processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting || processing}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </PortalProvider>
        </SheetContent>
    );

    if (showTrigger) {
        return (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerIcon || <Building2 className="mr-2 h-4 w-4" />}
                        {triggerText}
                    </Button>
                </SheetTrigger>
                {sheetContent}
            </Sheet>
        );
    }

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {sheetContent}
        </Sheet>
    );
};

export default CreateWorkCellSheet;