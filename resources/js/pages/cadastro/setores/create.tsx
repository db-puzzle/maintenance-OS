import { type BreadcrumbItem, type Area, type Plant, type SectorForm } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import HeadingSmall from '@/components/heading-small';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';

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
        title: 'Novo Setor',
        href: '/cadastro/setores/create',
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
        description: '',
        area_id: '',
    });

    const [selectedPlant, setSelectedPlant] = useState<number | null>(null);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('cadastro.setores.store'), {
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

                            {/* Descrição */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Descrição do setor"
                                />
                                <InputError message={errors.description} />
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
                                    <SelectTrigger>
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