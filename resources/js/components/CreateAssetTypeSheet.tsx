import { useForm } from '@inertiajs/react';
import React from 'react';
import { toast } from 'sonner';

import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface AssetTypeForm {
    [key: string]: any;
    name: string;
    description: string;
}

interface AssetType {
    id: number;
    name: string;
    description: string | null;
}

interface CreateAssetTypeSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    assetType?: AssetType; // For edit mode
}

const CreateAssetTypeSheet: React.FC<CreateAssetTypeSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    // Props para SheetTrigger
    triggerText = 'Novo Tipo de Ativo',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    assetType,
}) => {
    const isEditMode = !!assetType;

    const { data, setData, post, put, processing, errors, reset } = useForm<AssetTypeForm>({
        name: assetType?.name || '',
        description: assetType?.description || '',
    });

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => { }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formData = {
            ...data,
            stay: true, // Indica que deve permanecer na mesma página
        };

        if (isEditMode) {
            put(route('asset-hierarchy.tipos-ativo.update', assetType?.id), {
                ...formData,
                onSuccess: () => {
                    toast.success('Tipo de ativo atualizado com sucesso!');
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: (errors: any) => {
                    toast.error('Erro ao atualizar tipo de ativo', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        } else {
            post(route('asset-hierarchy.tipos-ativo.store'), {
                ...formData,
                onSuccess: () => {
                    toast.success('Tipo de ativo criado com sucesso!');
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: (errors: any) => {
                    toast.error('Erro ao criar tipo de ativo', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        }
    };

    const handleCancel = () => {
        reset();
        setSheetOpen(false);
    };

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {showTrigger && (
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerText}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader className="">
                    <SheetTitle>{isEditMode ? 'Editar Tipo de Ativo' : 'Novo Tipo de Ativo'}</SheetTitle>
                    <SheetDescription>
                        {isEditMode ? 'Edite os dados do tipo de ativo' : 'Adicione um novo tipo de ativo ao sistema'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="m-4 space-y-6">
                    <div className="grid gap-6">
                        {/* Nome do Tipo - Campo Obrigatório */}
                        <TextInput<AssetTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="name"
                            label="Nome"
                            placeholder="Nome do tipo de ativo"
                            required
                        />

                        {/* Descrição */}
                        <TextInput<AssetTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="description"
                            label="Descrição"
                            placeholder="Descrição do tipo de ativo"
                        />
                    </div>

                    <SheetFooter className="flex justify-end gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
};

export default CreateAssetTypeSheet;
