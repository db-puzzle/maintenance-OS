import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Máquina',
        href: '/cadastro/tipos-maquina',
    },
    {
        title: 'Editar Tipo de Máquina',
        href: '/cadastro/tipos-maquina/edit',
    },
];

interface MachineType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface MachineTypeForm {
    name: string;
    description: string;
    [key: string]: string;
}

interface Props {
    machineType: MachineType;
}

export default function EditMachineType({ machineType }: Props) {
    const { data, setData, put, processing, errors } = useForm<MachineTypeForm>({
        name: machineType.name,
        description: machineType.description || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('cadastro.tipos-maquina.update', machineType.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Tipo de Máquina" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Editar Tipo de Máquina" 
                        description="Atualize as informações do tipo de máquina" 
                    />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-6">
                            {/* Nome do Tipo de Máquina - Campo Obrigatório */}
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="flex items-center gap-1">
                                    Nome do Tipo de Máquina
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    placeholder="Nome do tipo de máquina"
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Descrição */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Descrição do tipo de máquina"
                                />
                                <InputError message={errors.description} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.visit(route('cadastro.tipos-maquina'))}
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