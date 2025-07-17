import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/FormField';
import { Edit, Save, X } from 'lucide-react';
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
    created_at: string;
    updated_at: string;
}

interface PartFormComponentProps {
    part: Part;
    isEditMode: boolean;
    onEditModeChange: (isEditMode: boolean) => void;
}

export function PartFormComponent({ part, isEditMode, onEditModeChange }: PartFormComponentProps) {
    const { data, setData, put, processing, errors, reset } = useForm({
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        put(route('parts.update', part.id), {
            onSuccess: () => {
                toast.success('Peça atualizada com sucesso');
                onEditModeChange(false);
            },
            onError: () => {
                toast.error('Erro ao atualizar peça');
            },
        });
    };

    const handleCancel = () => {
        reset();
        onEditModeChange(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!isEditMode) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Informações da Peça</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditModeChange(true)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-muted-foreground">Número da Peça</Label>
                            <p className="font-medium">{part.part_number}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Nome</Label>
                            <p className="font-medium">{part.name}</p>
                        </div>
                    </div>

                    {part.description && (
                        <div>
                            <Label className="text-muted-foreground">Descrição</Label>
                            <p className="font-medium whitespace-pre-wrap">{part.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label className="text-muted-foreground">Custo Unitário</Label>
                            <p className="font-medium">{formatCurrency(part.unit_cost)}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Quantidade Disponível</Label>
                            <p className="font-medium">{part.available_quantity}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Quantidade Mínima</Label>
                            <p className="font-medium">{part.minimum_quantity}</p>
                        </div>
                    </div>

                    {part.maximum_quantity && (
                        <div>
                            <Label className="text-muted-foreground">Quantidade Máxima</Label>
                            <p className="font-medium">{part.maximum_quantity}</p>
                        </div>
                    )}

                    {part.location && (
                        <div>
                            <Label className="text-muted-foreground">Localização</Label>
                            <p className="font-medium">{part.location}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {part.supplier && (
                            <div>
                                <Label className="text-muted-foreground">Fornecedor</Label>
                                <p className="font-medium">{part.supplier}</p>
                            </div>
                        )}
                        {part.manufacturer && (
                            <div>
                                <Label className="text-muted-foreground">Fabricante</Label>
                                <p className="font-medium">{part.manufacturer}</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <p className="font-medium">{part.active ? 'Ativo' : 'Inativo'}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Última Atualização</Label>
                            <p className="font-medium">{formatDate(part.updated_at)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Editar Informações da Peça</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={processing}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={processing}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Número da Peça" error={errors.part_number} required>
                            <Input
                                value={data.part_number}
                                onChange={(e) => setData('part_number', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Nome" error={errors.name} required>
                            <Input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                        </FormField>
                    </div>

                    <FormField label="Descrição" error={errors.description}>
                        <Textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField label="Custo Unitário (R$)" error={errors.unit_cost} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.unit_cost}
                                onChange={(e) => setData('unit_cost', parseFloat(e.target.value) || 0)}
                            />
                        </FormField>
                        <FormField label="Quantidade Disponível" error={errors.available_quantity} required>
                            <Input
                                type="number"
                                min="0"
                                value={data.available_quantity}
                                onChange={(e) => setData('available_quantity', parseInt(e.target.value) || 0)}
                            />
                        </FormField>
                        <FormField label="Quantidade Mínima" error={errors.minimum_quantity} required>
                            <Input
                                type="number"
                                min="0"
                                value={data.minimum_quantity}
                                onChange={(e) => setData('minimum_quantity', parseInt(e.target.value) || 0)}
                            />
                        </FormField>
                    </div>

                    <FormField label="Quantidade Máxima" error={errors.maximum_quantity}>
                        <Input
                            type="number"
                            min="0"
                            value={data.maximum_quantity || ''}
                            onChange={(e) => setData('maximum_quantity', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Opcional"
                        />
                    </FormField>

                    <FormField label="Localização" error={errors.location}>
                        <Input
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Fornecedor" error={errors.supplier}>
                            <Input
                                value={data.supplier}
                                onChange={(e) => setData('supplier', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Fabricante" error={errors.manufacturer}>
                            <Input
                                value={data.manufacturer}
                                onChange={(e) => setData('manufacturer', e.target.value)}
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
                </CardContent>
            </Card>
        </form>
    );
}