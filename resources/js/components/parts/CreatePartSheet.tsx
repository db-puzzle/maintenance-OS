import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { TextInput } from '@/components/TextInput';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
interface Manufacturer {
    id: number;
    name: string;
}
interface Part {
    id: number;
    part_number: string;
    name: string;
    description: string | null;
    unit_cost: number;
    available_quantity: number;
    minimum_quantity: number;
    maximum_quantity: number | null;
    location: string | null;
    manufacturer_id: number | null;
    manufacturer?: Manufacturer | null;
    active: boolean;
}
interface CreatePartSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part?: Part | null;
    onSuccess?: () => void;
}
export function CreatePartSheet({ open, onOpenChange, part, onSuccess }: CreatePartSheetProps) {
    const [stayOpen, setStayOpen] = useState(false);
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm({
        part_number: '',
        name: '',
        description: '',
        unit_cost: 0,
        available_quantity: 0,
        minimum_quantity: 0,
        maximum_quantity: null as number | null,
        location: '',
        manufacturer_id: null as number | null,
        active: true as boolean,
    });
    // Create a wrapper to handle the typing issue
    const handleClearErrors = (...fields: string[]) => {
        clearErrors(...(fields as Array<keyof typeof data>));
    };
    useEffect(() => {
        if (part) {
            setData('part_number', part.part_number);
            setData('name', part.name);
            setData('description', part.description || '');
            setData('unit_cost', part.unit_cost);
            setData('available_quantity', part.available_quantity);
            setData('minimum_quantity', part.minimum_quantity);
            setData('maximum_quantity', part.maximum_quantity);
            setData('location', part.location || '');
            setData('manufacturer_id', part.manufacturer_id || null);
            setData('active', part.active);
        } else {
            reset();
        }
    }, [part, reset, setData]);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const _submitData = {
            ...data,
            maximum_quantity: data.maximum_quantity || null,
        };
        if (part) {
            put(route('parts.update', part.id), {
                onSuccess: () => {
                    toast.success('Peça atualizada com sucesso');
                    if (!stayOpen) {
                        onOpenChange(false);
                    }
                    onSuccess?.();
                },
                onError: () => {
                    toast.error('Erro ao atualizar peça');
                },
            });
        } else {
            post(route('parts.store'), {
                onSuccess: () => {
                    toast.success('Peça criada com sucesso');
                    if (stayOpen) {
                        reset();
                    } else {
                        onOpenChange(false);
                    }
                    onSuccess?.();
                },
                onError: () => {
                    toast.error('Erro ao criar peça');
                },
            });
        }
    };
    const _formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const _handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
        const numericValue = parseFloat(value) || 0;
        setData('unit_cost', numericValue);
    };
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{part ? 'Editar Peça' : 'Nova Peça'}</SheetTitle>
                    <SheetDescription>
                        {part ? 'Atualize as informações da peça' : 'Preencha os dados para criar uma nova peça'}
                    </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="part_number"
                            label="Part Number"
                            placeholder="EX-001"
                            required
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="name"
                            label="Nome"
                            placeholder="Nome da peça"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descrição detalhada da peça"
                            rows={3}
                        />
                        <InputError message={errors.description} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="unit_cost"
                            label="Custo Unitário (R$)"
                            placeholder="0.00"
                            required
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="available_quantity"
                            label="Qtd. Disponível"
                            placeholder="0"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="minimum_quantity"
                            label="Qtd. Mínima"
                            placeholder="0"
                            required
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="maximum_quantity"
                            label="Qtd. Máxima"
                            placeholder="Opcional"
                        />
                    </div>
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: handleClearErrors,
                        }}
                        name="location"
                        label="Localização"
                        placeholder="Ex: Almoxarifado A, Prateleira 3"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: handleClearErrors,
                            }}
                            name="manufacturer"
                            label="Fabricante"
                            placeholder="Nome do fabricante"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <Label htmlFor="active">Status</Label>
                            <p className="text-sm text-muted-foreground">
                                Peça disponível para uso
                            </p>
                        </div>
                        <Switch
                            id="active"
                            checked={data.active}
                            onCheckedChange={(checked) => setData('active', checked as boolean)}
                        />
                    </div>
                    <SheetFooter className="flex-col sm:flex-row gap-2">
                        {!part && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="stay-open"
                                    checked={stayOpen}
                                    onCheckedChange={(checked) => setStayOpen(checked as boolean)}
                                />
                                <label
                                    htmlFor="stay-open"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Continuar criando
                                </label>
                            </div>
                        )}
                        <div className="flex gap-2 flex-1 sm:flex-initial">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : (part ? 'Atualizar' : 'Criar')}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}