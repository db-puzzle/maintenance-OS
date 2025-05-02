import { type BreadcrumbItem, type EquipmentType, type EquipmentTypeForm } from '@/types';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TextInput from '@/components/TextInput';
import { toast } from "sonner";

import AppLayout from '@/layouts/app-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';
import React from 'react';

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

interface Props {
    equipmentType: EquipmentType;
}

export default function Edit({ equipmentType }: Props) {
    const { data, setData, put, processing, errors, clearErrors } = useForm<EquipmentTypeForm>({
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
                        <TextInput<EquipmentTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors
                            }}
                            name="name"
                            label="Nome"
                            placeholder="Nome do tipo de equipamento"
                            required
                        />

                        <TextInput<EquipmentTypeForm>
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors
                            }}
                            name="description"
                            label="Descrição"
                            placeholder="Descrição do tipo de equipamento"
                        />
                    </div>
                </form>
            </EditLayout>
        </AppLayout>
    );
} 