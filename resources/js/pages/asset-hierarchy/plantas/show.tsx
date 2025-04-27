import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Map, Cog, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
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
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Plantas',
        href: '/asset-hierarchy/plantas',
    },
    {
        title: 'Detalhes da Planta',
        href: '#',
    },
];

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
    equipment_count: number;
    sectors_count: number;
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
    filters: {
        areas: {
            sort: string;
            direction: string;
        };
        sectors: {
            sort: string;
            direction: string;
        };
        equipment: {
            sort: string;
            direction: string;
        };
    };
}

export default function ShowPlant({ plant, areas, sectors, equipment, totalSectors, totalEquipment, activeTab, filters }: Props) {
    const handleSort = (section: 'areas' | 'sectors' | 'equipment', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('asset-hierarchy.plantas.show', { 
                plant: plant.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1
            }),
            {},
            { preserveState: true }
        );
    };

    const getSortIcon = (section: 'areas' | 'sectors' | 'equipment', column: string) => {
        if (filters[section].sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters[section].direction === 'asc' ? 
            <ArrowUp className="h-4 w-4" /> : 
            <ArrowDown className="h-4 w-4" />;
    };

    const subtitle = (
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
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
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
            )
        },
        {
            id: 'mapa',
            label: 'Mapa',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Localização</CardTitle>
                        <CardDescription>Mapa com a localização da planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MapComponent coordinates={plant.gps_coordinates} />
                    </CardContent>
                </Card>
            )
        },
        {
            id: 'areas',
            label: 'Áreas',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Áreas</CardTitle>
                        <CardDescription>Lista de áreas vinculadas a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {areas.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('areas', 'name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('areas', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer text-center h-12"
                                                onClick={() => handleSort('areas', 'equipment_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Equipamentos
                                                    {getSortIcon('areas', 'equipment_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer text-center h-12"
                                                onClick={() => handleSort('areas', 'sectors_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Setores
                                                    {getSortIcon('areas', 'sectors_count')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {areas.data.map((area) => (
                                            <TableRow 
                                                key={area.id}
                                                className="cursor-pointer hover:bg-muted/50 h-12"
                                                onClick={() => router.get(route('asset-hierarchy.areas.show', area.id))}
                                            >
                                                <TableCell className="font-medium">{area.name}</TableCell>
                                                <TableCell className="text-center">{area.equipment_count}</TableCell>
                                                <TableCell className="text-center">{area.sectors_count}</TableCell>
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
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                areas_page: areas.current_page - 1,
                                                tab: 'areas',
                                                areas_sort: filters.areas.sort,
                                                areas_direction: filters.areas.direction
                                            })}
                                            className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: areas.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`areas-pagination-${page}`}>
                                            <PaginationLink 
                                                href={route('asset-hierarchy.plantas.show', { 
                                                    plant: plant.id,
                                                    areas_page: page,
                                                    tab: 'areas',
                                                    areas_sort: filters.areas.sort,
                                                    areas_direction: filters.areas.direction
                                                })}
                                                isActive={page === areas.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext 
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                areas_page: areas.current_page + 1,
                                                tab: 'areas',
                                                areas_sort: filters.areas.sort,
                                                areas_direction: filters.areas.direction
                                            })}
                                            className={areas.current_page === areas.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            )
        },
        {
            id: 'setores',
            label: 'Setores',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Setores</CardTitle>
                        <CardDescription>Lista de setores vinculados a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sectors.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead 
                                                className="cursor-pointer"
                                                onClick={() => handleSort('sectors', 'name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('sectors', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer"
                                                onClick={() => handleSort('sectors', 'area')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Área
                                                    {getSortIcon('sectors', 'area')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer text-center"
                                                onClick={() => handleSort('sectors', 'equipment_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Equipamentos
                                                    {getSortIcon('sectors', 'equipment_count')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sectors.data.map((sector) => (
                                            <TableRow 
                                                key={sector.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.get(route('asset-hierarchy.setores.show', sector.id))}
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
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                sectors_page: sectors.current_page - 1,
                                                tab: 'setores',
                                                sectors_sort: filters.sectors.sort,
                                                sectors_direction: filters.sectors.direction
                                            })}
                                            className={sectors.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: sectors.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`sectors-pagination-${page}`}>
                                            <PaginationLink 
                                                href={route('asset-hierarchy.plantas.show', { 
                                                    plant: plant.id,
                                                    sectors_page: page,
                                                    tab: 'setores',
                                                    sectors_sort: filters.sectors.sort,
                                                    sectors_direction: filters.sectors.direction
                                                })}
                                                isActive={page === sectors.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext 
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                sectors_page: sectors.current_page + 1,
                                                tab: 'setores',
                                                sectors_sort: filters.sectors.sort,
                                                sectors_direction: filters.sectors.direction
                                            })}
                                            className={sectors.current_page === sectors.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            )
        },
        {
            id: 'equipamentos',
            label: 'Equipamentos',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Equipamentos</CardTitle>
                        <CardDescription>Lista de equipamentos vinculados a esta planta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {equipment.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('equipment', 'tag')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    TAG
                                                    {getSortIcon('equipment', 'tag')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('equipment', 'type')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Tipo
                                                    {getSortIcon('equipment', 'type')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('equipment', 'location')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Localização
                                                    {getSortIcon('equipment', 'location')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('equipment', 'manufacturer')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Fabricante
                                                    {getSortIcon('equipment', 'manufacturer')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('equipment', 'year')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Ano
                                                    {getSortIcon('equipment', 'year')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {equipment.data.map((item) => (
                                            <TableRow 
                                                key={item.id}
                                                className="cursor-pointer hover:bg-muted/50 h-12"
                                                onClick={() => router.get(route('asset-hierarchy.equipamentos.show', item.id))}
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
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                equipment_page: equipment.current_page - 1,
                                                tab: 'equipamentos',
                                                equipment_sort: filters.equipment.sort,
                                                equipment_direction: filters.equipment.direction
                                            })}
                                            className={equipment.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: equipment.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`equipment-pagination-${page}`}>
                                            <PaginationLink 
                                                href={route('asset-hierarchy.plantas.show', { 
                                                    plant: plant.id,
                                                    equipment_page: page,
                                                    tab: 'equipamentos',
                                                    equipment_sort: filters.equipment.sort,
                                                    equipment_direction: filters.equipment.direction
                                                })}
                                                isActive={page === equipment.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext 
                                            href={route('asset-hierarchy.plantas.show', { 
                                                plant: plant.id,
                                                equipment_page: equipment.current_page + 1,
                                                tab: 'equipamentos',
                                                equipment_sort: filters.equipment.sort,
                                                equipment_direction: filters.equipment.direction
                                            })}
                                            className={equipment.current_page === equipment.last_page ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                </Card>
            )
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout
                title={plant.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.plantas.edit', plant.id)}
                backRoute={route('asset-hierarchy.plantas')}
                tabs={tabs}
            />
        </AppLayout>
    );
} 