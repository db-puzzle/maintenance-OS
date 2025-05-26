import React, { useState, useMemo } from 'react';
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
import { type Plant } from '@/types/asset-hierarchy';

interface SectorForm {
    [key: string]: any;
    name: string;
    area_id: string;
}

interface CreateSectorSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    plants: Plant[];
    selectedPlantId?: string;
    selectedAreaId?: string;
    disableParentFields?: boolean;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const CreateSectorSheet: React.FC<CreateSectorSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    plants,
    selectedPlantId,
    selectedAreaId,
    disableParentFields = false,
    triggerText = "Novo Setor",
    triggerVariant = "outline",
    showTrigger = false,
    triggerRef
}) => {
    const { data, setData, post, processing, errors, reset } = useForm<SectorForm>({
        name: '',
        area_id: selectedAreaId || '',
    });

    const [localSelectedPlant, setLocalSelectedPlant] = useState<string>(selectedPlantId || '');
    const [internalSheetOpen, setInternalSheetOpen] = useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => {}));

    // Atualiza os valores quando as props mudam
    React.useEffect(() => {
        if (selectedAreaId) {
            setData('area_id', selectedAreaId);
        }
        if (selectedPlantId) {
            setLocalSelectedPlant(selectedPlantId);
        }
    }, [selectedAreaId, selectedPlantId]);

    const availableAreas = useMemo(() => {
        if (!localSelectedPlant) return [];
        const selectedPlant = plants.find(p => p.id.toString() === localSelectedPlant);
        return selectedPlant?.areas || [];
    }, [localSelectedPlant, plants]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...data,
            stay: true // Indica que deve permanecer na mesma página
        };
        
        post(route('asset-hierarchy.setores.store'), {
            ...formData,
            onSuccess: () => {
                toast.success("Setor criado com sucesso!");
                reset();
                setSheetOpen(false);
                onSuccess?.();
            },
            onError: (errors: any) => {
                toast.error("Erro ao criar setor", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    const handleCancel = () => {
        reset();
        setLocalSelectedPlant(selectedPlantId || '');
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
                    <SheetTitle>Novo Setor</SheetTitle>
                    <SheetDescription>
                        Adicione um novo setor ao sistema
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 m-4">
                    <div className="grid gap-6">
                        {/* Nome do Setor - Campo Obrigatório */}
                        <TextInput<SectorForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => {}
                            }}
                            name="name"
                            label="Nome do Setor"
                            placeholder="Nome do setor"
                            required
                        />

                        {/* Planta */}
                        <div className="grid gap-2">
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={localSelectedPlant}
                                onValueChange={(value) => {
                                    setLocalSelectedPlant(value);
                                    setData('area_id', ''); // Limpa a área quando mudar a planta
                                }}
                                placeholder="Selecione uma planta"
                                required={!disableParentFields}
                                disabled={disableParentFields}
                            />
                            {disableParentFields && (
                                <p className="text-sm text-muted-foreground">
                                    A planta foi pré-selecionada e não pode ser alterada.
                                </p>
                            )}
                        </div>

                        {/* Área */}
                        <div className="grid gap-2">
                            <ItemSelect
                                label="Área"
                                items={availableAreas}
                                value={data.area_id?.toString() || ''}
                                onValueChange={(value) => setData('area_id', value)}
                                placeholder={!localSelectedPlant ? "Selecione uma planta primeiro" : "Selecione uma área"}
                                error={errors.area_id}
                                disabled={disableParentFields || !localSelectedPlant}
                                required={!disableParentFields}
                            />
                            {disableParentFields && (
                                <p className="text-sm text-muted-foreground">
                                    A área foi pré-selecionada e não pode ser alterada.
                                </p>
                            )}
                        </div>
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

export default CreateSectorSheet; 