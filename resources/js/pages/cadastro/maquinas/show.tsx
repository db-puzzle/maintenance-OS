import { type BreadcrumbItem, type Machine } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

interface Props {
    machine: Machine;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Máquinas',
        href: '/cadastro/maquinas',
    },
    {
        title: 'Detalhes',
        href: '#',
    },
];

export default function Show({ machine }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Máquina ${machine.tag}`} />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title={`Máquina ${machine.tag}`}
                        description="Detalhes da máquina"
                    />

                    <div className="space-y-2">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Foto da Máquina */}
                            <div className="flex flex-col h-full">
                                <Label className="mb-2">Foto da Máquina</Label>
                                <div className="flex-1 relative rounded-lg overflow-hidden bg-muted min-h-[238px] max-h-[238px]">
                                    {machine.photo_path ? (
                                        <img
                                            src={`/storage/${machine.photo_path}`}
                                            alt={`Foto da máquina ${machine.tag}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Camera className="w-12 h-12" />
                                            <span className="text-sm">Sem foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informações Principais */}
                            <Card className="border-none shadow-none">
                                <CardContent className="p-0 space-y-4">
                                    <div className="grid gap-2">
                                        <Label>TAG</Label>
                                        <div className="text-base text-muted-foreground">{machine.tag}</div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Tipo</Label>
                                        <div className="text-base text-muted-foreground">{machine.machine_type?.name ?? '-'}</div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Área</Label>
                                        <div className="text-base text-muted-foreground">{machine.area?.name ?? '-'}</div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Apelido</Label>
                                        <div className="text-base text-muted-foreground">{machine.nickname ?? '-'}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Informações Adicionais */}
                        <Card className="border-none shadow-none">
                            <CardContent className="p-0">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label>Fabricante</Label>
                                        <div className="text-base text-muted-foreground">{machine.manufacturer ?? '-'}</div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Ano de Fabricação</Label>
                                        <div className="text-base text-muted-foreground">{machine.manufacturing_year ?? '-'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button asChild>
                            <Link href={route('cadastro.maquinas.edit', machine.id)}>
                                Editar Máquina
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('cadastro.maquinas')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Link>
                        </Button>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 