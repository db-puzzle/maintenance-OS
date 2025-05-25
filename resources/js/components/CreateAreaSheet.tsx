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
import ItemSelect from '@/components/ItemSelect';

interface AreaForm {
    [key: string]: any;
    name: string;
    plant_id: string;
}

interface CreateAreaSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    plants: {
        id: number;
        name: string;
    }[];
    selectedPlantId?: string;
    disableParentFields?: boolean;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const CreateAreaSheet: React.FC<CreateAreaSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    plants,
    selectedPlantId,
    disableParentFields = false,
    triggerText = "Nova Área",
    triggerVariant = "outline",
    showTrigger = false,
    triggerRef
}) => {
    const { data, setData, post, processing, errors, reset } = useForm<AreaForm>({
        name: '',
        plant_id: selectedPlantId || '',
    });

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => {}));

    // Atualiza o plant_id quando selectedPlantId muda
    React.useEffect(() => {
        if (selectedPlantId) {
            setData('plant_id', selectedPlantId);
        }
    }, [selectedPlantId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...data,
            stay: true // Indica que deve permanecer na mesma página
        };
        
        post(route('asset-hierarchy.areas.store'), {
            ...formData,
            onSuccess: () => {
                toast.success("Área criada com sucesso!");
                reset();
                setSheetOpen(false);
                onSuccess?.();
            },
            onError: (errors: any) => {
                toast.error("Erro ao criar área", {
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
                <SheetHeader className="mb-4">
                    <SheetTitle>Nova Área</SheetTitle>
                    <SheetDescription>
                        Adicione uma nova área ao sistema
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6">
                        {/* Nome da Área - Campo Obrigatório */}
                        <TextInput<AreaForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => {}
                            }}
                            name="name"
                            label="Nome da Área"
                            placeholder="Nome da área"
                            required
                        />

                        {/* Planta */}
                        <div className="grid gap-2">
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={data.plant_id?.toString() || ''}
                                onValueChange={(value) => setData('plant_id', value)}
                                placeholder="Selecione uma planta"
                                error={errors.plant_id}
                                required={!disableParentFields}
                                disabled={disableParentFields}
                            />
                            {disableParentFields && (
                                <p className="text-sm text-muted-foreground">
                                    A planta foi pré-selecionada e não pode ser alterada.
                                </p>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="flex justify-end gap-2 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
};

export default CreateAreaSheet; 