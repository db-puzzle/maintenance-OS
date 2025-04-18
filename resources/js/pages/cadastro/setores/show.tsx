import { type BreadcrumbItem, type Equipment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { MapPin, Cog, Map, Factory, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import ShowLayout from '@/layouts/cadastro/show-layout';
import AppLayout from '@/layouts/app-layout';

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

interface Props {
    sector: {
        id: number;
        name: string;
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
    filters: {
        equipment: {
            sort: string;
            direction: string;
        };
    };
}

export default function Show({ sector, equipment, activeTab, filters }: Props) {
    const handleSort = (column: string) => {
        const direction = filters.equipment.sort === column && filters.equipment.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.setores.show', { 
                setor: sector.id,
                tab: activeTab,
                equipment_sort: column,
                equipment_direction: direction,
                equipment_page: 1
            }),
            {},
            { preserveState: true }
        );
    };

    const getSortIcon = (column: string) => {
        if (filters.equipment.sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters.equipment.direction === 'asc' ? 
            <ArrowUp className="h-4 w-4" /> : 
            <ArrowDown className="h-4 w-4" />;
    };

    const subtitle = (
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
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
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
            )
        },
        {
            id: 'equipamentos',
            label: 'Equipamentos',
            content: (
                <Card>
                    <CardHeader>
                        <CardTitle>Equipamentos</CardTitle>
                        <CardDescription>Lista de equipamentos vinculados a este setor</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {equipment.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('tag')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    TAG
                                                    {getSortIcon('tag')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('type')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Tipo
                                                    {getSortIcon('type')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('manufacturer')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Fabricante
                                                    {getSortIcon('manufacturer')}
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer h-12"
                                                onClick={() => handleSort('year')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Ano
                                                    {getSortIcon('year')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {equipment.data.map((equipment) => (
                                            <TableRow 
                                                key={equipment.id}
                                                className="cursor-pointer hover:bg-muted/50 h-12"
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
                                                href={route('cadastro.setores.show', { 
                                                    setor: sector.id,
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
                                            href={route('cadastro.setores.show', { 
                                                setor: sector.id,
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
                title={sector.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('cadastro.setores.edit', sector.id)}
                backRoute={route('cadastro.setores')}
                tabs={tabs}
            />
        </AppLayout>
    );
} 