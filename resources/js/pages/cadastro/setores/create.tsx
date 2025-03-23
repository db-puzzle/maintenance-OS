import { type BreadcrumbItem, type Area, type Plant, type SectorForm } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

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
    const { data, setData, post, processing, errors } = useForm<SectorForm>({
        name: '',
        description: '',
        area_id: '',
    });

    const [openPlant, setOpenPlant] = useState(false);
    const [openArea, setOpenArea] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<number | null>(null);

    const availableAreas = selectedPlant
        ? plants.find(p => p.id === selectedPlant)?.areas || []
        : [];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('cadastro.setores.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Setor" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Nome */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
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
                            <Popover open={openPlant} onOpenChange={setOpenPlant}>
                                <PopoverTrigger asChild>
                                    <Button
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
                                                            setData('area_id', '');
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
                                        disabled={!selectedPlant}
                                    >
                                        {data.area_id
                                            ? availableAreas.find((area) => area.id.toString() === data.area_id)?.name
                                            : "Selecione uma área"}
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
                                                            setData('area_id', value);
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

                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing}>
                                Salvar
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 