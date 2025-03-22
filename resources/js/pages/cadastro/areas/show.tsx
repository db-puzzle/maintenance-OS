import { type BreadcrumbItem, type Equipment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
    {
        title: 'Detalhes da Área',
        href: '#',
    },
];

interface Machine {
    id: number;
    tag: string;
    name: string;
    machine_type: {
        name: string;
    };
}

interface Area {
    id: number;
    name: string;
    plant: {
        id: number;
        name: string;
    };
    machines: Machine[];
    created_at: string;
    updated_at: string;
    equipment: Equipment[];
}

interface Props {
    area: {
        id: number;
        name: string;
        plant: {
            id: number;
            name: string;
        };
        equipment: Equipment[];
    };
}

export default function Show({ area }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Área ${area.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title={`Área ${area.name}`}
                            description="Detalhes da área"
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href={route('cadastro.areas')}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={route('cadastro.areas.edit', area.id)}>
                                    Editar
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Gerais</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label>Nome</Label>
                                    <div className="text-base text-muted-foreground">{area.name}</div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Planta</Label>
                                    <div className="text-base text-muted-foreground">{area.plant.name}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Equipamentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {area.equipment.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>TAG</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Apelido</TableHead>
                                                <TableHead>Fabricante</TableHead>
                                                <TableHead>Ano</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {area.equipment.map((equipment) => (
                                                <TableRow 
                                                    key={equipment.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.get(route('cadastro.equipamentos.show', equipment.id))}
                                                >
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{equipment.tag}</div>
                                                            {equipment.nickname && (
                                                                <div className="text-sm text-muted-foreground">
                                                                    {equipment.nickname}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{equipment.machine_type?.name ?? '-'}</TableCell>
                                                    <TableCell>{equipment.nickname ?? '-'}</TableCell>
                                                    <TableCell>{equipment.manufacturer ?? '-'}</TableCell>
                                                    <TableCell>{equipment.manufacturing_year ?? '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-6">
                                    Nenhum equipamento cadastrado nesta área.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center gap-4">
                        <Button asChild>
                            <Link href={route('cadastro.areas.edit', area.id)}>
                                Editar Área
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('cadastro.areas')}>
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