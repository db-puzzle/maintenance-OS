import { type BreadcrumbItem, type EquipmentType, type Area, type EquipmentForm, type Sector, type Plant } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Check, ChevronsUpDown, Camera, Upload } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

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
    const { data, setData, post, processing, errors } = useForm<EquipmentForm>({
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
    const [openEquipmentType, setOpenEquipmentType] = useState(false);
    const [openArea, setOpenArea] = useState(false);
    const [openPlant, setOpenPlant] = useState(false);
    const [openSector, setOpenSector] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<number | null>(null);
    const [selectedArea, setSelectedArea] = useState<number | null>(null);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const availableSectors = selectedArea
        ? availableAreas.find((a: Area) => a.id === selectedArea)?.sectors || []
        : [];

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

    const submit = (e: FormEvent) => {
        e.preventDefault();
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

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall
                        title="Novo Equipamento"
                        description="Cadastre um novo equipamento"
                    />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Primeira Linha: Foto e Campos Principais */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Coluna 1: Foto */}
                            <div className="flex flex-col h-full">
                                <Label className="mb-2">Foto do Equipamento</Label>
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
                                                id="photo-upload"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                asChild
                                            >
                                                <label htmlFor="photo-upload" className="flex items-center justify-center gap-2 cursor-pointer">
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

                            {/* Coluna 2: Campos Principais */}
                            <div className="space-y-6">
                                {/* TAG */}
                                <div className="grid gap-2">
                                    <Label htmlFor="tag">TAG</Label>
                                    <Input
                                        id="tag"
                                        value={data.tag}
                                        onChange={(e) => setData('tag', e.target.value)}
                                        placeholder="TAG do equipamento"
                                    />
                                    <InputError message={errors.tag} />
                                </div>

                                {/* Tipo de Equipamento */}
                                <div className="grid gap-2">
                                    <Label htmlFor="equipment_type_id" className="flex items-center gap-1">
                                        Tipo de Equipamento
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Popover open={openEquipmentType} onOpenChange={setOpenEquipmentType}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="equipment_type_id"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openEquipmentType}
                                                className="w-full justify-between"
                                            >
                                                {data.equipment_type_id
                                                    ? equipmentTypes.find((type) => type.id.toString() === data.equipment_type_id)?.name
                                                    : "Selecione um tipo de equipamento"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar tipo de equipamento..." />
                                                <CommandEmpty>Nenhum tipo de equipamento encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {equipmentTypes.map((type) => (
                                                        <CommandItem
                                                            key={type.id}
                                                            value={type.name}
                                                            onSelect={() => {
                                                                setData('equipment_type_id', type.id.toString());
                                                                setOpenEquipmentType(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    data.equipment_type_id === type.id.toString() ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {type.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.equipment_type_id} />
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
                        </div>

                        {/* Segunda Linha: Localização e Informações Adicionais */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Coluna 3: Localização */}
                            <div className="space-y-6">
                                {/* Planta */}
                                <div className="grid gap-2">
                                    <Label htmlFor="plant" className="flex items-center gap-1">
                                        Planta
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Popover open={openPlant} onOpenChange={setOpenPlant}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="plant"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openPlant}
                                                className="w-full justify-between"
                                            >
                                                {selectedPlant
                                                    ? plants.find((plant) => plant.id === selectedPlant)?.name
                                                    : "Selecione uma planta"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar planta..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma planta encontrada.</CommandEmpty>
                                                    <CommandGroup>
                                                        {plants.map((plant) => (
                                                            <CommandItem
                                                                key={plant.id}
                                                                value={plant.id.toString()}
                                                                onSelect={(value) => {
                                                                    const plantId = parseInt(value);
                                                                    setSelectedPlant(plantId);
                                                                    setData('plant_id', plantId.toString());
                                                                    setData('area_id', '');
                                                                    setData('sector_id', '');
                                                                    setOpenPlant(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedPlant === plant.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {plant.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Área */}
                                <div className="grid gap-2">
                                    <Label htmlFor="area_id">
                                        Área
                                    </Label>
                                    <Popover open={openArea} onOpenChange={setOpenArea}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="area_id"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openArea}
                                                className="w-full justify-between"
                                            >
                                                {data.area_id
                                                    ? availableAreas.find((area: Area) => area.id.toString() === data.area_id)?.name
                                                    : "Selecione uma área (opcional)"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar área..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma área encontrada.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableAreas.map((area: Area) => (
                                                            <CommandItem
                                                                key={area.id}
                                                                value={area.id.toString()}
                                                                onSelect={(value) => {
                                                                    setData('area_id', value);
                                                                    setSelectedArea(parseInt(value));
                                                                    setData('sector_id', ''); // Limpa o setor quando mudar a área
                                                                    setOpenArea(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        data.area_id === area.id.toString() ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {area.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.area_id} />
                                </div>

                                {/* Setor */}
                                <div className="grid gap-2">
                                    <Label htmlFor="sector_id">Setor</Label>
                                    <Popover open={openSector} onOpenChange={setOpenSector}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="sector_id"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openSector}
                                                className="w-full justify-between"
                                            >
                                                {data.sector_id
                                                    ? availableSectors.find((sector: Sector) => sector.id.toString() === data.sector_id)?.name
                                                    : "Selecione um setor (opcional)"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar setor..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableSectors.map((sector: Sector) => (
                                                            <CommandItem
                                                                key={sector.id}
                                                                value={sector.id.toString()}
                                                                onSelect={(value) => {
                                                                    setData('sector_id', value);
                                                                    setOpenSector(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        data.sector_id === sector.id.toString() ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {sector.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.sector_id} />
                                </div>
                            </div>

                            {/* Coluna 4: Informações Adicionais */}
                            <div className="flex flex-col h-full space-y-6">
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

                                {/* Descrição */}
                                <div className="flex-1 flex flex-col gap-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Descrição da máquina"
                                        className="flex-1 min-h-0"
                                    />
                                    <InputError message={errors.description} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                Salvar
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => window.history.back()}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>

            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </AppLayout>
    );
} 