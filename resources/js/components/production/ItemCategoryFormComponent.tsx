import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/TextInput';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import InputError from '@/components/input-error';
import { ItemCategory } from '@/types/production';

interface ItemCategoryFormComponentProps {
    category: ItemCategory;
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
}

const ItemCategoryFormComponent: React.FC<ItemCategoryFormComponentProps> = ({
    category,
    initialMode = 'view',
    onSuccess,
}) => {
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

    const { data, setData, put, processing, errors, clearErrors, reset } = useForm({
        name: category.name || '',
        description: category.description || '',
        is_active: category.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('production.categories.update', { category: category.id }), {
            onSuccess: () => {
                setMode('view');
                if (onSuccess) {
                    onSuccess();
                }
            },
        });
    };

    const handleCancel = () => {
        reset();
        clearErrors();
        setMode('view');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6">
                {/* Nome */}
                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="name"
                    label="Nome"
                    placeholder="Nome da categoria"
                    required
                    disabled={processing}
                    view={mode === 'view'}
                />

                {/* Descrição */}
                <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    {mode === 'view' ? (
                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                            {data.description || <span className="text-muted-foreground">Sem descrição</span>}
                        </div>
                    ) : (
                        <>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Descrição da categoria"
                                disabled={processing}
                                rows={4}
                            />
                            <InputError message={errors.description} />
                        </>
                    )}
                </div>

                {/* Status Ativo */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_active">Status</Label>
                        <div className="text-sm text-muted-foreground">
                            {data.is_active ? 'Categoria ativa' : 'Categoria inativa'}
                        </div>
                    </div>
                    <Switch
                        id="is_active"
                        checked={data.is_active}
                        onCheckedChange={(checked) => setData('is_active', checked)}
                        disabled={processing || mode === 'view'}
                    />
                </div>

                {/* Informações adicionais (somente visualização) */}
                {mode === 'view' && (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                        <h3 className="font-medium">Informações Adicionais</h3>
                        <div className="grid gap-3 text-sm">
                            {category.createdBy && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Criado por:</span>
                                    <span>{category.createdBy.name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Criado em:</span>
                                <span>{new Date(category.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Atualizado em:</span>
                                <span>{new Date(category.updated_at).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center justify-end gap-2">
                {mode === 'view' ? (
                    <Button
                        type="button"
                        onClick={() => setMode('edit')}
                        disabled={processing}
                    >
                        Editar
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
};

export default ItemCategoryFormComponent;