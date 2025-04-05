import { type BreadcrumbItem, type Equipment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Settings, Cog } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import ShowLayout from '@/layouts/cadastro/show-layout';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Equipamento',
        href: '/cadastro/tipos-equipamento',
    },
    {
        title: 'Detalhes do Tipo de Equipamento',
        href: '#',
    },
];

interface Props {
    equipmentType: {
        id: number;
        name: string;
        description: string;
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

export default function Show({ equipmentType, equipment, activeTab }: Props) {
    const subtitle = (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Tipo de Equipamento</span>
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
                        <CardDescription>Informações básicas sobre o tipo de equipamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Nome</Label>
                                <div className="text-sm text-muted-foreground">{equipmentType.name}</div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="description">Descrição</Label>
                                <div className="text-sm text-muted-foreground">{equipmentType.description ?? '-'}</div>
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
                        <CardDescription>Lista de equipamentos deste tipo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {equipment.data.length > 0 ? (
                            <div className="rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12">TAG</TableHead>
                                            <TableHead className="h-12">Área</TableHead>
                                            <TableHead className="h-12">Fabricante</TableHead>
                                            <TableHead className="h-12">Ano</TableHead>
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
                                                    {equipment.area?.name ?? '-'}
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
                                Nenhum equipamento cadastrado deste tipo.
                            </div>
                        )}
                        <div className="flex justify-center mt-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href={route('cadastro.tipos-equipamento.show', { 
                                                equipmentType: equipmentType.id,
                                                equipment_page: equipment.current_page - 1,
                                                tab: 'equipamentos'
                                            })}
                                            className={equipment.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: equipment.last_page }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={`equipment-pagination-${page}`}>
                                            <PaginationLink 
                                                href={route('cadastro.tipos-equipamento.show', { 
                                                    equipmentType: equipmentType.id,
                                                    equipment_page: page,
                                                    tab: 'equipamentos'
                                                })}
                                                isActive={page === equipment.current_page}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext 
                                            href={route('cadastro.tipos-equipamento.show', { 
                                                equipmentType: equipmentType.id,
                                                equipment_page: equipment.current_page + 1,
                                                tab: 'equipamentos'
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
                title={equipmentType.name}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                editRoute={route('cadastro.tipos-equipamento.edit', equipmentType.id)}
                backRoute={route('cadastro.tipos-equipamento')}
                tabs={tabs}
            />
        </AppLayout>
    );
} 