import { type BreadcrumbItem, type Area, type Plant, type SectorForm } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import HeadingSmall from '@/components/heading-small';
import ItemSelect from '@/components/ItemSelect';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/asset-hierarchy/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Setores',
        href: '/asset-hierarchy/setores',
    },
    {
        title: 'Novo Setor',
        href: '/asset-hierarchy/setores/create',
    },
];

interface Props {
    plants: {
        id: number;
        name: string;
        areas: Area[];
    }[];
}

export default function CreateSector({ plants }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm<SectorForm>({
        name: '',
        area_id: '',
    });

    const [selectedPlant, setSelectedPlant] = useState<number | null>(null);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('asset-hierarchy.setores.store'), {
            onSuccess: () => {
                // Não precisa fazer nada aqui, a mensagem de flash será exibida
            },
            onError: (errors) => {
                toast.error("Erro ao criar setor", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Setor" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Novo Setor" 
                        description="Adicione um novo setor ao sistema" 
                    />

                    <form onSubmit={submit} className="space-y-6">
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

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 