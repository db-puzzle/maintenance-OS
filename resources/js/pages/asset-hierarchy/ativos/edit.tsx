import { type BreadcrumbItem } from '@/types';
import { type Asset, type AssetType, type Area, type AssetForm, type Plant, type Sector } from '@/types/asset-hierarchy';
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
import DeleteAsset from '@/components/delete-asset';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';
import PhotoUploader from '@/components/PhotoUploader';

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ativos',
        href: '/asset-hierarchy/ativos',
    },
    {
        title: 'Editar Ativo',
        href: '/asset-hierarchy/ativos/edit',
    },
];

interface Props {
    asset: Asset & {
        asset_type: AssetType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
    };
    assetTypes: AssetType[];
    plants: Plant[];
}

export default function EditAsset({ asset, assetTypes, plants }: Props) {
    const form = useForm<AssetForm>({
        tag: asset.tag,
        serial_number: asset.serial_number || '',
        asset_type_id: asset.asset_type_id.toString(),
        description: asset.description || '',
        manufacturer: asset.manufacturer || '',
        manufacturing_year: asset.manufacturing_year?.toString() || '',
        plant_id: asset.plant?.id?.toString() || '',
        area_id: asset.area_id?.toString() || '',
        sector_id: asset.sector_id?.toString() || '',
        photo: null,
        photo_path: asset.photo_path
    });

    const [selectedPlant, setSelectedPlant] = useState<number | null>(asset.plant?.id || null);
    const [selectedArea, setSelectedArea] = useState<number | null>(asset.area?.id || null);
    const [openAssetType, setOpenAssetType] = useState(false);
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
        if (asset.plant?.id) {
            setSelectedPlant(asset.plant.id);
            form.setData('plant_id', asset.plant.id.toString());
        }
        if (asset.area?.id) {
            setSelectedArea(asset.area.id);
        }
    }, [asset]);

    const handleSubmit = () => {
        if (!form.data.tag) {
            toast.error("Erro ao atualizar ativo", {
                description: "A TAG é obrigatória."
            });
            return;
        }

        if (!form.data.plant_id) {
            toast.error("Erro ao atualizar ativo", {
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

        form.put(route('asset-hierarchy.ativos.update', { asset: asset.id }), {
            onSuccess: () => {
                toast.success(`O ativo ${form.data.tag} foi atualizado com sucesso!`);
                router.visit(route('asset-hierarchy.ativos.show', asset.id));
            },
            onError: (errors) => {
                toast.error("Erro ao atualizar ativo", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Ativo - ${asset.tag}`} />

            <EditLayout
                title={`Editar Ativo ${asset.tag}`}
                subtitle="Modifique as informações do ativo"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.ativos')}
                onSave={handleSubmit}
                isSaving={form.processing}
                deleteAction={
                    <DeleteAsset asset={asset} />
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
                            label="Foto do Ativo"
                            value={form.data.photo}
                            onChange={(file) => form.setData('photo', file)}
                            error={form.errors.photo}
                            initialPreview={form.data.photo_path ? `/storage/${form.data.photo_path}` : null}
                        />

                        {/* Coluna 2: Informações Básicas */}
                        <div className="space-y-6">
                            {/* TAG */}
                            <TextInput<AssetForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
                                }}
                                name="tag"
                                label="TAG"
                                placeholder="TAG do ativo"
                                required
                            />

                            {/* Tipo de Ativo */}
                            <div className="grid gap-2">
                                <ItemSelect
                                    label="Tipo de Ativo"
                                    items={assetTypes}
                                    value={form.data.asset_type_id || ''}
                                    onValueChange={(value) => {
                                        form.setData('asset_type_id', value);
                                        form.clearErrors('asset_type_id');
                                    }}
                                    createRoute={route('asset-hierarchy.tipos-ativo.create')}
                                    placeholder="Selecione um tipo de ativo"
                                    error={form.errors.asset_type_id}
                                    required
                                />
                            </div>

                            {/* Número Serial */}
                            <TextInput<AssetForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
                                }}
                                name="serial_number"
                                label="Número Serial"
                                placeholder="Número serial do ativo"
                            />

                            {/* Ano de Fabricação */}
                            <TextInput<AssetForm>
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
                            <TextInput<AssetForm>
                                form={{
                                    data: form.data,
                                    setData: form.setData,
                                    errors: form.errors,
                                    clearErrors: form.clearErrors
                                }}
                                name="manufacturer"
                                label="Fabricante"
                                placeholder="Fabricante do ativo"
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