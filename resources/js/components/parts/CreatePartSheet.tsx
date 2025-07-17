import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/FormField';
import { toast } from 'sonner';

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
    supplier: string | null;
    manufacturer: string | null;
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
    
    const { data, setData, post, put, processing, errors, reset } = useForm({
        part_number: '',
        name: '',
        description: '',
        unit_cost: 0,
        available_quantity: 0,
        minimum_quantity: 0,
        maximum_quantity: null as number | null,
        location: '',
        supplier: '',
        manufacturer: '',
        active: true,
    });

    useEffect(() => {
        if (part) {
            setData({
                part_number: part.part_number,
                name: part.name,
                description: part.description || '',
                unit_cost: part.unit_cost,
                available_quantity: part.available_quantity,
                minimum_quantity: part.minimum_quantity,
                maximum_quantity: part.maximum_quantity,
                location: part.location || '',
                supplier: part.supplier || '',
                manufacturer: part.manufacturer || '',
                active: part.active,
            });
        } else {
            reset();
        }
    }, [part]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = {
            ...data,
            maximum_quantity: data.maximum_quantity || null,
        };
        
        if (part) {
            put(route('parts.update', part.id), {
                data: submitData,
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
                data: submitData,
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

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                        <FormField label="Número da Peça" error={errors.part_number} required>
                            <Input
                                value={data.part_number}
                                onChange={(e) => setData('part_number', e.target.value)}
                                placeholder="EX-001"
                            />
                        </FormField>

                        <FormField label="Nome" error={errors.name} required>
                            <Input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Nome da peça"
                            />
                        </FormField>
                    </div>

                    <FormField label="Descrição" error={errors.description}>
                        <Textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descrição detalhada da peça"
                            rows={3}
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Custo Unitário (R$)" error={errors.unit_cost} required>
                            <Input
                                value={formatCurrency(data.unit_cost)}
                                onChange={handleCurrencyChange}
                                placeholder="0,00"
                            />
                        </FormField>

                        <FormField label="Qtd. Disponível" error={errors.available_quantity} required>
                            <Input
                                type="number"
                                min="0"
                                value={data.available_quantity}
                                onChange={(e) => setData('available_quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Qtd. Mínima" error={errors.minimum_quantity} required>
                            <Input
                                type="number"
                                min="0"
                                value={data.minimum_quantity}
                                onChange={(e) => setData('minimum_quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </FormField>

                        <FormField label="Qtd. Máxima" error={errors.maximum_quantity}>
                            <Input
                                type="number"
                                min="0"
                                value={data.maximum_quantity || ''}
                                onChange={(e) => setData('maximum_quantity', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Opcional"
                            />
                        </FormField>
                    </div>

                    <FormField label="Localização" error={errors.location}>
                        <Input
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                            placeholder="Ex: Almoxarifado A, Prateleira 3"
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Fornecedor" error={errors.supplier}>
                            <Input
                                value={data.supplier}
                                onChange={(e) => setData('supplier', e.target.value)}
                                placeholder="Nome do fornecedor"
                            />
                        </FormField>

                        <FormField label="Fabricante" error={errors.manufacturer}>
                            <Input
                                value={data.manufacturer}
                                onChange={(e) => setData('manufacturer', e.target.value)}
                                placeholder="Nome do fabricante"
                            />
                        </FormField>
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
                            onCheckedChange={(checked) => setData('active', checked)}
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