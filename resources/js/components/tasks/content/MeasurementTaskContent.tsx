import { Task, Measurement, DefaultMeasurement } from '@/types/task';
import { useState, useEffect } from 'react';
import { TaskCardMode } from './TaskContent';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MeasurementUnitCategories, UnitCategory } from '@/types/units';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import InputError from '@/components/input-error';

interface MeasurementTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

interface MeasurementFormData {
    targetValue: string;
    minValue: string;
    maxValue: string;
    [key: string]: any;
}

export default function MeasurementTaskContent({ task, mode, onUpdate }: MeasurementTaskContentProps) {
    const [value, setValue] = useState<number>(0);
    const [category, setCategory] = useState<UnitCategory>('Comprimento');
    const [selectedUnit, setSelectedUnit] = useState<string>('m');
    const [minValue, setMinValue] = useState<number | undefined>(undefined);
    const [maxValue, setMaxValue] = useState<number | undefined>(undefined);
    const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof MeasurementFormData, string>>>({});
    const measurement = task.measurement || DefaultMeasurement;

    // Garantir valores iniciais seguros
    const defaultCategory = 'Comprimento';
    
    // Inicializar os valores com base no measurement
    useEffect(() => {
        if (measurement) {
            const initialCategory = measurement.category || defaultCategory;
            setCategory(initialCategory);
            setSelectedUnit(measurement.unit || (MeasurementUnitCategories[initialCategory] && MeasurementUnitCategories[initialCategory][0].value));
            setMinValue(measurement.min);
            setMaxValue(measurement.max);
            setTargetValue(measurement.target);
        }
    }, [measurement]);

    // Verificar se a categoria existe no MeasurementUnitCategories
    const safeCategory = Object.keys(MeasurementUnitCategories).includes(category) 
        ? category 
        : defaultCategory;

    // Converter valores para exibição em formulário
    const stringifyValue = (val: number | undefined): string => {
        return val !== undefined ? String(val) : '';
    };

    // Objeto de formulário para usar com TextInput
    const formData: MeasurementFormData = {
        targetValue: stringifyValue(targetValue),
        minValue: stringifyValue(minValue),
        maxValue: stringifyValue(maxValue)
    };
    
    const form = {
        data: formData,
        setData: (name: keyof MeasurementFormData, value: string) => {
            const numValue = value === '' ? undefined : parseFloat(value);
            
            if (name === 'targetValue') {
                setTargetValue(isNaN(numValue as number) ? undefined : numValue);
                if (onUpdate) handleUpdate(numValue, minValue, maxValue);
            } else if (name === 'minValue') {
                setMinValue(isNaN(numValue as number) ? undefined : numValue);
                if (onUpdate) handleUpdate(targetValue, numValue, maxValue);
            } else if (name === 'maxValue') {
                setMaxValue(isNaN(numValue as number) ? undefined : numValue);
                if (onUpdate) handleUpdate(targetValue, minValue, numValue);
            }
        },
        errors: formErrors,
        clearErrors: (...fields: (keyof MeasurementFormData)[]) => {
            const newErrors = { ...formErrors };
            fields.forEach(field => delete newErrors[field]);
            setFormErrors(newErrors);
        }
    };

    const handleUpdate = (target = targetValue, min = minValue, max = maxValue) => {
        if (onUpdate) {
            onUpdate({
                ...task,
                measurement: {
                    ...measurement,
                    category,
                    unit: selectedUnit,
                    min,
                    max,
                    target
                }
            });
        }
    };

    // Forçar a atualização do componente pai quando a categoria ou unidade mudar
    const handleCategoryChange = (value: string) => {
        if (value && Object.keys(MeasurementUnitCategories).includes(value)) {
            const newCategory = value as UnitCategory;
            // Selecionar a primeira unidade da categoria
            const firstUnit = MeasurementUnitCategories[newCategory][0];
            if (firstUnit) {
                const newUnit = firstUnit.value;
                // Atualizar estado local
                setCategory(newCategory);
                setSelectedUnit(newUnit);
                
                // Enviar para o componente pai
                if (onUpdate) {
                    onUpdate({
                        ...task,
                        measurement: {
                            ...measurement,
                            category: newCategory,
                            unit: newUnit,
                            min: minValue,
                            max: maxValue,
                            target: targetValue
                        }
                    });
                }
            }
        }
    };

    const handleUnitChange = (value: string) => {
        if (value) {
            // Atualizar estado local
            setSelectedUnit(value);
            
            // Enviar para o componente pai
            if (onUpdate) {
                onUpdate({
                    ...task,
                    measurement: {
                        ...measurement,
                        category,
                        unit: value,
                        min: minValue,
                        max: maxValue,
                        target: targetValue
                    }
                });
            }
        }
    };
    
    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="pl-4 pr-4 pb-4 bg-muted/30 rounded-md">
                    <div className="grid grid-cols-27 gap-4">
                        <div className="col-span-7 space-y-2">
                            <ItemSelect
                                label="Categoria"
                                items={Object.keys(MeasurementUnitCategories).map(cat => ({
                                    id: cat,
                                    name: cat
                                })) as any}
                                value={category}
                                onValueChange={handleCategoryChange}
                                createRoute=""
                                placeholder="Selecione uma categoria"
                                canCreate={false}
                            />
                        </div>

                        <div className="col-span-7 space-y-2">
                            <ItemSelect
                                label="Unidade"
                                items={MeasurementUnitCategories[safeCategory].map(unit => ({
                                    id: unit.value,
                                    name: unit.label
                                })) as any}
                                value={selectedUnit}
                                onValueChange={handleUnitChange}
                                createRoute=""
                                placeholder="Selecione uma unidade"
                                canCreate={false}
                            />
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                            <Separator orientation="vertical" className="h-auto" />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <TextInput<MeasurementFormData>
                                form={form}
                                name="targetValue"
                                label="Valor Alvo"
                                placeholder="Alvo"
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <TextInput<MeasurementFormData>
                                form={form}
                                name="minValue"
                                label="Valor Mínimo"
                                placeholder="Mínimo"
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <TextInput<MeasurementFormData>
                                form={form}
                                name="maxValue"
                                label="Valor Máximo"
                                placeholder="Máximo"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Modos 'preview' e 'respond'
    const isOutOfRange = (measurement.min !== undefined && value < measurement.min) || 
                        (measurement.max !== undefined && value > measurement.max);
    
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label 
                    htmlFor="measurement-value" 
                    className="flex justify-between"
                >
                    <span>{measurement.name || ''}</span>
                    <span className="text-muted-foreground text-sm">
                        {(measurement.min !== undefined || measurement.max !== undefined) && (
                            <>
                                ({measurement.min !== undefined ? measurement.min : '-'} - {measurement.max !== undefined ? measurement.max : '-'} {measurement.unit || ''})
                            </>
                        )}
                        {measurement.target !== undefined && (
                            <span className="ml-2">Alvo: {measurement.target} {measurement.unit || ''}</span>
                        )}
                    </span>
                </Label>
                <div className="flex items-center gap-2">
                    <Input
                        id="measurement-value"
                        type="number"
                        value={value === 0 ? '0' : value}
                        onChange={(e) => {
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setValue(isNaN(newValue) ? 0 : newValue);
                        }}
                        className={isOutOfRange ? "border-red-500" : ""}
                        disabled={mode === 'preview'}
                    />
                    <span>{measurement.unit || ''}</span>
                </div>
                {isOutOfRange && (
                    <p className="text-red-500 text-sm">
                        O valor está fora da faixa {measurement.min !== undefined ? `mínima (${measurement.min})` : ''} 
                        {measurement.min !== undefined && measurement.max !== undefined ? ' e ' : ''}
                        {measurement.max !== undefined ? `máxima (${measurement.max})` : ''}.
                    </p>
                )}
            </div>
        </div>
    );
} 