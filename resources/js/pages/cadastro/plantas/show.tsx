import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Map from '@/components/map';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

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
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Plantas',
        href: '/cadastro/plantas',
    },
    {
        title: 'Detalhes da Planta',
        href: '/cadastro/plantas/show',
    },
];

export default function ShowPlant({ plant, areas }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalhes da Planta" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Detalhes da Planta" 
                            description="Visualize os detalhes da planta e suas áreas" 
                        />
                        <Button variant="outline" size="icon" asChild>
                            <Link href={route('cadastro.plantas.edit', plant.id)}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <h3 className="text-lg font-medium">Informações Gerais</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Nome</p>
                                    <p className="text-sm font-medium">{plant.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Endereço</p>
                                    <p className="text-sm font-medium">
                                        {plant.street}, {plant.number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Cidade</p>
                                    <p className="text-sm font-medium">{plant.city}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <p className="text-sm font-medium">{plant.state}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">CEP</p>
                                    <p className="text-sm font-medium">{plant.zip_code}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Coordenadas GPS</p>
                                    <p className="text-sm font-medium">{plant.gps_coordinates}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <h3 className="text-lg font-medium">Localização</h3>
                            <Map coordinates={plant.gps_coordinates} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Áreas</h3>
                                <Button asChild>
                                    <Link href={route('cadastro.areas.create')}>
                                        Nova Área
                                    </Link>
                                </Button>
                            </div>
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
                                            <TableRow key={area.id}>
                                                <TableCell>{area.name}</TableCell>
                                                <TableCell>
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
                            </div>
                            <div className="flex justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious 
                                                href={route('cadastro.plantas.show', { 
                                                    plant: plant.id,
                                                    page: areas.current_page - 1,
                                                })}
                                                className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        
                                        {Array.from({ length: areas.last_page }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink 
                                                    href={route('cadastro.plantas.show', { 
                                                        plant: plant.id,
                                                        page,
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
                                                    page: areas.current_page + 1,
                                                })}
                                                className={areas.current_page === areas.last_page ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 