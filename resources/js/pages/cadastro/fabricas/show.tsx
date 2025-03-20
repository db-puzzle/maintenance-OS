import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Map from '@/components/map';

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

interface Factory {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
    created_at: string;
    updated_at: string;
}

interface Area {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    factory: Factory;
    areas: {
        data: Area[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Fábricas',
        href: '/cadastro/fabricas',
    },
    {
        title: 'Detalhes',
        href: '#',
    },
];

export default function ShowFactory({ factory, areas }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Fábrica - ${factory.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title={factory.name}
                            description="Detalhes da fábrica e suas áreas"
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" asChild>
                                <Link href={route('cadastro.fabricas')}>
                                    Voltar
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={route('cadastro.fabricas.edit', factory.id)}>
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
                                    Detalhes básicos da fábrica
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Nome</h4>
                                        <p className="text-sm">{factory.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
                                        <p className="text-sm">
                                            {factory.street}, {factory.number}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Cidade</h4>
                                        <p className="text-sm">{factory.city}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Estado</h4>
                                        <p className="text-sm">{factory.state}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">CEP</h4>
                                        <p className="text-sm">{factory.zip_code}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Coordenadas GPS</h4>
                                        <p className="text-sm">{factory.gps_coordinates}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Criado em</h4>
                                        <p className="text-sm">
                                            {new Date(factory.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Atualizado em</h4>
                                        <p className="text-sm">
                                            {new Date(factory.updated_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Localização</CardTitle>
                                <CardDescription>
                                    Mapa com a localização da fábrica
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Map coordinates={factory.gps_coordinates} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Áreas</CardTitle>
                                <CardDescription>
                                    Lista de áreas associadas a esta fábrica
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {areas.data.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead className="w-[100px]">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {areas.data.map((area) => (
                                                <TableRow 
                                                    key={area.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.get(route('cadastro.areas.show', area.id))}
                                                >
                                                    <TableCell>{area.name}</TableCell>
                                                    <TableCell>{area.description}</TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={route('cadastro.areas.edit', area.id)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        Nenhuma área associada a esta fábrica.
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