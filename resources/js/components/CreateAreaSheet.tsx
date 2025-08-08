import React, { useEffect, useRef } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { Area } from '@/types/entities/area';
interface AreaForm {
    [key: string]: string | number | boolean | null | undefined;
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
    const nameInputRef = useRef<HTMLInputElement>(null);
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
    return (
        <BaseEntitySheet<AreaForm>
            entity={area}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            triggerText={triggerText}
            triggerVariant={triggerVariant}
            showTrigger={showTrigger}
            triggerRef={triggerRef}
            formConfig={{
                initialData: {
                    name: '',
                    plant_id: selectedPlantId || '',
                },
                createRoute: 'asset-hierarchy.areas.store',
                updateRoute: 'asset-hierarchy.areas.update',
                entityName: 'Área',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome da Área - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData: setData as unknown,
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
