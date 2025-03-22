import { type BreadcrumbItem, type MachineType, type Area, type EquipmentForm } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Check, ChevronsUpDown, Camera, Upload } from 'lucide-react';
import { Link } from '@inertiajs/react';

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
    machineTypes: MachineType[];
    areas: Area[];
}

export default function CreateEquipment({ machineTypes, areas }: Props) {
    const { data, setData, post, processing, errors } = useForm<EquipmentForm>({
        tag: '',
        machine_type_id: '',
        description: '',
        nickname: '',
        manufacturer: '',
        manufacturing_year: '',
        area_id: '',
        photo: null
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [openMachineType, setOpenMachineType] = useState(false);
    const [openArea, setOpenArea] = useState(false);

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
        post(route('cadastro.equipamentos.store'));
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
                        {/* Seção Superior: Foto e Campos Principais */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Foto do Equipamento */}
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

                            {/* Campos Principais */}
                            <div className="space-y-6">
                                {/* TAG do Equipamento */}
                                <div className="grid gap-2">
                                    <Label htmlFor="tag" className="flex items-center gap-1">
                                        TAG do Equipamento
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="tag"
                                        value={data.tag}
                                        onChange={(e) => setData('tag', e.target.value.toUpperCase())}
                                        required
                                        placeholder="TAG do equipamento"
                                    />
                                    <InputError message={errors.tag} />
                                </div>

                                {/* Tipo de Equipamento */}
                                <div className="grid gap-2">
                                    <Label htmlFor="machine_type_id" className="flex items-center gap-1">
                                        Tipo de Equipamento
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Popover open={openMachineType} onOpenChange={setOpenMachineType}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openMachineType}
                                                className="w-full justify-between"
                                            >
                                                {data.machine_type_id
                                                    ? machineTypes.find((type) => type.id.toString() === data.machine_type_id)?.name
                                                    : "Selecione um tipo de equipamento"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command className="w-full">
                                                <CommandInput placeholder="Buscar tipo de equipamento..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum tipo de equipamento encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {machineTypes.map((type) => (
                                                            <CommandItem
                                                                key={type.id}
                                                                value={type.name}
                                                                onSelect={(currentValue) => {
                                                                    setData('machine_type_id', type.id.toString());
                                                                    setOpenMachineType(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        data.machine_type_id === type.id.toString() ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {type.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.machine_type_id} />
                                </div>

                                {/* Área */}
                                <div className="grid gap-2">
                                    <Label htmlFor="area_id" className="flex items-center gap-1">
                                        Área
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Popover open={openArea} onOpenChange={setOpenArea}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openArea}
                                                className="w-full justify-between"
                                            >
                                                {data.area_id
                                                    ? areas.find((area) => area.id.toString() === data.area_id)?.name
                                                    : "Selecione uma área"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command className="w-full">
                                                <CommandInput placeholder="Buscar área..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma área encontrada.</CommandEmpty>
                                                    <CommandGroup>
                                                        {areas.map((area) => (
                                                            <CommandItem
                                                                key={area.id}
                                                                value={area.name}
                                                                onSelect={(currentValue) => {
                                                                    setData('area_id', area.id.toString());
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

                                {/* Apelido */}
                                <div className="grid gap-2">
                                    <Label htmlFor="nickname">Apelido</Label>
                                    <Input
                                        id="nickname"
                                        value={data.nickname}
                                        onChange={(e) => setData('nickname', e.target.value)}
                                        placeholder="Apelido do equipamento"
                                    />
                                    <InputError message={errors.nickname} />
                                </div>
                            </div>
                        </div>

                        {/* Linha: Fabricante, Ano de Fabricação */}
                        <div className="grid sm:grid-cols-2 gap-6">
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

                        {/* Linha 4: Descrição */}
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