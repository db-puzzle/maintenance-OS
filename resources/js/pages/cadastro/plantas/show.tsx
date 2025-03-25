import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building2, Map, Cog, Factory, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import MapComponent from '@/components/map';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';

interface Plant {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
}

interface Area {
    id: number;
    name: string;
    plant_id: number;
}

interface Props {
    plant: Plant;
    areas: {
        data: Area[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    sectors: {
        data: {
            id: number;
            name: string;
            description: string | null;
            equipment_count: number;
            area: {
                id: number;
                name: string;
            };
        }[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    equipment: {
        data: {
            id: number;
            tag: string;
            equipment_type: {
                id: number;
                name: string;
            } | null;
            manufacturer: string | null;
            manufacturing_year: number | null;
            area_name: string;
            sector_name: string | null;
        }[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    totalSectors: number;
    totalEquipment: number;
    activeTab: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Plantas',
        href: '/cadastro/plantas',
    },
    {
        title: 'Detalhes da Planta',
        href: '#',
    },
];

export default function ShowPlant({ plant, areas, sectors, equipment, totalSectors, totalEquipment, activeTab }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Planta ${plant.name}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">{plant.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Map className="h-4 w-4" />
                                        <span>{areas.total} áreas</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <Building2 className="h-4 w-4" />
                                        <span>{totalSectors} setores</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                        <Cog className="h-4 w-4" />
                                        <span>{totalEquipment} equipamentos</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('cadastro.plantas')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={route('cadastro.plantas.edit', plant.id)}>
                                        Editar
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue={activeTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="informacoes" asChild>
                                <Link href={route('cadastro.plantas.show', { plant: plant.id, tab: 'informacoes' })}>Informações Gerais</Link>
                            </TabsTrigger>
                            <TabsTrigger value="mapa" asChild>
                                <Link href={route('cadastro.plantas.show', { plant: plant.id, tab: 'mapa' })}>Mapa</Link>
                            </TabsTrigger>
                            <TabsTrigger value="areas" asChild>
                                <Link href={route('cadastro.plantas.show', { plant: plant.id, tab: 'areas' })}>Áreas</Link>
                            </TabsTrigger>
                            <TabsTrigger value="setores" asChild>
                                <Link href={route('cadastro.plantas.show', { plant: plant.id, tab: 'setores' })}>Setores</Link>
                            </TabsTrigger>
                            <TabsTrigger value="equipamentos" asChild>
                                <Link href={route('cadastro.plantas.show', { plant: plant.id, tab: 'equipamentos' })}>Equipamentos</Link>
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="informacoes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Gerais</CardTitle>
                                    <CardDescription>Informações básicas sobre a planta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="name">Nome</Label>
                                            <div className="text-sm text-muted-foreground">{plant.name}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="address">Endereço</Label>
                                            <div className="text-sm text-muted-foreground">
                                                {plant.street}, {plant.number}
                                            </div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="city">Cidade</Label>
                                            <div className="text-sm text-muted-foreground">{plant.city}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="state">Estado</Label>
                                            <div className="text-sm text-muted-foreground">{plant.state}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="zip_code">CEP</Label>
                                            <div className="text-sm text-muted-foreground">{plant.zip_code}</div>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <Label htmlFor="gps_coordinates">Coordenadas GPS</Label>
                                            <div className="text-sm text-muted-foreground">{plant.gps_coordinates}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="mapa">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Localização</CardTitle>
                                    <CardDescription>Mapa com a localização da planta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <MapComponent coordinates={plant.gps_coordinates} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="areas">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Áreas</CardTitle>
                                    <CardDescription>Lista de áreas vinculadas a esta planta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {areas.data.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nome</TableHead>
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
                                                            <TableCell>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    asChild
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Link href={route('cadastro.areas.edit', area.id)}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-6 text-center">
                                            Nenhuma área cadastrada nesta planta.
                                        </div>
                                    )}
                                    <div className="flex justify-center mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious 
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
                                                            areas_page: areas.current_page - 1,
                                                            tab: 'areas'
                                                        })}
                                                        className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                                
                                                {Array.from({ length: areas.last_page }, (_, i) => i + 1).map((page) => (
                                                    <PaginationItem key={`areas-pagination-${page}`}>
                                                        <PaginationLink 
                                                            href={route('cadastro.plantas.show', { 
                                                                plant: plant.id,
                                                                areas_page: page,
                                                                tab: 'areas'
                                                            })}
                                                            isActive={page === areas.current_page}
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}

                                                <PaginationItem>
                                                    <PaginationNext 
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
                                                            areas_page: areas.current_page + 1,
                                                            tab: 'areas'
                                                        })}
                                                        className={areas.current_page === areas.last_page ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="setores">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Setores</CardTitle>
                                    <CardDescription>Lista de setores vinculados a esta planta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {sectors.data.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nome</TableHead>
                                                        <TableHead>Área</TableHead>
                                                        <TableHead className="text-center">Equipamentos</TableHead>
                                                        <TableHead className="w-[100px]">Ações</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sectors.data.map((sector) => (
                                                        <TableRow 
                                                            key={sector.id}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                            onClick={() => router.get(route('cadastro.setores.show', sector.id))}
                                                        >
                                                            <TableCell>
                                                                <div className="font-medium">{sector.name}</div>
                                                                {sector.description && (
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {sector.description}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{sector.area.name}</TableCell>
                                                            <TableCell className="text-center">
                                                                {sector.equipment_count}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    asChild
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Link href={route('cadastro.setores.edit', sector.id)}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-6 text-center">
                                            Nenhum setor cadastrado nesta planta.
                                        </div>
                                    )}
                                    <div className="flex justify-center mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious 
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
                                                            sectors_page: sectors.current_page - 1,
                                                            tab: 'setores'
                                                        })}
                                                        className={sectors.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                                
                                                {Array.from({ length: sectors.last_page }, (_, i) => i + 1).map((page) => (
                                                    <PaginationItem key={`sectors-pagination-${page}`}>
                                                        <PaginationLink 
                                                            href={route('cadastro.plantas.show', { 
                                                                plant: plant.id,
                                                                sectors_page: page,
                                                                tab: 'setores'
                                                            })}
                                                            isActive={page === sectors.current_page}
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}

                                                <PaginationItem>
                                                    <PaginationNext 
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
                                                            sectors_page: sectors.current_page + 1,
                                                            tab: 'setores'
                                                        })}
                                                        className={sectors.current_page === sectors.last_page ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="equipamentos">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Equipamentos</CardTitle>
                                    <CardDescription>Lista de equipamentos vinculados a esta planta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {equipment.data.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>TAG</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Localização</TableHead>
                                                        <TableHead>Fabricante</TableHead>
                                                        <TableHead>Ano</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {equipment.data.map((item) => (
                                                        <TableRow 
                                                            key={item.id}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                            onClick={() => router.get(route('cadastro.equipamentos.show', item.id))}
                                                        >
                                                            <TableCell>
                                                                <div className="font-medium">{item.tag}</div>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {item.equipment_type?.name ?? '-'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {item.area_name}
                                                                {item.sector_name && ` / ${item.sector_name}`}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {item.manufacturer ?? '-'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {item.manufacturing_year ?? '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-6 text-center">
                                            Nenhum equipamento cadastrado nesta planta.
                                        </div>
                                    )}
                                    <div className="flex justify-center mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious 
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
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
                                                                    href={route('cadastro.plantas.show', { 
                                                                        plant: plant.id,
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
                                                        href={route('cadastro.plantas.show', { 
                                                            plant: plant.id,
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