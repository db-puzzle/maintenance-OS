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

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/cadastro/edit-layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Editar Equipamento',
        href: '/cadastro/equipamentos/edit',
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
        router.delete(route('cadastro.equipamentos.remove-photo', equipment.id), {
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

        router.post(route('cadastro.equipamentos.update', equipment.id), formData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`O equipamento ${form.data.tag} foi atualizado com sucesso!`);
                router.visit(route('cadastro.equipamentos.show', equipment.id));
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
                backRoute={route('cadastro.equipamentos.show', equipment.id)}
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
                            <div className="grid gap-2">
                                <Label htmlFor="tag">
                                    TAG
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tag"
                                    value={form.data.tag}
                                    onChange={(e) => form.setData('tag', e.target.value)}
                                    placeholder="TAG do equipamento"
                                    className={cn(
                                        "w-full",
                                        form.errors.tag && "border-destructive focus-visible:ring-destructive"
                                    )}
                                />
                                <InputError message={form.errors.tag} />
                            </div>

                            {/* Tipo de Equipamento */}
                            <div className="grid gap-2">
                                <Label htmlFor="equipment_type">
                                    Tipo de Equipamento
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Popover open={openEquipmentType} onOpenChange={setOpenEquipmentType}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="equipment_type"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openEquipmentType}
                                            className="w-full justify-between"
                                        >
                                            {form.data.equipment_type_id
                                                ? equipmentTypes.find((type) => type.id.toString() === form.data.equipment_type_id)?.name
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
                                                            form.setData('equipment_type_id', type.id.toString());
                                                            setOpenEquipmentType(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.data.equipment_type_id === type.id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {type.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <InputError message={form.errors.equipment_type_id} />
                            </div>

                            {/* Número Serial */}
                            <div className="grid gap-2">
                                <Label htmlFor="serial_number">Número Serial</Label>
                                <Input
                                    id="serial_number"
                                    value={form.data.serial_number}
                                    onChange={(e) => form.setData('serial_number', e.target.value)}
                                    placeholder="Número serial do equipamento"
                                />
                                <InputError message={form.errors.serial_number} />
                            </div>

                            {/* Ano de Fabricação */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturing_year">Ano de Fabricação</Label>
                                <Input
                                    id="manufacturing_year"
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={form.data.manufacturing_year}
                                    onChange={(e) => form.setData('manufacturing_year', e.target.value)}
                                    placeholder="Ano de fabricação"
                                />
                                <InputError message={form.errors.manufacturing_year} />
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
                                                                form.setData('plant_id', plantId.toString());
                                                                form.setData('area_id', ''); // Limpa a área quando mudar a planta
                                                                form.setData('sector_id', ''); // Limpa o setor quando mudar a planta
                                                                setSelectedArea(null); // Reseta a área selecionada
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
                                <Label htmlFor="area">
                                    Área
                                </Label>
                                <Popover open={openArea} onOpenChange={setOpenArea}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="area"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openArea}
                                            className="w-full justify-between"
                                            disabled={!selectedPlant}
                                        >
                                            {form.data.area_id
                                                ? availableAreas.find((area) => area.id.toString() === form.data.area_id)?.name
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
                                                    {availableAreas.map((area) => (
                                                        <CommandItem
                                                            key={area.id}
                                                            value={area.id.toString()}
                                                            onSelect={(value) => {
                                                                form.setData('area_id', value);
                                                                setSelectedArea(parseInt(value));
                                                                form.setData('sector_id', ''); // Limpa o setor quando mudar a área
                                                                setOpenArea(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    form.data.area_id === area.id.toString() ? "opacity-100" : "opacity-0"
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
                                <InputError message={form.errors.area_id} />
                            </div>

                            {/* Setor */}
                            <div className="grid gap-2">
                                <Label htmlFor="sector">Setor</Label>
                                <Popover open={openSector} onOpenChange={setOpenSector}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="sector"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openSector}
                                            className="w-full justify-between"
                                            disabled={!form.data.area_id}
                                        >
                                            {form.data.sector_id
                                                ? availableSectors.find((sector) => sector.id.toString() === form.data.sector_id)?.name
                                                : form.data.area_id ? "Selecione um setor (opcional)" : "Selecione uma área primeiro"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar setor..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {availableSectors.map((sector) => (
                                                        <CommandItem
                                                            key={sector.id}
                                                            value={sector.id.toString()}
                                                            onSelect={(value) => {
                                                                form.setData('sector_id', value);
                                                                setOpenSector(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    form.data.sector_id === sector.id.toString() ? "opacity-100" : "opacity-0"
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
                                <InputError message={form.errors.sector_id} />
                            </div>

                            {/* Fabricante */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturer">Fabricante</Label>
                                <Input
                                    id="manufacturer"
                                    value={form.data.manufacturer}
                                    onChange={(e) => form.setData('manufacturer', e.target.value)}
                                    placeholder="Fabricante do equipamento"
                                />
                                <InputError message={form.errors.manufacturer} />
                            </div>
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