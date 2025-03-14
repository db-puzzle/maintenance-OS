import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
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
        title: 'Nova Área',
        href: '/cadastro/areas/create',
    },
];

interface Factory {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
}

interface Props {
    factories: Factory[];
    areas: Area[];
}

interface FormErrors {
    name?: string;
    factory_id?: string;
    parent_area_id?: string;
    message?: string;
}

export default function Create({ factories, areas }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        factory_id: '',
        parent_area_id: '',
    });

    useEffect(() => {
        return () => {
            reset('name', 'factory_id', 'parent_area_id');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('cadastro.areas.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Área" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Nova Área" 
                        description="Crie uma nova área no sistema" 
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
                                <Label>Vínculo</Label>
                                <div className="grid gap-4">
                                    <div>
                                        <Label htmlFor="factory_id">Fábrica</Label>
                                        <Select
                                            value={data.factory_id}
                                            onValueChange={(value) => {
                                                setData('factory_id', value);
                                                setData('parent_area_id', '');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma fábrica" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhuma</SelectItem>
                                                {factories.map((factory) => (
                                                    <SelectItem key={factory.id} value={factory.id.toString()}>
                                                        {factory.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="parent_area_id">Área Pai</Label>
                                        <Select
                                            value={data.parent_area_id}
                                            onValueChange={(value) => {
                                                setData('parent_area_id', value);
                                                setData('factory_id', '');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma área pai" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhuma</SelectItem>
                                                {areas.map((area) => (
                                                    <SelectItem key={area.id} value={area.id.toString()}>
                                                        {area.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {errors.factory_id && (
                                    <p className="text-sm text-red-500">{errors.factory_id}</p>
                                )}
                                {errors.parent_area_id && (
                                    <p className="text-sm text-red-500">{errors.parent_area_id}</p>
                                )}
                                {(errors as FormErrors).message && (
                                    <p className="text-sm text-red-500">{(errors as FormErrors).message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={() => window.history.back()}>
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