import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AssetType } from '@/types/asset-hierarchy';
import { router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define a local form type with index signature
interface AssetTypeFormData {
    name: string;
    description: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface AssetTypeFormComponentProps {
    assetType?: AssetType;
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function AssetTypeFormComponent({ assetType, initialMode = 'view', onCancel, onSuccess }: AssetTypeFormComponentProps) {
    const isEditing = !!assetType;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<AssetTypeFormData>({
        name: assetType?.name || '',
        description: assetType?.description || '',
    });

    const handleSave = () => {
        if (isEditing) {
            put(route('asset-hierarchy.tipos-ativo.update', { tipos_ativo: assetType.id }), {
                onSuccess: () => {
                    toast.success(`O tipo de ativo ${data.name} foi atualizado com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar tipo de ativo', {
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
            <div className="grid grid-cols-1 gap-6">
                {/* Nome */}
                <TextInput
                    form={{
                        data,
                        setData,
                        errors,
                        clearErrors,
                    }}
                    name="name"
                    label="Nome"
                    placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome do tipo de ativo'}
                    required={!isViewMode}
                    view={isViewMode}
                />

                {/* Descrição */}
                <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    {isViewMode && !data.description ? (
                        <div className="border-input bg-muted/20 text-muted-foreground flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm">
                            Sem descrição
                        </div>
                    ) : (
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descrição do tipo de ativo"
                            className="min-h-[60px]"
                            view={isViewMode}
                        />
                    )}
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
