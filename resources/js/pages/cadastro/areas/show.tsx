import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
    factory: {
        id: number;
        name: string;
    } | null;
    machines: Machine[];
    created_at: string;
    updated_at: string;
}

interface Props {
    area: Area;
}

export default function Show({ area }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Área - ${area.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title={area.name}
                            description="Detalhes da área e suas máquinas"
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href={route('cadastro.areas')}>
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

                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações Gerais</CardTitle>
                                <CardDescription>
                                    Detalhes básicos da área
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Nome</h4>
                                        <p className="text-sm">{area.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Fábrica</h4>
                                        <p className="text-sm">
                                            {area.factory ? (
                                                <Link 
                                                    href={route('cadastro.fabricas.edit', area.factory.id)}
                                                    className="text-primary hover:underline"
                                                >
                                                    {area.factory.name}
                                                </Link>
                                            ) : (
                                                'Nenhuma'
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Criado em</h4>
                                        <p className="text-sm">
                                            {new Date(area.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Atualizado em</h4>
                                        <p className="text-sm">
                                            {new Date(area.updated_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Máquinas</CardTitle>
                                <CardDescription>
                                    Lista de máquinas associadas a esta área
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {area.machines.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tag</TableHead>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead className="w-[100px]">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {area.machines.map((machine) => (
                                                <TableRow key={machine.id}>
                                                    <TableCell>{machine.tag}</TableCell>
                                                    <TableCell>{machine.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {machine.machine_type.name}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={route('cadastro.maquinas.edit', machine.id)}>
                                                                <span className="sr-only">Editar máquina</span>
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="h-4 w-4"
                                                                >
                                                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                                </svg>
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        Nenhuma máquina associada a esta área.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 