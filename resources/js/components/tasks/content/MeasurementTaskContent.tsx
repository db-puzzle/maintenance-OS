import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DefaultMeasurement, Task } from '@/types/task';
import { MeasurementUnitCategories, UnitCategory } from '@/types/units';
import { useEffect, useState } from 'react';
import { TaskCardMode } from './TaskContent';

interface MeasurementTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

interface MeasurementFormData {
    targetValue: string;
    minValue: string;
    maxValue: string;
    measuredValue: string;
    [key: string]: any;
}

export default function MeasurementTaskContent({ task, mode, onUpdate }: MeasurementTaskContentProps) {
    const [value, setValue] = useState<number>(0);
    const [category, setCategory] = useState<UnitCategory>('Comprimento');
    const [selectedUnit, setSelectedUnit] = useState<string>('m');
    const [minValue, setMinValue] = useState<number | undefined>(undefined);
    const [maxValue, setMaxValue] = useState<number | undefined>(undefined);
    const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
    const [isValueOutOfRange, setIsValueOutOfRange] = useState<boolean>(false);
    const [isValueAtTarget, setIsValueAtTarget] = useState<boolean>(false);
    const [formData, setFormData] = useState<MeasurementFormData>({
        targetValue: '',
        minValue: '',
        maxValue: '',
        measuredValue: '0',
    });
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
            setValue(0); // Valor medido padrão

            setFormData({
                targetValue: stringifyValue(measurement.target),
                minValue: stringifyValue(measurement.min),
                maxValue: stringifyValue(measurement.max),
                measuredValue: '0',
            });
        }
    }, [measurement]);

    // Verificar se a categoria existe no MeasurementUnitCategories
    const safeCategory = Object.keys(MeasurementUnitCategories).includes(category) ? category : defaultCategory;

    // Converter valores para exibição em formulário
    const stringifyValue = (val: number | undefined): string => {
        return val !== undefined ? String(val) : '';
    };

    // Validação dos valores após as atualizações do formulário para target, min e max
    useEffect(() => {
        // Limpar erros existentes
        const newErrors: Partial<Record<keyof MeasurementFormData, string>> = {};

        // Verificar inconsistências entre valores alvo, mínimo e máximo
        if (targetValue !== undefined && minValue !== undefined && targetValue < minValue) {
            newErrors.targetValue = `O valor alvo não pode ser menor que o mínimo (${minValue})`;
        }

        if (targetValue !== undefined && maxValue !== undefined && targetValue > maxValue) {
            newErrors.targetValue = `O valor alvo não pode ser maior que o máximo (${maxValue})`;
        }

        if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
            newErrors.minValue = `O mínimo não pode ser maior que o máximo (${maxValue})`;
            newErrors.maxValue = `O máximo não pode ser menor que o mínimo (${minValue})`;
        }

        setFormErrors(newErrors);
    }, [targetValue, minValue, maxValue]);

    // Função para validar entrada - apenas números, ponto e vírgula
    const validateInput = (value: string): boolean => {
        return value === '' || /^-?\d*[.,]?\d*$/.test(value);
    };

    // Função para processar valor quando o campo perde o foco
    const processBlur = (name: keyof MeasurementFormData, value: string) => {
        // Processar o valor apenas quando o campo perde o foco
        if (value === '') {
            if (name === 'targetValue') {
                setTargetValue(undefined);
                if (onUpdate) handleUpdate(undefined, minValue, maxValue);
            } else if (name === 'minValue') {
                setMinValue(undefined);
                if (onUpdate) handleUpdate(targetValue, undefined, maxValue);
            } else if (name === 'maxValue') {
                setMaxValue(undefined);
                if (onUpdate) handleUpdate(targetValue, minValue, undefined);
            } else if (name === 'measuredValue') {
                setValue(0);
                setFormData((prev) => ({ ...prev, measuredValue: '0' }));
                // Limpar erros ao redefinir o valor
                setFormErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.measuredValue;
                    return newErrors;
                });
            }
            return;
        }

        // Substituir vírgula por ponto para garantir o formato correto
        const normalizedValue = value.replace(',', '.');
        const numValue = parseFloat(normalizedValue);

        // Verificar se é um número válido, inclusive 0
        if (isNaN(numValue)) {
            return;
        }

        if (name === 'targetValue') {
            setTargetValue(numValue);
            if (onUpdate) handleUpdate(numValue, minValue, maxValue);
        } else if (name === 'minValue') {
            setMinValue(numValue);
            if (onUpdate) handleUpdate(targetValue, numValue, maxValue);
        } else if (name === 'maxValue') {
            setMaxValue(numValue);
            if (onUpdate) handleUpdate(targetValue, minValue, numValue);
        } else if (name === 'measuredValue') {
            setValue(numValue);

            // Verificar limites apenas quando o campo perde o foco
            const newErrors: Partial<Record<keyof MeasurementFormData, string>> = { ...formErrors };
            delete newErrors.measuredValue;

            // Validar o valor medido contra os limites definidos
            if (minValue !== undefined && numValue < minValue) {
                newErrors.measuredValue = `O valor está abaixo do mínimo (${minValue})`;
                setIsValueOutOfRange(true);
            } else if (maxValue !== undefined && numValue > maxValue) {
                newErrors.measuredValue = `O valor está acima do máximo (${maxValue})`;
                setIsValueOutOfRange(true);
            } else {
                setIsValueOutOfRange(false);
            }

            // Verificar se está no valor alvo
            setIsValueAtTarget(targetValue !== undefined && numValue === targetValue);

            setFormErrors(newErrors);
        }
    };

    const form = {
        data: formData,
        setData: (name: keyof MeasurementFormData, value: string) => {
            // Atualizar o formData imediatamente para refletir a entrada do usuário
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        },
        errors: formErrors,
        clearErrors: (...fields: (keyof MeasurementFormData)[]) => {
            const newErrors = { ...formErrors };
            fields.forEach((field) => delete newErrors[field]);
            setFormErrors(newErrors);
        },
        validateInput,
        processBlur,
    };

    const handleUpdate = (target: number | undefined, min: number | undefined, max: number | undefined) => {
        if (onUpdate) {
            onUpdate({
                ...task,
                measurement: {
                    ...measurement,
                    category,
                    unit: selectedUnit,
                    min,
                    max,
                    target,
                },
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
                            target: targetValue,
                        },
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
                        target: targetValue,
                    },
                });
            }
        }
    };

    if (mode === 'edit') {
        return (
            <div className="space-y-3 lg:space-y-4">
                <div className="bg-muted/30 rounded-md pr-4 pb-4 pl-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-27 lg:gap-4">
                        <div className="col-span-1 space-y-2 lg:col-span-7">
                            <ItemSelect
                                label="Categoria"
                                items={
                                    Object.keys(MeasurementUnitCategories).map((cat) => ({
                                        id: cat,
                                        name: cat,
                                    })) as any
                                }
                                value={category}
                                onValueChange={handleCategoryChange}
                                createRoute=""
                                placeholder="Selecione uma categoria"
                                canCreate={false}
                            />
                        </div>

                        <div className="col-span-1 space-y-2 lg:col-span-7">
                            <ItemSelect
                                label="Unidade"
                                items={
                                    MeasurementUnitCategories[safeCategory].map((unit) => ({
                                        id: unit.value,
                                        name: unit.label,
                                    })) as any
                                }
                                value={selectedUnit}
                                onValueChange={handleUnitChange}
                                createRoute=""
                                placeholder="Selecione uma unidade"
                                canCreate={false}
                            />
                        </div>

                        <div className="hidden items-center justify-center lg:col-span-1 lg:flex">
                            <Separator orientation="vertical" className="h-auto" />
                        </div>

                        <div className="my-2 lg:hidden">
                            <Separator className="w-full" />
                        </div>

                        <div className="col-span-1 grid grid-cols-3 gap-3 lg:col-span-12 lg:gap-4">
                            <div className="col-span-1 space-y-2">
                                <TextInput<MeasurementFormData>
                                    form={form}
                                    name="targetValue"
                                    label="Valor Alvo"
                                    placeholder="Sem Alvo"
                                    onBlur={(e) => form.processBlur('targetValue', e.target.value)}
                                />
                            </div>

                            <div className="col-span-1 space-y-2">
                                <TextInput<MeasurementFormData>
                                    form={form}
                                    name="minValue"
                                    label="Valor Mínimo"
                                    placeholder="Sem Min"
                                    onBlur={(e) => form.processBlur('minValue', e.target.value)}
                                />
                            </div>

                            <div className="col-span-1 space-y-2">
                                <TextInput<MeasurementFormData>
                                    form={form}
                                    name="maxValue"
                                    label="Valor Máximo"
                                    placeholder="Sem Max"
                                    onBlur={(e) => form.processBlur('maxValue', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Modos 'preview' e 'respond'
    // Obtém a unidade que será mostrada após cada campo
    const displayedUnit = measurement.unit || '';

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="rounded-md pr-4 pb-4 pl-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-27 lg:gap-4">
                    <div className="col-span-1 space-y-2 lg:col-span-7">
                        {mode === 'preview' ? (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Valor Medido</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={value} className="bg-muted/50" disabled />
                                    <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Label className="text-sm font-medium">Valor Medido</Label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={formData.measuredValue}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                if (validateInput(inputValue)) {
                                                    form.setData('measuredValue', inputValue);
                                                }
                                            }}
                                            onBlur={(e) => form.processBlur('measuredValue', e.target.value)}
                                            className={`${isValueOutOfRange ? 'border-red-500 focus-visible:ring-red-500' : isValueAtTarget ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                                        />
                                        <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                                    </div>
                                    <InputError message={formErrors.measuredValue} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="hidden items-center justify-center lg:col-span-1 lg:flex">
                        <Separator orientation="vertical" className="h-auto" />
                    </div>

                    <div className="my-2 lg:hidden">
                        <Separator className="w-full" />
                    </div>

                    <div className="col-span-1 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-19 lg:gap-4">
                        <div className="col-span-1 space-y-2">
                            <Label className="text-sm font-medium">Valor Alvo</Label>
                            <div className="flex items-center gap-2">
                                <Input value={targetValue !== undefined ? targetValue : ''} placeholder="Sem Alvo" className="bg-muted/50" disabled />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>

                        <div className="col-span-1 space-y-2">
                            <Label className="text-sm font-medium">Valor Mínimo</Label>
                            <div className="flex items-center gap-2">
                                <Input value={minValue !== undefined ? minValue : ''} placeholder="Sem Min" className="bg-muted/50" disabled />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>

                        <div className="col-span-1 space-y-2">
                            <Label className="text-sm font-medium">Valor Máximo</Label>
                            <div className="flex items-center gap-2">
                                <Input value={maxValue !== undefined ? maxValue : ''} placeholder="Sem Max" className="bg-muted/50" disabled />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
