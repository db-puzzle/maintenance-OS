import { useForm } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { type Plant } from '@/types/asset-hierarchy';

interface SectorForm {
    [key: string]: any;
    name: string;
    area_id: string;
}

interface Sector {
    id: number;
    name: string;
    area_id: number;
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
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    sector?: Sector; // For edit mode
}

const CreateSectorSheet: React.FC<CreateSectorSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    plants,
    selectedPlantId,
    selectedAreaId,
    disableParentFields = false,
    triggerText = 'Novo Setor',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    sector,
}) => {
    const isEditMode = !!sector;

    const { data, setData, post, put, processing, errors, reset } = useForm<SectorForm>({
        name: sector?.name || '',
        area_id: sector?.area_id?.toString() || selectedAreaId || '',
    });

    const [localSelectedPlant, setLocalSelectedPlant] = useState<string>(selectedPlantId || '');
    const [internalSheetOpen, setInternalSheetOpen] = useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => { }));

    // Atualiza os valores quando as props mudam
    React.useEffect(() => {
        if (selectedAreaId) {
            setData('area_id', selectedAreaId);
        }
        if (selectedPlantId) {
            setLocalSelectedPlant(selectedPlantId);
        }
    }, [selectedAreaId, selectedPlantId]);

    // Find the plant that contains the selected area for edit mode
    React.useEffect(() => {
        if (isEditMode && sector && !selectedPlantId) {
            const plantWithArea = plants.find(plant => 
                plant.areas?.some(area => area.id === sector.area_id)
            );
            if (plantWithArea) {
                setLocalSelectedPlant(plantWithArea.id.toString());
            }
        }
    }, [isEditMode, sector, plants, selectedPlantId]);

    const availableAreas = useMemo(() => {
        if (!localSelectedPlant) return [];
        const selectedPlant = plants.find((p) => p.id.toString() === localSelectedPlant);
        return selectedPlant?.areas || [];
    }, [localSelectedPlant, plants]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formData = {
            ...data,
            stay: true, // Indica que deve permanecer na mesma página
        };

        if (isEditMode) {
            put(route('asset-hierarchy.setores.update', sector?.id), {
                ...formData,
                onSuccess: () => {
                    toast.success('Setor atualizado com sucesso!');
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: (errors: any) => {
                    toast.error('Erro ao atualizar setor', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        } else {
            post(route('asset-hierarchy.setores.store'), {
                ...formData,
                onSuccess: () => {
                    toast.success('Setor criado com sucesso!');
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: (errors: any) => {
                    toast.error('Erro ao criar setor', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        }
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
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerText}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader className="">
                    <SheetTitle>{isEditMode ? 'Editar Setor' : 'Novo Setor'}</SheetTitle>
                    <SheetDescription>
                        {isEditMode ? 'Edite os dados do setor' : 'Adicione um novo setor ao sistema'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="m-4 space-y-6">
                    <div className="grid gap-6">
                        {/* Nome do Setor - Campo Obrigatório */}
                        <TextInput<SectorForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
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
                                disabled={disableParentFields || isEditMode}
                            />
                            {(disableParentFields || isEditMode) && (
                                <p className="text-muted-foreground text-sm">
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
                                placeholder={!localSelectedPlant ? 'Selecione uma planta primeiro' : 'Selecione uma área'}
                                error={errors.area_id}
                                disabled={disableParentFields || !localSelectedPlant || isEditMode}
                                required={!disableParentFields}
                            />
                            {(disableParentFields || isEditMode) && (
                                <p className="text-muted-foreground text-sm">
                                    A área foi pré-selecionada e não pode ser alterada.
                                </p>
                            )}
                        </div>
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

export default CreateSectorSheet;
