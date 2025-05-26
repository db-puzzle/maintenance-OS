import { type BreadcrumbItem } from '@/types';
import { type Area, type Sector, type SectorForm } from '@/types/asset-hierarchy';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy/assets',
    },
    {
        title: 'Setores',
        href: '/asset-hierarchy/setores',
    },
    {
        title: 'Editar Setor',
        href: '/asset-hierarchy/setores/edit',
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
        put(route('asset-hierarchy.setores.update', sector.id), {
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
                backRoute={route('asset-hierarchy.setores')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        {/* Nome */}
                        <TextInput<SectorForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => {}
                            }}
                            name="name"
                            label="Nome do Setor"
                            placeholder="Nome do setor"
                            required
                        />

                        {/* Planta */}
                        <div className="grid gap-2">
                            <ItemSelect
                                label="Planta"
                                items={plants}
                                value={selectedPlant?.toString() || ''}
                                onValueChange={(value) => {
                                    const plantId = parseInt(value);
                                    setSelectedPlant(plantId);
                                    setData('area_id', '');
                                }}
                                createRoute={route('asset-hierarchy.plantas.create')}
                                placeholder="Selecione uma planta"
                            />
                        </div>

                        {/* Área */}
                        <div className="grid gap-2">
                            <ItemSelect
                                label="Área"
                                items={availableAreas}
                                value={data.area_id || ''}
                                onValueChange={(value) => setData('area_id', value)}
                                createRoute={route('asset-hierarchy.areas.create')}
                                placeholder={!selectedPlant ? "Selecione uma planta primeiro" : "Selecione uma área"}
                                error={errors.area_id}
                                disabled={!selectedPlant}
                            />
                        </div>
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 