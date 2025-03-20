import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
    {
        title: 'Editar Área',
        href: '/cadastro/areas/edit',
    },
];

interface Factory {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    factory_id: number;
    factory?: {
        name: string;
    };
}

interface FormErrors {
    name?: string;
    factory_id?: string;
    message?: string;
}

interface Props {
    area: Area;
    factories: Factory[];
}

export default function Edit({ area, factories }: Props) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: area.name,
        factory_id: area.factory_id.toString(),
    });

    useEffect(() => {
        return () => {
            reset('name', 'factory_id');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('cadastro.areas.update', area.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Área" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Editar Área" 
                        description="Atualize as informações da área" 
                    />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="flex items-center gap-1">
                                    Nome da Área
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    required
                                    placeholder="Nome da área"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="factory_id" className="flex items-center gap-1">
                                    Fábrica
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.factory_id}
                                    onValueChange={(value) => setData('factory_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma fábrica" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {factories.map((factory) => (
                                            <SelectItem key={factory.id} value={factory.id.toString()}>
                                                {factory.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.factory_id && (
                                    <p className="text-sm text-red-500">{errors.factory_id}</p>
                                )}
                                {(errors as FormErrors).message && (
                                    <p className="text-sm text-red-500">{(errors as FormErrors).message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.visit(route('cadastro.areas'))}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 