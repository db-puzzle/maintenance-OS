import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

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

interface Factory {
    id: number;
    name: string;
}

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
    name: string;
    plant_id?: string;
}

interface FormErrors {
    name?: string;
    plant_id?: string;
    message?: string;
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('cadastro.areas.update', area.id), {
            onSuccess: () => reset('name', 'plant_id'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Área" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Editar Área" 
                        description="Edite os dados da área" 
                    />

                    <form onSubmit={submit} className="space-y-6">
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
                                <Label htmlFor="plant_id" className="flex items-center gap-1">
                                    Planta
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.plant_id}
                                    onValueChange={(value) => setData('plant_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma planta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plants.map((plant) => (
                                            <SelectItem key={plant.id} value={plant.id.toString()}>
                                                {plant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.plant_id && (
                                    <p className="text-sm text-red-500">{errors.plant_id}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={() => router.visit(route('cadastro.areas'))}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 