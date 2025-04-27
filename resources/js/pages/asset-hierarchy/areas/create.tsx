import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ItemSelect from '@/components/ItemSelect';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
    },
    {
        title: 'Nova Área',
        href: '/asset-hierarchy/areas/create',
    },
];

interface AreaForm {
    [key: string]: string | undefined;
    name: string;
    plant_id?: string;
}

interface Props {
    plants: {
        id: number;
        name: string;
    }[];
}

export default function CreateArea({ plants }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm<AreaForm>({
        name: '',
        plant_id: '',
    });

    const handleSave = () => {
        post(route('asset-hierarchy.areas.store'), {
            onSuccess: () => reset('name', 'plant_id'),
            onError: (errors) => {
                toast.error("Erro ao criar área", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Área" />

            <CreateLayout
                title="Nova Área"
                subtitle="Adicione uma nova área ao sistema"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.areas')}
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
                                createRoute={route('asset-hierarchy.plantas.create')}
                                placeholder="Selecione uma planta"
                                error={errors.plant_id}
                            />
                        </div>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 