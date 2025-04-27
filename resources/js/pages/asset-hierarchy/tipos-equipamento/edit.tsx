import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import InputError from '@/components/input-error';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Equipamento',
        href: '/asset-hierarchy/tipos-equipamento',
    },
    {
        title: 'Editar Tipo de Equipamento',
        href: '/asset-hierarchy/tipos-equipamento/edit',
    },
];

interface EquipmentTypeForm {
    name: string;
    description: string;
    [key: string]: string;
}

interface EquipmentType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    equipmentType: EquipmentType;
}

export default function Edit({ equipmentType }: Props) {
    const { data, setData, put, processing, errors } = useForm<EquipmentTypeForm>({
        name: equipmentType.name,
        description: equipmentType.description || '',
    });

    const handleSave = () => {
        put(route('asset-hierarchy.tipos-equipamento.update', equipmentType.id), {
            onError: (errors) => {
                toast.error("Erro ao atualizar tipo de equipamento", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Tipo de Equipamento" />

            <EditLayout
                title="Editar Tipo de Equipamento"
                subtitle="Edite as informações do tipo de equipamento"
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.tipos-equipamento')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 max-w-2xl">
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
                </form>
            </EditLayout>
        </AppLayout>
    );
} 