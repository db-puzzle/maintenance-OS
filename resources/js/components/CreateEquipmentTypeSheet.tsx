import React from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from "sonner";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import TextInput from '@/components/TextInput';

interface EquipmentTypeForm {
    [key: string]: any;
    name: string;
    description: string;
}

interface CreateEquipmentTypeSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const CreateEquipmentTypeSheet: React.FC<CreateEquipmentTypeSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    // Props para SheetTrigger
    triggerText = "Novo Tipo de Equipamento",
    triggerVariant = "outline",
    showTrigger = false,
    triggerRef
}) => {
    const { data, setData, post, processing, errors, reset } = useForm<EquipmentTypeForm>({
        name: '',
        description: '',
    });

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => {}));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...data,
            stay: true // Indica que deve permanecer na mesma página
        };
        
        post(route('asset-hierarchy.tipos-equipamento.store'), {
            ...formData,
            onSuccess: () => {
                toast.success("Tipo de equipamento criado com sucesso!");
                reset();
                setSheetOpen(false);
                onSuccess?.();
            },
            onError: (errors: any) => {
                toast.error("Erro ao criar tipo de equipamento", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    const handleCancel = () => {
        reset();
        setSheetOpen(false);
    };

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {showTrigger && (
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>{triggerText}</Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader className="">
                    <SheetTitle>Novo Tipo de Equipamento</SheetTitle>
                    <SheetDescription>
                        Adicione um novo tipo de equipamento ao sistema
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 m-4">
                    <div className="grid gap-6">
                        {/* Nome do Tipo - Campo Obrigatório */}
                        <TextInput<EquipmentTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => {}
                            }}
                            name="name"
                            label="Nome"
                            placeholder="Nome do tipo de equipamento"
                            required
                        />

                        {/* Descrição */}
                        <TextInput<EquipmentTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => {}
                            }}
                            name="description"
                            label="Descrição"
                            placeholder="Descrição do tipo de equipamento"
                        />
                    </div>

                    <SheetFooter className="flex justify-end gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
};

export default CreateEquipmentTypeSheet; 