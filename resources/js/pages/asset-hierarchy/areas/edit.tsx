import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
    },
    {
        title: 'Editar Área',
        href: '/asset-hierarchy/areas/edit',
    },
];

interface Area {
    id: number;
    name: string;
    plant_id: number;
    plant: {
        id: number;
        name: string;
    };
}

interface AreaForm {
    [key: string]: string | undefined;
    name: string;
    plant_id?: string;
}

interface Props {
    area: Area;
    plants: {
        id: number;
        name: string;
    }[];
}

export default function EditArea({ area, plants }: Props) {
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<AreaForm>({
        name: area.name,
        plant_id: area.plant_id.toString(),
    });

    const handleSave = () => {
        put(route('asset-hierarchy.areas.update', area.id), {
            onSuccess: () => reset('name', 'plant_id'),
            onError: (errors) => {
                toast.error("Erro ao atualizar área", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Área" />

            <EditLayout
                title="Editar Área"
                subtitle="Edite os dados da área"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.areas')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        <TextInput<AreaForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors
                            }}
                            name="name"
                            label="Nome da Área"
                            placeholder="Nome da área"
                            required
                        />

                        <div className="grid gap-2">
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={data.plant_id || ''}
                                onValueChange={(value) => setData('plant_id', value)}
                                createRoute={route('asset-hierarchy.plantas.create')}
                                placeholder="Selecione uma planta"
                                error={errors.plant_id}
                            />
                        </div>
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 