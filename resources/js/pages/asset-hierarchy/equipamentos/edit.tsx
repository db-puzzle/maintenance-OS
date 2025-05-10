import { type BreadcrumbItem } from '@/types';
import { type Equipment, type EquipmentType, type Area, type EquipmentForm, type Plant, type Sector } from '@/types/asset-hierarchy';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEvent, useState, useEffect } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import DeleteEquipment from '@/components/delete-equipment';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import PhotoUploader from '@/components/PhotoUploader';

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Editar Equipamento',
        href: '/asset-hierarchy/equipamentos/edit',
    },
];

interface Props {
    equipment: Equipment & {
        equipment_type: EquipmentType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
    };
    equipmentTypes: EquipmentType[];
    plants: Plant[];
}

export default function EditEquipment({ equipment, equipmentTypes, plants }: Props) {
    const form = useForm<EquipmentForm>({
        tag: equipment.tag,
        serial_number: equipment.serial_number || '',
        equipment_type_id: equipment.equipment_type_id.toString(),
        description: equipment.description || '',
        manufacturer: equipment.manufacturer || '',
        manufacturing_year: equipment.manufacturing_year?.toString() || '',
        plant_id: equipment.plant?.id?.toString() || '',
        area_id: equipment.area_id?.toString() || '',
        sector_id: equipment.sector_id?.toString() || '',
        photo: null,
        photo_path: equipment.photo_path
    });

    const [selectedPlant, setSelectedPlant] = useState<number | null>(equipment.plant?.id || null);
    const [selectedArea, setSelectedArea] = useState<number | null>(equipment.area?.id || null);
    const [openEquipmentType, setOpenEquipmentType] = useState(false);
    const [openArea, setOpenArea] = useState(false);
    const [openPlant, setOpenPlant] = useState(false);
    const [openSector, setOpenSector] = useState(false);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const availableSectors = selectedArea
        ? availableAreas.find(a => a.id === selectedArea)?.sectors || []
        : [];

    useEffect(() => {
        if (equipment.plant?.id) {
            setSelectedPlant(equipment.plant.id);
            form.setData('plant_id', equipment.plant.id.toString());
        }
        if (equipment.area?.id) {
            setSelectedArea(equipment.area.id);
        }
    }, [equipment]);

    const handleSubmit = () => {
        if (!form.data.tag) {
            toast.error("Erro ao atualizar equipamento", {
                description: "A TAG é obrigatória."
            });
            return;
        }

        if (!form.data.plant_id) {
            toast.error("Erro ao atualizar equipamento", {
                description: "A planta é obrigatória."
            });
            return;
        }

        const formData = new FormData();
        Object.keys(form.data).forEach(key => {
            if (key === 'photo') {
                if (form.data[key]) {
                    formData.append(key, form.data[key] as File);
                }
            } else {
                formData.append(key, form.data[key] as string);
            }
        });

        form.put(route('asset-hierarchy.equipamentos.update', { equipment: equipment.id }), {
            onSuccess: () => {
                toast.success(`O equipamento ${form.data.tag} foi atualizado com sucesso!`);
                router.visit(route('asset-hierarchy.equipamentos.show', equipment.id));
            },
            onError: (errors) => {
                toast.error("Erro ao atualizar equipamento", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Equipamento - ${equipment.tag}`} />

            <EditLayout
                title={`Editar Equipamento ${equipment.tag}`}
                subtitle="Modifique as informações do equipamento"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.equipamentos')}
                onSave={handleSubmit}
                isSaving={form.processing}
                deleteAction={
                    <DeleteEquipment equipment={equipment} />
                }
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }} className="space-y-6">
                    {/* Foto e Campos Principais */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Coluna 1: Foto - agora utilizando o componente PhotoUploader */}
                        <PhotoUploader 
                            label="Foto do Equipamento"
                            value={form.data.photo}
                            onChange={(file) => form.setData('photo', file)}
                            error={form.errors.photo}
                            initialPreview={form.data.photo_path ? `/storage/${form.data.photo_path}` : null}
                        />

                        {/* Coluna 2: Informações Básicas */}
                        <div className="space-y-6">
                            {/* TAG */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
                                }}
                                name="tag"
                                label="TAG"
                                placeholder="TAG do equipamento"
                                required
                            />

                            {/* Tipo de Equipamento */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Tipo de Equipamento"
                                    items={equipmentTypes}
                                    value={form.data.equipment_type_id || ''}
                                    onValueChange={(value) => {
                                        form.setData('equipment_type_id', value);
                                        form.clearErrors('equipment_type_id');
                                    }}
                                    createRoute={route('asset-hierarchy.tipos-equipamento.create')}
                                    placeholder="Selecione um tipo de equipamento"
                                    error={form.errors.equipment_type_id}
                                    required
                                />
                            </div>

                            {/* Número Serial */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
                                }}
                                name="serial_number"
                                label="Número Serial"
                                placeholder="Número serial do equipamento"
                            />

                            {/* Ano de Fabricação */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
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
                                    value={form.data.plant_id || ''}
                                    onValueChange={(value) => {
                                        form.setData('plant_id', value);
                                        form.setData('area_id', ''); // Limpa a área quando mudar a planta
                                        form.setData('sector_id', ''); // Limpa o setor quando mudar a planta
                                        form.clearErrors('plant_id');
                                    }}
                                    createRoute={route('asset-hierarchy.plantas.create')}
                                    placeholder="Selecione uma planta"
                                    error={form.errors.plant_id}
                                    required
                                />
                            </div>

                            {/* Área */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Área"
                                    items={availableAreas}
                                    value={form.data.area_id || ''}
                                    onValueChange={(value) => {
                                        form.setData('area_id', value);
                                        form.setData('sector_id', ''); // Limpa o setor quando mudar a área
                                        form.clearErrors('area_id');
                                    }}
                                    createRoute={route('asset-hierarchy.areas.create')}
                                    placeholder={form.data.plant_id ? "Selecione uma área (opcional)" : "Selecione uma planta primeiro"}
                                    error={form.errors.area_id}
                                    disabled={!form.data.plant_id}
                                />
                            </div>

                            {/* Setor */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Setor"
                                    items={availableSectors}
                                    value={form.data.sector_id || ''}
                                    onValueChange={(value) => {
                                        form.setData('sector_id', value);
                                        form.clearErrors('sector_id');
                                    }}
                                    createRoute={route('asset-hierarchy.setores.create')}
                                    placeholder={form.data.area_id ? "Selecione um setor (opcional)" : "Selecione uma área primeiro"}
                                    error={form.errors.sector_id}
                                    disabled={!form.data.area_id}
                                />
                            </div>

                            {/* Fabricante */}
                            <TextInput<EquipmentForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
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
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Descrição da máquina"
                            className="min-h-[100px]"
                        />
                        <InputError message={form.errors.description} />
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 