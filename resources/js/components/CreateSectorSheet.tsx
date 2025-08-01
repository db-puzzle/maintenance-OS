import React, { useEffect, useMemo, useRef, useState } from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { type Plant } from '@/types/asset-hierarchy';
import { Sector } from '@/types/entities/sector';

interface SectorForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    area_id: string;
}

interface CreateSectorSheetProps {
    sector?: Sector;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    plants: Plant[];
    onSuccess?: () => void;
    selectedPlantId?: string;
    selectedAreaId?: string;
    disableParentFields?: boolean;
}

const CreateSectorSheet: React.FC<CreateSectorSheetProps> = ({
    sector,
    open,
    onOpenChange,
    mode,
    plants = [],
    onSuccess,
    selectedPlantId,
    selectedAreaId,
    disableParentFields = false,
}) => {
    const isEditMode = mode === 'edit';
    const [localSelectedPlant, setLocalSelectedPlant] = useState<string>(selectedPlantId || '');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Update selected plant when sector changes (for edit mode) or when selectedPlantId changes
    useEffect(() => {
        if (isEditMode && sector) {
            // Set the plant based on the sector's area
            if (sector.area?.plant?.id) {
                setLocalSelectedPlant(sector.area.plant.id.toString());
            }
        } else if (!isEditMode && selectedPlantId) {
            setLocalSelectedPlant(selectedPlantId);
        }
    }, [sector, isEditMode, selectedPlantId]);

    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (open && mode === 'create') {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        nameInputRef.current.select();
                    }
                });
            };

            // Try multiple times with increasing delays to handle animation and focus traps
            const timeouts = [100, 300, 500];
            const timers = timeouts.map((delay) => setTimeout(focusInput, delay));

            // Cleanup timeouts
            return () => {
                timers.forEach((timer) => clearTimeout(timer));
            };
        }
    }, [open, mode]);

    // Handle onOpenChange to focus when sheet opens
    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }

        // Focus the input when opening in create mode
        if (open && mode === 'create') {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        }
    };

    const availableAreas = useMemo(() => {
        if (!localSelectedPlant) return [];
        const selectedPlant = plants.find((p) => p.id.toString() === localSelectedPlant);
        return selectedPlant?.areas || [];
    }, [localSelectedPlant, plants]);

    return (
        <BaseEntitySheet<SectorForm>
            entity={sector}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            formConfig={{
                initialData: {
                    name: '',
                    area_id: selectedAreaId || '',
                },
                createRoute: 'asset-hierarchy.sectors.store',
                updateRoute: 'asset-hierarchy.sectors.update',
                entityName: 'Setor',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome do Setor - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
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
                                if (!isEditMode && !disableParentFields) {
                                    setData('area_id', ''); // Limpa a área quando mudar a planta
                                }
                            }}
                            placeholder="Selecione uma planta"
                            required
                            disabled={isEditMode || disableParentFields}
                        />
                        {(isEditMode || disableParentFields) && (
                            <p className="text-muted-foreground text-sm">
                                {isEditMode
                                    ? 'A planta não pode ser alterada ao editar um setor.'
                                    : 'A planta foi pré-selecionada e não pode ser alterada.'}
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
                            disabled={!localSelectedPlant || isEditMode || disableParentFields}
                            required
                        />
                        {(isEditMode || disableParentFields) && (
                            <p className="text-muted-foreground text-sm">
                                {isEditMode
                                    ? 'A área não pode ser alterada ao editar um setor.'
                                    : 'A área foi pré-selecionada e não pode ser alterada.'}
                            </p>
                        )}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateSectorSheet;
