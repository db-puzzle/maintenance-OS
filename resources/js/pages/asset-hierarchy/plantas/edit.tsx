import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { estados } from '@/data/estados';
import { useState } from 'react';
import { toast } from "sonner";

interface Plant {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
}

interface Props {
    plant: Plant;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Plantas',
        href: '/asset-hierarchy/plantas',
    },
    {
        title: 'Editar Planta',
        href: '/asset-hierarchy/plantas/edit',
    },
];

interface PlantForm {
    [key: string]: any;
    name: string;
    street: string;
    number: string;
    city: string;
    state: string;
    zip_code: string;
    gps_coordinates: string;
}

export default function EditPlant({ plant }: Props) {
    const { data, setData, put, processing, errors, reset } = useForm<PlantForm>({
        name: plant.name,
        street: plant.street || '',
        number: plant.number || '',
        city: plant.city || '',
        state: plant.state || '',
        zip_code: plant.zip_code || '',
        gps_coordinates: plant.gps_coordinates || '',
    });

    const [open, setOpen] = useState(false);

    const formatCEP = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        const cep = numbers.slice(0, 8);
        return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    };

    const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatCEP(e.target.value);
        setData('zip_code', formattedValue);
    };

    const handleSave = () => {
        const formData = {
            ...data,
            zip_code: data.zip_code.replace(/\D/g, '')
        };
        put(route('asset-hierarchy.plantas.update', plant.id), {
            ...formData,
            onError: (errors: any) => {
                toast.error("Erro ao atualizar planta", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Planta" />

            <EditLayout
                title="Editar Planta"
                subtitle="Edite os dados da planta"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.plantas')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
                    <div className="grid gap-6">
                        {/* Nome da Planta - Campo Obrigatório */}
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="flex items-center gap-1">
                                Nome da Planta
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Nome da planta"
                            />
                            <InputError message={errors.name} />
                        </div>

                        {/* Endereço - Grid com 2 colunas */}
                        <div className="grid gap-2">
                            <Label>Endereço</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label htmlFor="street" className="text-sm text-muted-foreground">Rua</Label>
                                    <Input
                                        id="street"
                                        value={data.street}
                                        onChange={(e) => setData('street', e.target.value)}
                                        placeholder="Nome da rua"
                                    />
                                    <InputError message={errors.street} />
                                </div>
                                <div>
                                    <Label htmlFor="number" className="text-sm text-muted-foreground">Número</Label>
                                    <Input
                                        id="number"
                                        value={data.number}
                                        onChange={(e) => setData('number', e.target.value)}
                                        placeholder="Número"
                                    />
                                    <InputError message={errors.number} />
                                </div>
                                <div>
                                    <Label htmlFor="zip_code" className="text-sm text-muted-foreground">CEP</Label>
                                    <Input
                                        id="zip_code"
                                        value={data.zip_code}
                                        onChange={handleCEPChange}
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                    <InputError message={errors.zip_code} />
                                </div>
                            </div>
                        </div>

                        {/* Cidade e Estado - Grid com 2 colunas */}
                        <div className="grid gap-2">
                            <Label>Localização</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="city" className="text-sm text-muted-foreground">Cidade</Label>
                                    <Input
                                        id="city"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder="Cidade"
                                    />
                                    <InputError message={errors.city} />
                                </div>
                                <div>
                                    <Label htmlFor="state" className="text-sm text-muted-foreground">Estado</Label>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="state"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className="w-full justify-between"
                                            >
                                                {data.state
                                                    ? estados.find((estado) => estado.value === data.state)?.label
                                                    : "Selecione um estado..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar estado..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {estados.map((estado) => (
                                                            <CommandItem
                                                                key={estado.value}
                                                                value={estado.value}
                                                                onSelect={(currentValue) => {
                                                                    setData('state', currentValue === data.state ? "" : currentValue);
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        data.state === estado.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {estado.label}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.state} />
                                </div>
                            </div>
                        </div>

                        {/* Coordenadas GPS */}
                        <div className="grid gap-2">
                            <Label htmlFor="gps_coordinates">Coordenadas GPS</Label>
                            <Input
                                id="gps_coordinates"
                                value={data.gps_coordinates}
                                onChange={(e) => setData('gps_coordinates', e.target.value)}
                                placeholder="Ex: -23.550520, -46.633308"
                            />
                            <InputError message={errors.gps_coordinates} />
                        </div>
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 