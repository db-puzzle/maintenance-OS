import React, { useEffect, useRef, useState } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { WorkCell } from '@/types/production';

interface WorkCellForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    description: string;
    cell_type: 'internal' | 'external';
    available_hours_per_day: string;
    efficiency_percentage: string;
    shift_id: string;
    plant_id: string;
    area_id: string;
    sector_id: string;
    manufacturer_id: string;
    is_active: boolean;
}
interface CreateWorkCellSheetProps {
    workCell?: WorkCell;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: 'create' | 'edit';
    onSuccess?: () => void;
    plants?: {
        id: number;
        name: string;
    }[];
    shifts?: {
        id: number;
        name: string;
    }[];
    manufacturers?: {
        id: number;
        name: string;
    }[];
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}
const CreateWorkCellSheet: React.FC<CreateWorkCellSheetProps> = ({
    workCell,
    open,
    onOpenChange,
    mode = 'create',
    onSuccess,
    plants = [],
    shifts = [],
    manufacturers = [],
    triggerText = 'Nova Célula de Trabalho',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
}) => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [areas, setAreas] = useState<{ id: number; name: string }[]>([]);
    const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
    const [cellType, setCellType] = useState<'internal' | 'external'>(workCell?.cell_type || 'internal');
    const [selectedPlantId, setSelectedPlantId] = useState<string>(workCell?.plant_id?.toString() || '');
    const [selectedAreaId, setSelectedAreaId] = useState<string>(workCell?.area_id?.toString() || '');
    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (open && mode === 'create') {
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
    }, [open, mode]);
    // Fetch areas when plant changes
    useEffect(() => {
        if (selectedPlantId) {
            fetch(route('production.work-cells.get-areas', { plant: selectedPlantId }))
                .then(response => response.json())
                .then(data => setAreas(data))
                .catch(error => console.error('Error fetching areas:', error));
        } else {
            setAreas([]);
            setSectors([]);
        }
    }, [selectedPlantId]);
    // Fetch sectors when area changes
    useEffect(() => {
        if (selectedAreaId) {
            fetch(route('production.work-cells.get-sectors', { area: selectedAreaId }))
                .then(response => response.json())
                .then(data => setSectors(data))
                .catch(error => console.error('Error fetching sectors:', error));
        } else {
            setSectors([]);
        }
    }, [selectedAreaId]);
    // Handle onOpenChange to focus when sheet opens
    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }
        // Focus the input when opening in create mode
        if (open && mode === 'create') {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        }
    };
    return (
        <BaseEntitySheet<WorkCellForm>
            entity={workCell}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            triggerText={triggerText}
            triggerVariant={triggerVariant}
            showTrigger={showTrigger}
            triggerRef={triggerRef}
            formConfig={{
                initialData: {
                    name: '',
                    description: '',
                    cell_type: 'internal',
                    available_hours_per_day: '8',
                    efficiency_percentage: '85',
                    shift_id: '',
                    plant_id: '',
                    area_id: '',
                    sector_id: '',
                    manufacturer_id: '',
                    is_active: true,
                },
                createRoute: 'production.work-cells.store',
                updateRoute: 'production.work-cells.update',
                entityName: 'Célula de Trabalho',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome da Célula"
                        placeholder="Nome da célula de trabalho"
                        required
                    />
                    {/* Descrição */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="description"
                        label="Descrição"
                        placeholder="Descrição da célula de trabalho"
                    />
                    {/* Tipo de Célula */}
                    <div className="grid gap-2">
                        <Label>Tipo de Célula <span className="text-destructive">*</span></Label>
                        <RadioGroup
                            value={data.cell_type}
                            onValueChange={(value) => {
                                setData('cell_type', value);
                                setCellType(value as 'internal' | 'external');
                                // Clear location fields when switching to external
                                if (value === 'external') {
                                    setData('plant_id', '');
                                    setData('area_id', '');
                                    setData('sector_id', '');
                                    setSelectedPlantId('');
                                    setSelectedAreaId('');
                                }
                                // Clear manufacturer when switching to internal
                                if (value === 'internal') {
                                    setData('manufacturer_id', '');
                                }
                            }}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="internal" id="internal" />
                                <Label htmlFor="internal">Interna</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="external" id="external" />
                                <Label htmlFor="external">Externa</Label>
                            </div>
                        </RadioGroup>
                        {errors.cell_type && <span className="text-destructive text-sm">{errors.cell_type}</span>}
                    </div>
                    {/* Capacidade */}
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="available_hours_per_day"
                            label="Horas Disponíveis/Dia"
                            placeholder="8"
                            required
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="efficiency_percentage"
                            label="Eficiência (%)"
                            placeholder="85"
                            required
                        />
                    </div>
                    {/* Turno */}
                    <ItemSelect
                        label="Turno"
                        items={shifts}
                        value={data.shift_id?.toString() || ''}
                        onValueChange={(value) => setData('shift_id', value)}
                        placeholder="Selecione um turno"
                        error={errors.shift_id}
                        canClear
                    />
                    {/* Localização - Only for internal cells */}
                    {cellType === 'internal' && (
                        <>
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={data.plant_id?.toString() || ''}
                                onValueChange={(value) => {
                                    setData('plant_id', value);
                                    setSelectedPlantId(value);
                                    // Clear dependent fields
                                    setData('area_id', '');
                                    setData('sector_id', '');
                                    setSelectedAreaId('');
                                }}
                                placeholder="Selecione uma planta"
                                error={errors.plant_id}
                                canClear
                            />
                            {selectedPlantId && (
                                <ItemSelect
                                    label="Área"
                                    items={areas}
                                    value={data.area_id?.toString() || ''}
                                    onValueChange={(value) => {
                                        setData('area_id', value);
                                        setSelectedAreaId(value);
                                        // Clear dependent field
                                        setData('sector_id', '');
                                    }}
                                    placeholder="Selecione uma área"
                                    error={errors.area_id}
                                    canClear
                                />
                            )}
                            {selectedAreaId && (
                                <ItemSelect
                                    label="Setor"
                                    items={sectors}
                                    value={data.sector_id?.toString() || ''}
                                    onValueChange={(value) => setData('sector_id', value)}
                                    placeholder="Selecione um setor"
                                    error={errors.sector_id}
                                    canClear
                                />
                            )}
                        </>
                    )}
                    {/* Fabricante - Only for external cells */}
                    {cellType === 'external' && (
                        <ItemSelect
                            label="Fabricante"
                            items={manufacturers}
                            value={data.manufacturer_id?.toString() || ''}
                            onValueChange={(value) => setData('manufacturer_id', value)}
                            placeholder="Selecione um fabricante"
                            error={errors.manufacturer_id}
                            required
                        />
                    )}
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="is_active">Ativa</Label>
                        <Switch
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked)}
                        />
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};
export default CreateWorkCellSheet;