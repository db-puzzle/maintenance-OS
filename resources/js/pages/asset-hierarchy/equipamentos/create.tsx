import { type BreadcrumbItem } from '@/types';
import { type EquipmentType, type Area, type EquipmentForm, type Sector, type Plant } from '@/types/asset-hierarchy';
import { Head, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import SmartInput from "@/components/smart-input";
import { SmartPopover } from "@/components/ui/smart-popover";
import ItemSelect from '@/components/ItemSelect';
import TextInput from "@/components/TextInput";
import PhotoUploader from '@/components/PhotoUploader';

import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Novo Equipamento',
        href: '/asset-hierarchy/equipamentos/create',
    },
];

interface Props {
    plants: Plant[];
    equipmentTypes: EquipmentType[];
}

export default function CreateEquipment({ equipmentTypes, plants }: Props) {
    const { data, setData, post, processing, errors, clearErrors } = useForm<EquipmentForm>({
        tag: '',
        serial_number: '',
        equipment_type_id: '',
        description: '',
        nickname: '',
        manufacturer: '',
        manufacturing_year: '',
        plant_id: '',
        area_id: '',
        sector_id: '',
        photo: null as File | null,
    });

    const availableAreas = useMemo(() => {
        if (!data.plant_id) return [];
        const selectedPlant = plants.find(p => p.id.toString() === data.plant_id);
        return selectedPlant?.areas || [];
    }, [data.plant_id, plants]);

    const availableSectors = useMemo(() => {
        if (!data.area_id) return [];
        const selectedArea = availableAreas.find((a: Area) => a.id.toString() === data.area_id);
        return selectedArea?.sectors || [];
    }, [data.area_id, availableAreas]);

    const handleSave = () => {
        post(route('asset-hierarchy.equipamentos.store'), {
            onError: (errors) => {
                toast.error("Erro ao criar equipamento", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Equipamento" />

            <CreateLayout
                title="Novo Equipamento"
                subtitle="Cadastre um novo equipamento"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.equipamentos')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    {/* Foto e Campos Principais */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Coluna 1: Foto - utilizando o componente PhotoUploader */}
                        <PhotoUploader 
                            label="Foto do Equipamento"
                            value={data.photo}
                            onChange={(file) => setData('photo', file)}
                            error={errors.photo}
                        />

                        {/* Coluna 2: Informações Básicas */}
                        <div className="space-y-6">
                            {/* TAG */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="tag"
                                label="TAG"
                                placeholder="Digite a TAG do equipamento"
                                required
                            />

                            {/* Tipo de Equipamento */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Tipo de Equipamento"
                                    items={equipmentTypes}
                                    value={data.equipment_type_id || ''}
                                    onValueChange={(value) => {
                                        setData('equipment_type_id', value);
                                        clearErrors('equipment_type_id');
                                    }}
                                    createRoute={route('asset-hierarchy.tipos-equipamento.create')}
                                    placeholder="Selecione um tipo de equipamento"
                                    error={errors.equipment_type_id}
                                    required
                                />
                            </div>

                            {/* Número Serial */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="serial_number"
                                label="Número Serial"
                                placeholder="Número serial do equipamento"
                            />

                            {/* Ano de Fabricação */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="manufacturing_year"
                                label="Ano de Fabricação"
                                placeholder="Ano de fabricação"
                            />
                        </div>

                        {/* Coluna 3: Localização e Informações Adicionais */}
                        <div className="space-y-6">
                            {/* Planta */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Planta"
                                    items={plants}
                                    value={data.plant_id || ''}
                                    onValueChange={(value) => {
                                        setData('plant_id', value);
                                        setData('area_id', ''); // Limpa a área quando mudar a planta
                                        setData('sector_id', ''); // Limpa o setor quando mudar a planta
                                        clearErrors('plant_id');
                                    }}
                                    createRoute={route('asset-hierarchy.plantas.create')}
                                    placeholder="Selecione uma planta"
                                    error={errors.plant_id}
                                    required
                                />
                            </div>

                            {/* Área */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Área"
                                    items={availableAreas}
                                    value={data.area_id || ''}
                                    onValueChange={(value) => {
                                        setData('area_id', value);
                                        setData('sector_id', ''); // Limpa o setor quando mudar a área
                                        clearErrors('area_id');
                                    }}
                                    createRoute={route('asset-hierarchy.areas.create')}
                                    placeholder={data.plant_id ? "Selecione uma área (opcional)" : "Selecione uma planta primeiro"}
                                    error={errors.area_id}
                                    disabled={!data.plant_id}
                                />
                            </div>

                            {/* Setor */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Setor"
                                    items={availableSectors}
                                    value={data.sector_id || ''}
                                    onValueChange={(value) => {
                                        setData('sector_id', value);
                                        clearErrors('sector_id');
                                    }}
                                    createRoute={route('asset-hierarchy.setores.create')}
                                    placeholder={data.area_id ? "Selecione um setor (opcional)" : "Selecione uma área primeiro"}
                                    error={errors.sector_id}
                                    disabled={!data.area_id}
                                />
                            </div>

                            {/* Fabricante */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="manufacturer"
                                label="Fabricante"
                                placeholder="Fabricante do equipamento"
                            />
                        </div>
                    </div>

                    {/* Descrição (Ocupa toda a largura) */}
                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descrição da máquina"
                            className="min-h-[100px]"
                        />
                        <InputError message={errors.description} />
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 