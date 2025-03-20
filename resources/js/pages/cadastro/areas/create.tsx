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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';

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

interface Props {
    factories: Factory[];
}

interface FormErrors {
    name?: string;
    factory_id?: string;
    message?: string;
}

export default function Create(props: Props) {
    const factories = props?.factories || [];
    const safeFactories = Array.isArray(factories) ? factories : [];

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        factory_id: '',
    });

    useEffect(() => {
        return () => {
            reset('name', 'factory_id');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('cadastro.areas.store'));
    };

    const hasNoFactories = safeFactories.length === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Área" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Nova Área" 
                        description="Crie uma nova área no sistema" 
                    />

                    {hasNoFactories && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Atenção</AlertTitle>
                            <AlertDescription>
                                Para criar uma área, é necessário ter pelo menos uma fábrica cadastrada.
                                <div className="mt-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('cadastro.fabricas.create')}>
                                            Criar Fábrica
                                        </Link>
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

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
                                    disabled={hasNoFactories}
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
                                    disabled={hasNoFactories}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma fábrica" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {safeFactories && safeFactories.length > 0 && safeFactories.map((factory) => (
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
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing || hasNoFactories}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 