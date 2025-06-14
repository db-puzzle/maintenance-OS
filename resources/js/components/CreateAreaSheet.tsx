import React, { useEffect } from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import { Area } from '@/types/entities/area';

interface AreaForm {
    [key: string]: any;
    name: string;
    plant_id: string;
}

interface CreateAreaSheetProps {
    area?: Area;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: 'create' | 'edit';
    onSuccess?: () => void;
    plants?: {
        id: number;
        name: string;
    }[];
    selectedPlantId?: string;
    disableParentFields?: boolean;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const CreateAreaSheet: React.FC<CreateAreaSheetProps> = ({
    area,
    open,
    onOpenChange,
    mode = 'create',
    onSuccess,
    plants = [],
    selectedPlantId,
    disableParentFields = false,
    triggerText = 'Nova Área',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
}) => {
    const [formData, setFormData] = React.useState<AreaForm>({
        name: '',
        plant_id: selectedPlantId || '',
    });

    // Update form data when area or selectedPlantId changes
    useEffect(() => {
        if (mode === 'edit' && area) {
            setFormData({
                name: area.name || '',
                plant_id: area.plant_id?.toString() || '',
            });
        } else if (mode === 'create') {
            setFormData({
                name: '',
                plant_id: selectedPlantId || '',
            });
        }
    }, [area, mode, selectedPlantId]);

    return (
        <BaseEntitySheet<AreaForm>
            entity={area}
            open={open}
            onOpenChange={onOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            triggerText={triggerText}
            triggerVariant={triggerVariant}
            showTrigger={showTrigger}
            triggerRef={triggerRef}
            formConfig={{
                initialData: formData,
                createRoute: 'asset-hierarchy.areas.store',
                updateRoute: 'asset-hierarchy.areas.update',
                entityName: 'Área',
            }}
        >
            {({ data, setData, errors, processing }) => (
                <>
                    {/* Nome da Área - Campo Obrigatório */}
                    <TextInput<AreaForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
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
                            <p className="text-muted-foreground text-sm">A planta foi pré-selecionada e não pode ser alterada.</p>
                        )}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateAreaSheet;
