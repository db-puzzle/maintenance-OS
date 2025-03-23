import { type BreadcrumbItem, type Equipment, type Sector } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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

interface Area {
    id: number;
    name: string;
    plant: {
        id: number;
        name: string;
    };
    equipment: Equipment[];
    sectors: Sector[];
    created_at: string;
    updated_at: string;
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
        sectors: Sector[];
    };
}

export default function Show({ area }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Área ${area.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Building2 className="h-4 w-4" />
                                        <span>{area.plant.name}</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        <span>{area.sectors.length} setores</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => router.visit(route('cadastro.areas'), { preserveScroll: true, preserveState: true })}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar
                                </Button>
                                <Button asChild>
                                    <Link href={route('cadastro.areas.edit', area.id)}>
                                        Editar
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="informacoes" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="informacoes">Informações Gerais</TabsTrigger>
                            <TabsTrigger value="setores">Setores</TabsTrigger>
                            <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="informacoes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Gerais</CardTitle>
                                    <CardDescription>Informações básicas sobre a área</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid w-full items-center gap-4">
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="name">Nome</Label>
                                            <div className="text-sm text-muted-foreground">{area.name}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="plant">Planta</Label>
                                            <div className="text-sm text-muted-foreground">{area.plant.name}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="setores">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Setores</CardTitle>
                                    <CardDescription>Lista de setores vinculados a esta área</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {area.sectors.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nome</TableHead>
                                                        <TableHead>Descrição</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {area.sectors.map((sector) => (
                                                        <TableRow 
                                                            key={sector.id}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                            onClick={() => router.get(route('cadastro.setores.show', sector.id))}
                                                        >
                                                            <TableCell>
                                                                <div className="font-medium">{sector.name}</div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {sector.description ?? '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-6 text-center">
                                            Nenhum setor cadastrado nesta área.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="equipamentos">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Equipamentos</CardTitle>
                                    <CardDescription>Lista de equipamentos vinculados a esta área</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {area.equipment.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>TAG</TableHead>
                                                        <TableHead>Tipo</TableHead>
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
                                                                <div className="font-medium">{equipment.tag}</div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {equipment.equipment_type?.name ?? '-'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {equipment.manufacturer ?? '-'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {equipment.manufacturing_year ?? '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-6 text-center">
                                            Nenhum equipamento cadastrado nesta área.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 