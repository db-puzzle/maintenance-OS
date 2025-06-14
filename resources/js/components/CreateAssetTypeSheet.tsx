import React from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import TextInput from '@/components/TextInput';
import { AssetType } from '@/types/entities/asset-type';

interface AssetTypeForm {
    [key: string]: any;
    name: string;
    description: string;
}

interface CreateAssetTypeSheetProps {
    assetType?: AssetType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
}

const CreateAssetTypeSheet: React.FC<CreateAssetTypeSheetProps> = ({
    assetType,
    open,
    onOpenChange,
    mode,
}) => {
    return (
        <BaseEntitySheet<AssetTypeForm>
            entity={assetType}
            open={open}
            onOpenChange={onOpenChange}
            mode={mode}
            formConfig={{
                initialData: {
                    name: '',
                    description: '',
                },
                createRoute: 'asset-hierarchy.tipos-ativo.store',
                updateRoute: 'asset-hierarchy.tipos-ativo.update',
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
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateAssetTypeSheet;
