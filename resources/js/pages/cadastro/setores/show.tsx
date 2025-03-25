import { type BreadcrumbItem, type Equipment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, MapPin, Cog, Map, Factory } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Setores',
        href: '/cadastro/setores',
    },
    {
        title: 'Detalhes do Setor',
        href: '#',
    },
];

interface Sector {
    id: number;
    name: string;
    description: string | null;
    area: {
        id: number;
        name: string;
        plant: {
            id: number;
            name: string;
        };
    };
    equipment: Equipment[];
}

interface Props {
    sector: {
        id: number;
        name: string;
        description: string | null;
        area: {
            id: number;
            name: string;
            plant: {
                id: number;
                name: string;
            };
        };
    };
    equipment: {
        data: Equipment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab: string;
}

export default function Show({ sector, equipment, activeTab }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Setor ${sector.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">{sector.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Factory className="h-4 w-4" />
                                        <span>{sector.area.plant.name}</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <Map className="h-4 w-4" />
                                        <span>{sector.area.name}</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <Cog className="h-4 w-4" />
                                        <span>{equipment.total} equipamentos</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('cadastro.setores')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={route('cadastro.setores.edit', sector.id)}>
                                        Editar
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue={activeTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="informacoes" asChild>
                                <Link href={route('cadastro.setores.show', { setor: sector.id, tab: 'informacoes' })}>Informações Gerais</Link>
                            </TabsTrigger>
                            <TabsTrigger value="equipamentos" asChild>
                                <Link href={route('cadastro.setores.show', { setor: sector.id, tab: 'equipamentos' })}>Equipamentos</Link>
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="informacoes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Gerais</CardTitle>
                                    <CardDescription>Informações básicas sobre o setor</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid w-full items-center gap-4">
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="name">Nome</Label>
                                            <div className="text-sm text-muted-foreground">{sector.name}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="description">Descrição</Label>
                                            <div className="text-sm text-muted-foreground">{sector.description ?? '-'}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="area">Área</Label>
                                            <div className="text-sm text-muted-foreground">{sector.area.name}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="plant">Planta</Label>
                                            <div className="text-sm text-muted-foreground">{sector.area.plant.name}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="equipamentos">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Equipamentos</CardTitle>
                                    <CardDescription>Lista de equipamentos vinculados a este setor</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {equipment.data.length > 0 ? (
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
                                                    {equipment.data.map((equipment) => (
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
                                            Nenhum equipamento cadastrado neste setor.
                                        </div>
                                    )}
                                    <div className="flex justify-center mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious 
                                                        href={route('cadastro.setores.show', { 
                                                            setor: sector.id,
                                                            equipment_page: equipment.current_page - 1,
                                                            tab: 'equipamentos'
                                                        })}
                                                        className={equipment.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                                
                                                {equipment.data.length > 0 && (() => {
                                                    const totalPages = Math.ceil(equipment.total / equipment.per_page);
                                                    return Array.from({ length: totalPages }, (_, i) => i + 1)
                                                        .map((page) => (
                                                            <PaginationItem key={`equipment-pagination-${page}`}>
                                                                <PaginationLink 
                                                                    href={route('cadastro.setores.show', { 
                                                                        setor: sector.id,
                                                                        equipment_page: page,
                                                                        tab: 'equipamentos'
                                                                    })}
                                                                    isActive={page === equipment.current_page}
                                                                >
                                                                    {page}
                                                                </PaginationLink>
                                                            </PaginationItem>
                                                        ));
                                                })()}

                                                <PaginationItem>
                                                    <PaginationNext 
                                                        href={route('cadastro.setores.show', { 
                                                            setor: sector.id,
                                                            equipment_page: equipment.current_page + 1,
                                                            tab: 'equipamentos'
                                                        })}
                                                        className={!equipment.data.length || equipment.current_page >= Math.ceil(equipment.total / equipment.per_page) ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 