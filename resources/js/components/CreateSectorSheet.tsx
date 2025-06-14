import React, { useEffect, useMemo, useState } from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { type Plant } from '@/types/asset-hierarchy';
import { Sector } from '@/types/entities/sector';

interface SectorForm {
    [key: string]: any;
    name: string;
    area_id: string;
}

interface CreateSectorSheetProps {
    sector?: Sector;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    plants: Plant[];
}

const CreateSectorSheet: React.FC<CreateSectorSheetProps> = ({
    sector,
    open,
    onOpenChange,
    mode,
    plants = [],
}) => {
    const isEditMode = mode === 'edit';
    const [localSelectedPlant, setLocalSelectedPlant] = useState<string>('');

    // Update selected plant when sector changes (for edit mode)
    useEffect(() => {
        if (isEditMode && sector) {
            // Set the plant based on the sector's area
            if (sector.area?.plant?.id) {
                setLocalSelectedPlant(sector.area.plant.id.toString());
            }
        } else if (!isEditMode) {
            setLocalSelectedPlant('');
        }
    }, [sector, isEditMode]);

    const availableAreas = useMemo(() => {
        if (!localSelectedPlant) return [];
        const selectedPlant = plants.find((p) => p.id.toString() === localSelectedPlant);
        return selectedPlant?.areas || [];
    }, [localSelectedPlant, plants]);

    return (
        <BaseEntitySheet<SectorForm>
            entity={sector}
            open={open}
            onOpenChange={onOpenChange}
            mode={mode}
            formConfig={{
                initialData: {
                    name: '',
                    area_id: '',
                },
                createRoute: 'asset-hierarchy.setores.store',
                updateRoute: 'asset-hierarchy.setores.update',
                entityName: 'Setor',
            }}
        >
            {({ data, setData, errors }) => (
                <>
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
                                if (!isEditMode) {
                                    setData('area_id', ''); // Limpa a área quando mudar a planta
                                }
                            }}
                            placeholder="Selecione uma planta"
                            required
                            disabled={isEditMode}
                        />
                        {isEditMode && (
                            <p className="text-muted-foreground text-sm">
                                A planta não pode ser alterada ao editar um setor.
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
                            disabled={!localSelectedPlant || isEditMode}
                            required
                        />
                        {isEditMode && (
                            <p className="text-muted-foreground text-sm">
                                A área não pode ser alterada ao editar um setor.
                            </p>
                        )}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateSectorSheet;
