import React, { useEffect, useRef } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';
import { AssetType } from '@/types/entities/asset-type';
interface AssetTypeForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    description: string;
}
interface CreateAssetTypeSheetProps {
    assetType?: AssetType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    onSuccess?: () => void;
}
const CreateAssetTypeSheet: React.FC<CreateAssetTypeSheetProps> = ({ assetType, open, onOpenChange, mode, onSuccess }) => {
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
        <BaseEntitySheet<AssetTypeForm>
            entity={assetType}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            formConfig={{
                initialData: {
                    name: '',
                    description: '',
                },
                createRoute: 'asset-hierarchy.asset-types.store',
                updateRoute: 'asset-hierarchy.asset-types.update',
                entityName: 'Tipo de Ativo',
                sheetTitle: {
                    create: 'Novo Tipo de Ativo',
                    edit: 'Editar Tipo de Ativo',
                },
                sheetDescription: {
                    create: 'Adicione um novo tipo de ativo ao sistema',
                    edit: 'Edite os dados do tipo de ativo',
                },
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome do Tipo - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData: setData as unknown,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome"
                        placeholder="Nome do tipo de ativo"
                        required
                    />
                    {/* Descrição */}
                    <TextInput
                        form={{
                            data,
                            setData: setData as unknown,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="description"
                        label="Descrição"
                        placeholder="Descrição do tipo de ativo"
                    />
                </>
            )}
        </BaseEntitySheet>
    );
};
export default CreateAssetTypeSheet;
