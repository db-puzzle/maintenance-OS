import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/cadastro/edit-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
    {
        title: 'Editar Área',
        href: '/cadastro/areas/edit',
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
    const { data, setData, put, processing, errors, reset } = useForm<AreaForm>({
        name: area.name,
        plant_id: area.plant_id.toString(),
    });

    const handleSave = () => {
        put(route('cadastro.areas.update', area.id), {
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
                backRoute={route('cadastro.areas')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="flex items-center gap-1">
                                Nome da Área
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Nome da área"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={data.plant_id || ''}
                                onValueChange={(value) => setData('plant_id', value)}
                                createRoute={route('cadastro.plantas.create')}
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