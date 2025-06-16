import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Define a local form type with index signature
interface ManufacturerFormData {
    name: string;
    website: string;
    email: string;
    phone: string;
    country: string;
    notes: string;
    [key: string]: any;
}

interface ManufacturerData {
    id: number;
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    notes?: string | null;
}

interface ManufacturerFormComponentProps {
    manufacturer?: ManufacturerData;
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function ManufacturerFormComponent({
    manufacturer,
    initialMode = 'view',
    onCancel,
    onSuccess
}: ManufacturerFormComponentProps) {
    const isEditing = !!manufacturer;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<ManufacturerFormData>({
        name: manufacturer?.name || '',
        website: manufacturer?.website || '',
        email: manufacturer?.email || '',
        phone: manufacturer?.phone || '',
        country: manufacturer?.country || '',
        notes: manufacturer?.notes || '',
    });

    const handleSave = () => {
        if (isEditing) {
            put(route('asset-hierarchy.manufacturers.update', manufacturer.id), {
                onSuccess: () => {
                    toast.success(`O fabricante ${data.name} foi atualizado com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar fabricante', {
                        description: 'Verifique os campos e tente novamente.',
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
        }
    };

    const handleEdit = () => {
        setMode('edit');
    };

    return (
        <div className="space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Nome */}
                <TextInput
                    form={{
                        data,
                        setData,
                        errors,
                        clearErrors,
                    }}
                    name="name"
                    label="Nome do Fabricante"
                    placeholder={isViewMode ? "Nome não informado" : "Digite o nome do fabricante"}
                    required={!isViewMode}
                    view={isViewMode}
                />

                {/* País */}
                <TextInput
                    form={{
                        data,
                        setData,
                        errors,
                        clearErrors,
                    }}
                    name="country"
                    label="País"
                    placeholder={isViewMode ? "País não informado" : "Digite o país"}
                    view={isViewMode}
                />

                {/* Website */}
                <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    {isViewMode ? (
                        <div className="text-sm text-muted-foreground">
                            {data.website ? (
                                <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {data.website}
                                </a>
                            ) : (
                                'Website não informado'
                            )}
                        </div>
                    ) : (
                        <>
                            <Input
                                id="website"
                                type="url"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                placeholder="https://www.exemplo.com"
                            />
                            <InputError message={errors.website} />
                        </>
                    )}
                </div>

                {/* Email */}
                <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    {isViewMode ? (
                        <div className="text-sm text-muted-foreground">
                            {data.email ? (
                                <a href={`mailto:${data.email}`} className="text-primary hover:underline">
                                    {data.email}
                                </a>
                            ) : (
                                'E-mail não informado'
                            )}
                        </div>
                    ) : (
                        <>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="contato@exemplo.com"
                            />
                            <InputError message={errors.email} />
                        </>
                    )}
                </div>

                {/* Telefone */}
                <TextInput
                    form={{
                        data,
                        setData,
                        errors,
                        clearErrors,
                    }}
                    name="phone"
                    label="Telefone"
                    placeholder={isViewMode ? "Telefone não informado" : "+55 11 99999-9999"}
                    view={isViewMode}
                />

                {/* Observações - Ocupa toda a largura */}
                <div className="md:col-span-2">
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Observações</Label>
                        {isViewMode && !data.notes ? (
                            <div className="flex min-h-[60px] w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                Sem observações
                            </div>
                        ) : (
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Observações sobre o fabricante..."
                                className="min-h-[100px]"
                                view={isViewMode}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
                <div className="flex justify-end gap-2">
                    {isViewMode ? (
                        <Button onClick={handleEdit} variant="default">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleCancel} variant="outline" disabled={processing}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
} 