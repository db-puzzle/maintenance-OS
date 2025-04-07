import { type BreadcrumbItem, type EquipmentType, type Area, type EquipmentForm, type Sector, type Plant } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Camera, Upload } from 'lucide-react';
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
import CameraCapture from '@/components/camera-capture';
import { cn } from '@/lib/utils';
import SmartInput from "@/components/smart-input";
import { SmartPopover } from "@/components/ui/smart-popover";

import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/cadastro/create-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Novo Equipamento',
        href: '/cadastro/equipamentos/create',
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

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('photo', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handlePhotoCapture = (file: File) => {
        setData('photo', file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setPreviewUrl(null);
        setData('photo', null);
    };

    const handleSave = () => {
        post(route('cadastro.equipamentos.store'), {
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
                backRoute={route('cadastro.equipamentos')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
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
                                <InputError message={errors.photo} />
                            </div>
                        </div>

                        {/* Coluna 2: Informações Básicas */}
                        <div className="space-y-6">
                            {/* TAG */}
                            <div className="grid gap-2">
                                <Label htmlFor="tag">
                                    TAG
                                    <span className="text-destructive">*</span>
                                </Label>
                                <SmartInput<EquipmentForm>
                                    form={{
                                        data,
                                        setData,
                                        errors,
                                        clearErrors
                                    }}
                                    name="tag"
                                    placeholder="Digite a TAG do equipamento"
                                />
                                <InputError message={errors.tag} />
                            </div>

                            {/* Tipo de Equipamento */}
                            <div className="grid gap-2">
                                <Label htmlFor="equipment_type">
                                    Tipo de Equipamento
                                    <span className="text-destructive">*</span>
                                </Label>
                                <SmartPopover
                                    id="equipment_type"
                                    value={data.equipment_type_id}
                                    options={equipmentTypes}
                                    onChange={(value) => setData('equipment_type_id', value)}
                                    onClearError={() => clearErrors('equipment_type_id')}
                                    error={errors.equipment_type_id}
                                    placeholder="Selecione um tipo de equipamento"
                                    searchPlaceholder="Buscar tipo de equipamento..."
                                    emptyMessage="Nenhum tipo de equipamento encontrado."
                                    required
                                />
                            </div>

                            {/* Número Serial */}
                            <div className="grid gap-2">
                                <Label htmlFor="serial_number">Número Serial</Label>
                                <Input
                                    id="serial_number"
                                    value={data.serial_number}
                                    onChange={(e) => setData('serial_number', e.target.value)}
                                    placeholder="Número serial do equipamento"
                                />
                                <InputError message={errors.serial_number} />
                            </div>

                            {/* Ano de Fabricação */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturing_year">Ano de Fabricação</Label>
                                <Input
                                    id="manufacturing_year"
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={data.manufacturing_year}
                                    onChange={(e) => setData('manufacturing_year', e.target.value)}
                                    placeholder="Ano de fabricação"
                                />
                                <InputError message={errors.manufacturing_year} />
                            </div>
                        </div>

                        {/* Coluna 3: Localização e Informações Adicionais */}
                        <div className="space-y-6">
                            {/* Planta */}
                            <div className="grid gap-2">
                                <Label htmlFor="plant">
                                    Planta
                                    <span className="text-destructive">*</span>
                                </Label>
                                <SmartPopover
                                    id="plant"
                                    value={data.plant_id}
                                    options={plants}
                                    onChange={(value) => {
                                        setData('plant_id', value);
                                        setData('area_id', ''); // Limpa a área quando mudar a planta
                                        setData('sector_id', ''); // Limpa o setor quando mudar a planta
                                        clearErrors('plant_id');
                                    }}
                                    error={errors.plant_id}
                                    placeholder="Selecione uma planta"
                                    searchPlaceholder="Buscar planta..."
                                    emptyMessage="Nenhuma planta encontrada."
                                    required
                                />
                            </div>

                            {/* Área */}
                            <div className="grid gap-2">
                                <Label htmlFor="area">
                                    Área
                                </Label>
                                <SmartPopover
                                    id="area"
                                    value={data.area_id}
                                    options={availableAreas}
                                    onChange={(value) => {
                                        setData('area_id', value);
                                        setData('sector_id', ''); // Limpa o setor quando mudar a área
                                        clearErrors('area_id');
                                    }}
                                    error={errors.area_id}
                                    placeholder="Selecione uma área (opcional)"
                                    searchPlaceholder="Buscar área..."
                                    emptyMessage="Nenhuma área encontrada."
                                    disabled={!data.plant_id}
                                />
                                <InputError message={errors.area_id} />
                            </div>

                            {/* Setor */}
                            <div className="grid gap-2">
                                <Label htmlFor="sector">Setor</Label>
                                <SmartPopover
                                    id="sector"
                                    value={data.sector_id}
                                    options={availableSectors}
                                    onChange={(value) => {
                                        setData('sector_id', value);
                                        clearErrors('sector_id');
                                    }}
                                    error={errors.sector_id}
                                    placeholder={data.area_id ? "Selecione um setor (opcional)" : "Selecione uma área primeiro"}
                                    searchPlaceholder="Buscar setor..."
                                    emptyMessage="Nenhum setor encontrado."
                                    disabled={!data.area_id}
                                />
                                <InputError message={errors.sector_id} />
                            </div>

                            {/* Fabricante */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturer">Fabricante</Label>
                                <Input
                                    id="manufacturer"
                                    value={data.manufacturer}
                                    onChange={(e) => setData('manufacturer', e.target.value)}
                                    placeholder="Fabricante do equipamento"
                                />
                                <InputError message={errors.manufacturer} />
                            </div>
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

            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </AppLayout>
    );
} 