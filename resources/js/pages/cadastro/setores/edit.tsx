import { type BreadcrumbItem, type Area, type Plant, type Sector, type SectorForm } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/cadastro/edit-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Setores',
        href: '/cadastro/setores',
    },
    {
        title: 'Editar Setor',
        href: '/cadastro/setores/edit',
    },
];

interface Props {
    sector: Sector & {
        area: {
            plant: {
                id: number;
            };
        };
    };
    plants: {
        id: number;
        name: string;
        areas: Area[];
    }[];
}

export default function EditSector({ sector, plants }: Props) {
    const { data, setData, put, processing, errors } = useForm<SectorForm>({
        name: sector.name,
        area_id: sector.area_id.toString(),
    });

    const [selectedPlant, setSelectedPlant] = useState<number | null>(sector.area.plant.id);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const handleSave = () => {
        put(route('cadastro.setores.update', sector.id), {
            onSuccess: () => {
                // O flash message será exibido automaticamente
            },
            onError: (errors) => {
                toast.error("Erro ao atualizar setor", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Setor" />

            <EditLayout
                title="Editar Setor"
                subtitle="Atualize as informações do setor"
                breadcrumbs={breadcrumbs}
                backRoute={route('cadastro.setores')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        {/* Nome */}
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="flex items-center gap-1">
                                Nome do Setor
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Nome do setor"
                            />
                            <InputError message={errors.name} />
                        </div>

                        {/* Planta */}
                        <div className="grid gap-2">
                            <Label htmlFor="plant" className="flex items-center gap-1">
                                Planta
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={selectedPlant?.toString()}
                                onValueChange={(value) => {
                                    const plantId = parseInt(value);
                                    setSelectedPlant(plantId);
                                    setData('area_id', '');
                                }}
                            >
                                <SelectTrigger id="plant">
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
                        </div>

                        {/* Área */}
                        <div className="grid gap-2">
                            <Label htmlFor="area_id" className="flex items-center gap-1">
                                Área
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.area_id}
                                onValueChange={(value) => setData('area_id', value)}
                                disabled={!selectedPlant}
                            >
                                <SelectTrigger id="area_id">
                                    <SelectValue placeholder={
                                        !selectedPlant 
                                            ? "Selecione uma planta primeiro" 
                                            : "Selecione uma área"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableAreas.length === 0 ? (
                                        <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                                            Não existe nenhuma área nessa planta
                                        </div>
                                    ) : (
                                        availableAreas.map((area) => (
                                            <SelectItem key={area.id} value={area.id.toString()}>
                                                {area.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.area_id} />
                        </div>
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 