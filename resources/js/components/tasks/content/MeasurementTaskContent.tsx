import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DefaultMeasurement } from '@/types/task';
import { MeasurementUnitCategories, UnitCategory } from '@/types/units';
import { useEffect, useState } from 'react';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';
// This type alias extends WithSaveFunctionalityProps and is reserved for future measurement-specific props
type MeasurementTaskContentProps = WithSaveFunctionalityProps & {
    // Future measurement-specific props will be added here
    [key: string]: unknown;
};
interface MeasurementFormData {
    targetValue: string;
    minValue: string;
    maxValue: string;
    measuredValue: string;
}
function MeasurementTaskContent({ task, mode, onUpdate, response, setResponse, disabled }: MeasurementTaskContentProps) {
    const [category, setCategory] = useState<UnitCategory>('Comprimento');
    const [selectedUnit, setSelectedUnit] = useState<string>('m');
    const [minValue, setMinValue] = useState<number | undefined>(undefined);
    const [maxValue, setMaxValue] = useState<number | undefined>(undefined);
    const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
    const [isValueOutOfRange, setIsValueOutOfRange] = useState<boolean>(false);
    const [isValueAtTarget, setIsValueAtTarget] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof MeasurementFormData, string>>>({});
    const measurement = task.measurement || DefaultMeasurement;
    useEffect(() => {
        if (!response) {
            setResponse({ value: 0, measuredValue: '0' });
        }
    }, [response, setResponse]);
    const defaultCategory = 'Comprimento';
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
    useEffect(() => {
        const newErrors: Partial<Record<keyof MeasurementFormData, string>> = {};
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
    const stringifyValue = (val: number | undefined): string => {
        return val !== undefined ? String(val) : '';
    };
    const validateInput = (value: string): boolean => {
        return value === '' || /^-?\d*[.,]?\d*$/.test(value);
    };
    const processBlur = (name: keyof MeasurementFormData, value: string) => {
        const normalizedValue = value.replace(',', '.');
        const numValue = parseFloat(normalizedValue);
        if (name === 'measuredValue') {
            const finalValue = isNaN(numValue) ? 0 : numValue;
            setResponse({ ...response, value: finalValue, measuredValue: String(finalValue) });
            const newErrors: Partial<Record<keyof MeasurementFormData, string>> = { ...formErrors };
            delete newErrors.measuredValue;
            let outOfRange = false;
            if (minValue !== undefined && finalValue < minValue) {
                newErrors.measuredValue = `O valor está abaixo do mínimo (${minValue})`;
                outOfRange = true;
            } else if (maxValue !== undefined && finalValue > maxValue) {
                newErrors.measuredValue = `O valor está acima do máximo (${maxValue})`;
                outOfRange = true;
            }
            setIsValueOutOfRange(outOfRange);
            setIsValueAtTarget(targetValue !== undefined && finalValue === targetValue);
            setFormErrors(newErrors);
        } else {
            const finalValue = isNaN(numValue) ? undefined : numValue;
            if (name === 'targetValue') setTargetValue(finalValue);
            else if (name === 'minValue') setMinValue(finalValue);
            else if (name === 'maxValue') setMaxValue(finalValue);
            handleUpdate(
                name === 'targetValue' ? finalValue : targetValue,
                name === 'minValue' ? finalValue : minValue,
                name === 'maxValue' ? finalValue : maxValue,
            );
        }
    };
    const safeCategory = Object.keys(MeasurementUnitCategories).includes(category) ? category : defaultCategory;
    const form = {
        data: {
            ...response,
            targetValue: stringifyValue(targetValue),
            minValue: stringifyValue(minValue),
            maxValue: stringifyValue(maxValue),
        } as Record<string, unknown>,
        setData: (name: string, value: unknown) => {
            setResponse({ ...response, [name]: value });
        },
        errors: formErrors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => {
            const newErrors = { ...formErrors };
            fields.forEach((field) => delete newErrors[field as keyof MeasurementFormData]);
            setFormErrors(newErrors);
        },
        validateInput,
        processBlur: (name: string, value: string) => processBlur(name as keyof MeasurementFormData, value),
    };
    const handleUpdate = (target: number | undefined, min: number | undefined, max: number | undefined) => {
        onUpdate?.({
            ...task,
            measurement: { ...measurement, category, unit: selectedUnit, min, max, target },
        });
    };
    const handleCategoryChange = (value: string) => {
        if (value && Object.keys(MeasurementUnitCategories).includes(value)) {
            const newCategory = value as UnitCategory;
            const firstUnit = MeasurementUnitCategories[newCategory][0];
            if (firstUnit) {
                const newUnit = firstUnit.value;
                setCategory(newCategory);
                setSelectedUnit(newUnit);
                onUpdate?.({
                    ...task,
                    measurement: { ...measurement, category: newCategory, unit: newUnit, min: minValue, max: maxValue, target: targetValue },
                });
            }
        }
    };
    const handleUnitChange = (value: string) => {
        if (value) {
            setSelectedUnit(value);
            onUpdate?.({
                ...task,
                measurement: { ...measurement, category, unit: value, min: minValue, max: maxValue, target: targetValue },
            });
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
                                items={Object.keys(MeasurementUnitCategories).map((cat) => ({ id: cat, name: cat }))}
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
                                items={MeasurementUnitCategories[safeCategory].map((unit) => ({ id: unit.value, name: unit.label }))}
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
                                <TextInput
                                    form={form}
                                    name="targetValue"
                                    label="Valor Alvo"
                                    placeholder="Sem Alvo"
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => processBlur('targetValue', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <TextInput
                                    form={form}
                                    name="minValue"
                                    label="Valor Mínimo"
                                    placeholder="Sem Min"
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => processBlur('minValue', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <TextInput
                                    form={form}
                                    name="maxValue"
                                    label="Valor Máximo"
                                    placeholder="Sem Max"
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => processBlur('maxValue', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
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
                                    <Input value={(response?.value as string | number) || 0} className="bg-muted/50" readOnly />
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
                                            value={(response?.measuredValue as string) || '0'}
                                            onChange={(e) => {
                                                if (validateInput(e.target.value)) {
                                                    setResponse({ ...response, measuredValue: e.target.value });
                                                }
                                            }}
                                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => processBlur('measuredValue', e.target.value)}
                                            className={`${isValueOutOfRange ? 'border-red-500 focus-visible:ring-red-500' : isValueAtTarget ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                                            disabled={disabled}
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
                                <Input value={targetValue !== undefined ? targetValue : ''} placeholder="Sem Alvo" className="bg-muted/50" readOnly />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>
                        <div className="col-span-1 space-y-2">
                            <Label className="text-sm font-medium">Valor Mínimo</Label>
                            <div className="flex items-center gap-2">
                                <Input value={minValue !== undefined ? minValue : ''} placeholder="Sem Min" className="bg-muted/50" readOnly />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>
                        <div className="col-span-1 space-y-2">
                            <Label className="text-sm font-medium">Valor Máximo</Label>
                            <div className="flex items-center gap-2">
                                <Input value={maxValue !== undefined ? maxValue : ''} placeholder="Sem Max" className="bg-muted/50" readOnly />
                                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{displayedUnit}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default withSaveFunctionality(MeasurementTaskContent);
