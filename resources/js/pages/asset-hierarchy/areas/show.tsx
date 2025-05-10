import { type BreadcrumbItem } from '@/types';
import { type Equipment } from '@/types/asset-hierarchy';
import { router, Head, Link } from '@inertiajs/react';
import { Building2, MapPin, Cog, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
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

interface Sector {
    id: number;
    name: string;
    description: string | null;
    equipment_count: number;
}

interface Props {
    area: {
        id: number;
        name: string;
        plant: {
            id: number;
            name: string;
        };
    };
    sectors: {
        data: Sector[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    equipment: {
        data: Equipment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    totalEquipmentCount: number;
    activeTab: string;
    filters: {
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

export default function Show({ area, sectors, equipment, totalEquipmentCount, activeTab, filters }: Props) {
    const handleSort = (section: 'sectors' | 'equipment', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('asset-hierarchy.areas.show', { 
                area: area.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1
            }),
            {},
            { preserveState: true }
        );
    };

    const getSortIcon = (section: 'sectors' | 'equipment', column: string) => {
        if (filters[section].sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters[section].direction === 'asc' ? 
            <ArrowUp className="h-4 w-4" /> : 
            <ArrowDown className="h-4 w-4" />;
    };

    // Verificações de segurança para evitar erros de undefined
    if (!area || !area.plant) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <ShowLayout
                    title="Carregando..."
                    breadcrumbs={breadcrumbs}
                    editRoute="#"
                    backRoute={route('asset-hierarchy.areas')}
                    tabs={[]}
                >
                    <div>Carregando informações da área...</div>
                </ShowLayout>
            </AppLayout>
        );
    }

    const subtitle = (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{area.plant.name}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{sectors?.total || 0} setores</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{totalEquipmentCount || 0} equipamentos</span>
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
            )
        },
        {
            id: 'setores',
            label: 'Setores',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Setores</CardTitle>
                        <CardDescription>Lista de setores vinculados a esta área</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sectors.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead 
                                                className="w-[30%] cursor-pointer h-12"
                                                onClick={() => handleSort('sectors', 'name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Nome
                                                    {getSortIcon('sectors', 'name')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="w-[15%] text-center cursor-pointer h-12"
                                                onClick={() => handleSort('sectors', 'equipment_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Equipamentos
                                                    {getSortIcon('sectors', 'equipment_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="w-[55%] pl-8 cursor-pointer h-12"
                                                onClick={() => handleSort('sectors', 'description')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Descrição
                                                    {getSortIcon('sectors', 'description')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sectors.data.map((sector) => (
                                            <TableRow 
                                                key={sector.id}
                                                className="cursor-pointer hover:bg-muted/50 h-12"
                                            >
                                                <TableCell>
                                                    <Link
                                                        href={route('asset-hierarchy.setores.show', sector.id)}
                                                        className="font-medium hover:text-primary"
                                                    >
                                                        {sector.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span>{sector.equipment_count}</span>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground pl-8">
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
                        <div className="flex justify-center mt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href={route('asset-hierarchy.areas.show', { 
                                                area: area.id,
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
                                                href={route('asset-hierarchy.areas.show', { 
                                                    area: area.id,
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
                                            href={route('asset-hierarchy.areas.show', { 
                                                area: area.id,
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
                        <CardDescription>Lista de equipamentos vinculados a esta área</CardDescription>
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
                                        {equipment.data.map((equipment) => (
                                            <TableRow 
                                                key={equipment.id}
                                                className="cursor-pointer hover:bg-muted/50 h-12"
                                            >
                                                <TableCell>
                                                    <Link
                                                        href={route('asset-hierarchy.equipamentos.show', equipment.id)}
                                                        className="font-medium hover:text-primary"
                                                    >
                                                        {equipment.tag}
                                                    </Link>
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
                        <div className="flex justify-center mt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href={route('asset-hierarchy.areas.show', { 
                                                area: area.id,
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
                                                href={route('asset-hierarchy.areas.show', { 
                                                    area: area.id,
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
                                            href={route('asset-hierarchy.areas.show', { 
                                                area: area.id,
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
            <Head title={`Área ${area.name}`} />
            <ShowLayout
                title={area.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('asset-hierarchy.areas.edit', area.id)}
                backRoute={route('asset-hierarchy.areas')}
                tabs={tabs}
            />
        </AppLayout>
    );
} 