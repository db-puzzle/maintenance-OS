import { router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TextInput } from '@/components/TextInput';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { route } from '@/utils/route';
import { ItemSelect } from '@/components/ItemSelect';
import CreateManufacturerSheet from '@/components/CreateManufacturerSheet';
interface Manufacturer {
    id: number;
    name: string;
    website?: string;
    email?: string;
    phone?: string;
    country?: string;
    notes?: string;
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
    created_at: string;
    updated_at: string;
}
interface PartFormComponentProps {
    part: Part;
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
    manufacturers?: Manufacturer[];
}
export function PartFormComponent({ part, initialMode = 'view', onSuccess, manufacturers: initialManufacturers = [] }: PartFormComponentProps) {
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view';
    const [showCreateManufacturer, setShowCreateManufacturer] = useState(false);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers);
    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    // Update manufacturers when prop changes
    useEffect(() => {
        setManufacturers(initialManufacturers);
    }, [initialManufacturers]);
    // Load manufacturers if not provided
    useEffect(() => {
        if (!initialManufacturers || initialManufacturers.length === 0) {
            fetchManufacturers();
        }
    }, [initialManufacturers]);
    const fetchManufacturers = async () => {
        try {
            const response = await fetch(route('asset-hierarchy.manufacturers.all'));
            const data = await response.json();
            setManufacturers(data.manufacturers || []);
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
        }
    };
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm({
        part_number: part.part_number,
        name: part.name,
        description: part.description || '',
        unit_cost: part.unit_cost,
        available_quantity: part.available_quantity,
        minimum_quantity: part.minimum_quantity,
        maximum_quantity: part.maximum_quantity,
        location: part.location || '',
        manufacturer_id: part.manufacturer_id,
        active: part.active,
    });
    // Create a wrapper to handle the typing issue
    const handleClearErrors = (...fields: string[]) => {
        clearErrors(...(fields as Array<keyof typeof data>));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) {
            return;
        }
        // Validate maximum quantity
        if (data.maximum_quantity && data.maximum_quantity < data.minimum_quantity) {
            toast.error('A quantidade máxima deve ser maior que a quantidade mínima.');
            return;
        }
        // Clear any previous errors
        clearErrors();
        const isCreating = part.id === 0;
        if (isCreating) {
            // Create new part
            router.post(route('parts.store'), data, {
                preserveScroll: true,
                onSuccess: (page) => {
                    toast.success('Peça criada com sucesso');
                    // Get the newly created part ID from flash data or redirect
                    const newPartId = (page.props as any).flash?.partId;
                    if (newPartId) {
                        router.get(route('parts.show', newPartId));
                    } else if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        toast.error(firstError as string);
                    }
                },
            });
        } else {
            // Update existing part
            put(route('parts.update', { part: part.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Peça atualizada com sucesso');
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        toast.error(firstError as string);
                    }
                },
            });
        }
    };
    const handleCancel = () => {
        reset();
        setMode('view');
    };
    const handleEdit = () => {
        setMode('edit');
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
    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Número da Peça */}
                    <TextInput
                        form={{
                            data,
                            setData: (key: string, value: string | number | boolean | File | null | undefined) => setData(key as any, value),
                            errors,
                            clearErrors: handleClearErrors,
                        }}
                        name="part_number"
                        label="Número da Peça"
                        placeholder={isViewMode ? 'Número não informado' : 'Digite o número da peça'}
                        required={!isViewMode}
                        view={isViewMode}
                    />
                    {/* Nome */}
                    <TextInput
                        form={{
                            data,
                            setData: (key: string, value: string | number | boolean | File | null | undefined) => setData(key as any, value),
                            errors,
                            clearErrors: handleClearErrors,
                        }}
                        name="name"
                        label="Nome"
                        placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome da peça'}
                        required={!isViewMode}
                        view={isViewMode}
                    />
                    {/* Descrição */}
                    <div className="md:col-span-2">
                        {isViewMode ? (
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <p className="text-sm text-muted-foreground">
                                    {data.description || 'Sem descrição'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Digite a descrição da peça"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Custo Unitário */}
                    <div className="grid gap-2">
                        <Label htmlFor="unit_cost">
                            Custo Unitário
                            {!isViewMode && <span className="text-destructive"> *</span>}
                        </Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="border-input bg-muted/20 text-muted-foreground flex h-9 w-full rounded-md border px-3 py-2 text-sm">
                                    {formatCurrency(data.unit_cost)}
                                </div>
                            ) : (
                                <Input
                                    id="unit_cost"
                                    type="number"
                                    step="0.01"
                                    value={data.unit_cost}
                                    onChange={(e) => setData('unit_cost', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    required
                                    className="w-full"
                                />
                            )}
                        </div>
                        {errors.unit_cost && (
                            <p className="text-sm text-destructive">{errors.unit_cost}</p>
                        )}
                    </div>
                    {/* Quantidade Disponível */}
                    <div className="grid gap-2">
                        <Label htmlFor="available_quantity">
                            Quantidade Disponível
                            {!isViewMode && <span className="text-destructive"> *</span>}
                        </Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="border-input bg-muted/20 text-muted-foreground flex h-9 w-full rounded-md border px-3 py-2 text-sm">
                                    {data.available_quantity || 'Quantidade não informada'}
                                </div>
                            ) : (
                                <Input
                                    id="available_quantity"
                                    type="number"
                                    value={data.available_quantity}
                                    onChange={(e) => setData('available_quantity', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    required
                                    className="w-full"
                                />
                            )}
                        </div>
                        {errors.available_quantity && (
                            <p className="text-sm text-destructive">{errors.available_quantity}</p>
                        )}
                    </div>
                    {/* Quantidade Mínima */}
                    <div className="grid gap-2">
                        <Label htmlFor="minimum_quantity">
                            Quantidade Mínima
                            {!isViewMode && <span className="text-destructive"> *</span>}
                        </Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="border-input bg-muted/20 text-muted-foreground flex h-9 w-full rounded-md border px-3 py-2 text-sm">
                                    {data.minimum_quantity || 'Quantidade não informada'}
                                </div>
                            ) : (
                                <Input
                                    id="minimum_quantity"
                                    type="number"
                                    value={data.minimum_quantity}
                                    onChange={(e) => setData('minimum_quantity', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    required
                                    className="w-full"
                                />
                            )}
                        </div>
                        {errors.minimum_quantity && (
                            <p className="text-sm text-destructive">{errors.minimum_quantity}</p>
                        )}
                    </div>
                    {/* Quantidade Máxima */}
                    <div className="grid gap-2">
                        <Label htmlFor="maximum_quantity">
                            Quantidade Máxima
                        </Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="border-input bg-muted/20 text-muted-foreground flex h-9 w-full rounded-md border px-3 py-2 text-sm">
                                    {data.maximum_quantity || 'Quantidade não informada'}
                                </div>
                            ) : (
                                <Input
                                    id="maximum_quantity"
                                    type="number"
                                    value={data.maximum_quantity || ''}
                                    onChange={(e) => setData('maximum_quantity', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="0"
                                    className="w-full"
                                />
                            )}
                        </div>
                        {errors.maximum_quantity && (
                            <p className="text-sm text-destructive">{errors.maximum_quantity}</p>
                        )}
                    </div>
                    {/* Localização */}
                    <TextInput
                        form={{
                            data,
                            setData: (key: string, value: string | number | boolean | File | null | undefined) => setData(key as any, value),
                            errors,
                            clearErrors: handleClearErrors,
                        }}
                        name="location"
                        label="Localização"
                        placeholder={isViewMode ? 'Localização não informada' : 'Digite a localização'}
                        view={isViewMode}
                    />
                    {/* Fabricante */}
                    <ItemSelect
                        label="Fabricante"
                        items={manufacturers}
                        value={data.manufacturer_id?.toString() || ''}
                        onValueChange={(value) => {
                            setData('manufacturer_id', value ? parseInt(value) : null);
                            clearErrors('manufacturer_id');
                        }}
                        onCreateClick={() => setShowCreateManufacturer(true)}
                        placeholder={isViewMode && !data.manufacturer_id ? 'Fabricante não selecionado' : 'Selecione um fabricante (opcional)'}
                        error={errors.manufacturer_id}
                        canClear={!isViewMode}
                        view={isViewMode}
                        disabled={isViewMode}
                    />
                    {/* Status Ativo */}
                    <div className="space-y-2">
                        <Label htmlFor="active">Status</Label>
                        {isViewMode ? (
                            <p className="text-sm">
                                {data.active ? (
                                    <span className="text-green-600">Ativo</span>
                                ) : (
                                    <span className="text-red-600">Inativo</span>
                                )}
                            </p>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={data.active}
                                    onCheckedChange={(checked) => setData('active', checked)}
                                />
                                <Label htmlFor="active" className="font-normal">
                                    {data.active ? 'Ativo' : 'Inativo'}
                                </Label>
                            </div>
                        )}
                    </div>
                    {/* Datas */}
                    {isViewMode && (
                        <>
                            <div className="space-y-2">
                                <Label>Criado em</Label>
                                <p className="text-sm text-muted-foreground">
                                    {formatDate(part.created_at)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Atualizado em</Label>
                                <p className="text-sm text-muted-foreground">
                                    {formatDate(part.updated_at)}
                                </p>
                            </div>
                        </>
                    )}
                </div>
                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                    {isViewMode ? (
                        <Button onClick={handleEdit} variant="default" type="button">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleCancel} variant="outline" disabled={processing} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    )}
                </div>
            </form>
            {/* Create Manufacturer Sheet */}
            <CreateManufacturerSheet
                open={showCreateManufacturer}
                onOpenChange={setShowCreateManufacturer}
                mode="create"
                onSuccess={() => {
                    setShowCreateManufacturer(false);
                    // Refresh manufacturers list
                    fetchManufacturers();
                }}
            />
        </>
    );
}