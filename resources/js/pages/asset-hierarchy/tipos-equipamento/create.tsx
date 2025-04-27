import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/asset-hierarchy/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Equipamento',
        href: '/asset-hierarchy/tipos-equipamento',
    },
    {
        title: 'Novo Tipo de Equipamento',
        href: '/asset-hierarchy/tipos-equipamento/create',
    },
];

interface EquipmentTypeForm {
    name: string;
    description: string;
    [key: string]: string;
}

export default function CreateEquipmentType() {
    const { data, setData, post, processing, errors } = useForm<EquipmentTypeForm>({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('asset-hierarchy.tipos-equipamento.store'), {
            onError: (errors) => {
                toast.error("Erro ao criar tipo de equipamento", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Tipo de Equipamento" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Novo Tipo de Equipamento" 
                            description="Crie um novo tipo de equipamento no sistema" 
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="flex items-center gap-1">
                                    Nome
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    required
                                    className={cn(errors.name && "border-red-500")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    className={cn(errors.description && "border-red-500")}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-start gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('asset-hierarchy.tipos-equipamento')}>
                                    Cancelar
                                </Link>
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 