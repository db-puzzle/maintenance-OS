import { type BreadcrumbItem, type Equipment, type EquipmentType, type Area, type EquipmentForm, type Plant, type Sector } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEvent, useState, useEffect } from 'react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Camera, Upload, ChevronsUpDown, Check } from 'lucide-react';
import CameraCapture from '@/components/camera-capture';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import DeleteEquipment from '@/components/delete-equipment';
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';

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

    const [previewUrl, setPreviewUrl] = useState<string | null>(equipment.photo_path ? `/storage/${equipment.photo_path}` : null);
    const [showCamera, setShowCamera] = useState(false);
    const [openEquipmentType, setOpenEquipmentType] = useState(false);
    const [openArea, setOpenArea] = useState(false);
    const [openPlant, setOpenPlant] = useState(false);
    const [openSector, setOpenSector] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<number | null>(equipment.plant?.id || null);
    const [selectedArea, setSelectedArea] = useState<number | null>(equipment.area?.id || null);

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

    const handleRemovePhoto = () => {
        router.delete(route('asset-hierarchy.equipamentos.remove-photo', equipment.id), {
            preserveScroll: true,
            onSuccess: () => {
                setPreviewUrl(null);
                form.setData('photo', null);
                form.setData('photo_path', null);
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('photo', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handlePhotoCapture = (file: File) => {
        form.setData('photo', file);
        setPreviewUrl(URL.createObjectURL(file));
    };

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

        router.post(route('asset-hierarchy.equipamentos.update', equipment.id), formData, {
            preserveScroll: true,
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
            <Head title="Editar Equipamento" />

            <EditLayout
                title="Editar Equipamento"
                subtitle="Edite os dados do equipamento"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.equipamentos.show', equipment.id)}
                onSave={handleSubmit}
                isSaving={form.processing}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }} className="space-y-6">
                    {/* Foto e Campos Principais */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Coluna 1: Foto */}
                        <div className="flex flex-col h-full">
                            <Label htmlFor="photo" className="mb-2">Foto do Equipamento</Label>
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex-1 relative rounded-lg overflow-hidden bg-muted border min-h-[238px] max-h-[238px]">
                                    {previewUrl ? (
                                        <div className="relative w-full h-full">
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={handleRemovePhoto}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Camera className="w-12 h-12" />
                                            <span className="text-sm">Nenhuma foto selecionada</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="photo"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            asChild
                                        >
                                            <label htmlFor="photo" className="flex items-center justify-center gap-2 cursor-pointer">
                                                <Upload className="w-4 h-4" />
                                                Selecionar Arquivo
                                            </label>
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowCamera(true)}
                                        className="flex-1"
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Usar Câmera
                                    </Button>
                                </div>
                                <InputError message={form.errors.photo} />
                            </div>
                        </div>

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

                <div className="mt-12 w-full">
                    <DeleteEquipment equipmentId={equipment.id} equipmentTag={equipment.tag} />
                </div>
            </EditLayout>

            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </AppLayout>
    );
} 