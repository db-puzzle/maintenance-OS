import { type BreadcrumbItem } from '@/types';
import { type AssetType, type AssetTypeForm } from '@/types/asset-hierarchy';
import { Head, useForm } from '@inertiajs/react';

import TextInput from '@/components/TextInput';
import { toast } from 'sonner';

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/tipos-ativo',
    },
    {
        title: 'Editar Tipo de Ativo',
        href: '/asset-hierarchy/tipos-ativo/edit',
    },
];

interface Props {
    assetType: AssetType;
}

export default function Edit({ assetType }: Props) {
    const { data, setData, put, processing, errors, clearErrors } = useForm<AssetTypeForm>({
        name: assetType.name,
        description: assetType.description || '',
    });

    const handleSave = () => {
        put(route('asset-hierarchy.tipos-ativo.update', assetType.id), {
            onError: () => {
                toast.error('Erro ao atualizar tipo de ativo', {
                    description: 'Verifique os campos e tente novamente.',
                });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Tipo de Ativo" />

            <EditLayout
                title="Editar Tipo de Ativo"
                subtitle="Edite as informações do tipo de ativo"
                backRoute={route('asset-hierarchy.tipos-ativo')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                    className="max-w-2xl space-y-6"
                >
                    <div className="grid gap-6">
                        <TextInput<AssetTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors,
                            }}
                            name="name"
                            label="Nome"
                            placeholder="Nome do tipo de ativo"
                            required
                        />

                        <TextInput<AssetTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors,
                            }}
                            name="description"
                            label="Descrição"
                            placeholder="Descrição do tipo de ativo"
                        />
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
}
