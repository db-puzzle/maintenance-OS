import { type BreadcrumbItem, type Equipment } from '@/types';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
];

interface Props {
    equipment: {
        data: Equipment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
    };
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

export default function Equipamentos({ equipment, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const page = usePage<PageProps>();
    const flash = page.props.flash;
    const { delete: destroy } = useForm();

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('cadastro.equipamentos'),
                { 
                    search,
                    sort: filters.sort,
                    direction: filters.direction,
                    page: equipment.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, filters.sort, filters.direction]);

    const handleDelete = (id: number) => {
        setIsDeleting(true);
        destroy(route('cadastro.equipamentos.destroy', id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedEquipment(null);
                setConfirmationText('');
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedEquipment(null);
                setConfirmationText('');
                toast.error("Erro ao excluir equipamento", {
                    description: errors.message || 'Não foi possível excluir o equipamento.',
                });
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.equipamentos'),
            { 
                search,
                sort: column,
                direction,
                page: 1
            },
            { preserveState: true }
        );
    };

    const getSortIcon = (column: string) => {
        if (filters.sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters.direction === 'asc' ? 
            <ArrowUp className="h-4 w-4" /> : 
            <ArrowDown className="h-4 w-4" />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Máquinas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Equipamentos" 
                            description="Gerencie os equipamentos do sistema" 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Buscar por TAG, fabricante ou planta..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button asChild>
                            <Link href={route('cadastro.equipamentos.create')}>
                                Novo Equipamento
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-md w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('tag')}
                                        >
                                            TAG
                                            <span className="ml-2">{getSortIcon('tag')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('plant')}
                                        >
                                            Planta
                                            <span className="ml-2">{getSortIcon('plant')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('area')}
                                        >
                                            Área
                                            <span className="ml-2">{getSortIcon('area')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('sector')}
                                        >
                                            Setor
                                            <span className="ml-2">{getSortIcon('sector')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('equipment_type')}
                                        >
                                            Tipo
                                            <span className="ml-2">{getSortIcon('equipment_type')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('manufacturer')}
                                        >
                                            Fabricante
                                            <span className="ml-2">{getSortIcon('manufacturer')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('manufacturing_year')}
                                        >
                                            Ano
                                            <span className="ml-2">{getSortIcon('manufacturing_year')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {equipment.data.map((machine) => (
                                    <TableRow 
                                        key={machine.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.get(route('cadastro.equipamentos.show', machine.id))}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{machine.tag}</div>
                                                {machine.description && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {machine.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{machine.plant?.name ?? machine.area?.plant?.name ?? machine.sector?.area?.plant?.name ?? '-'}</TableCell>
                                        <TableCell>{machine.area?.name ?? machine.sector?.area?.name ?? '-'}</TableCell>
                                        <TableCell>{machine.sector?.name ?? '-'}</TableCell>
                                        <TableCell>{machine.equipment_type?.name ?? '-'}</TableCell>
                                        <TableCell>{machine.manufacturer ?? '-'}</TableCell>
                                        <TableCell>{machine.manufacturing_year ?? '-'}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.equipamentos.edit', machine.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setSelectedEquipment(machine)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>Você tem certeza que deseja excluir este equipamento?</DialogTitle>
                                                        <DialogDescription>
                                                            Uma vez que o equipamento for excluído, todos os seus recursos e dados serão permanentemente excluídos. 
                                                            Esta ação não pode ser desfeita.
                                                        </DialogDescription>
                                                        <div className="grid gap-2 py-4">
                                                            <Label htmlFor="confirmation" className="sr-only">
                                                                Confirmação
                                                            </Label>
                                                            <Input
                                                                id="confirmation"
                                                                type="text"
                                                                value={confirmationText}
                                                                onChange={(e) => setConfirmationText(e.target.value)}
                                                                placeholder="Digite EXCLUIR para confirmar"
                                                                autoComplete="off"
                                                            />
                                                        </div>
                                                        <DialogFooter className="gap-2">
                                                            <DialogClose asChild>
                                                                <Button 
                                                                    variant="secondary"
                                                                    onClick={() => setConfirmationText('')}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </DialogClose>
                                                            <Button 
                                                                variant="destructive" 
                                                                disabled={isDeleting || !isConfirmationValid}
                                                                onClick={() => selectedEquipment && handleDelete(selectedEquipment.id)}
                                                            >
                                                                {isDeleting ? 'Excluindo...' : 'Excluir equipamento'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {equipment.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-24 text-center"
                                        >
                                            Nenhuma máquina encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-center">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious 
                                        href={route('cadastro.equipamentos', { 
                                            page: equipment.current_page - 1,
                                            search,
                                            sort: filters.sort,
                                            direction: filters.direction
                                        })}
                                        className={equipment.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {(() => {
                                    const pages = [];
                                    const totalPages = equipment.last_page;
                                    const currentPage = equipment.current_page;

                                    // Adiciona as 3 primeiras páginas
                                    for (let i = 1; i <= Math.min(3, totalPages); i++) {
                                        pages.push(
                                            <PaginationItem key={i}>
                                                <PaginationLink 
                                                    href={route('cadastro.equipamentos', { 
                                                        page: i,
                                                        search,
                                                        sort: filters.sort,
                                                        direction: filters.direction
                                                    })}
                                                    isActive={i === currentPage}
                                                >
                                                    {i}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    }

                                    // Adiciona reticências e páginas ao redor da página atual
                                    if (totalPages > 5) {
                                        if (currentPage > 4) {
                                            pages.push(
                                                <PaginationItem key="ellipsis-start">
                                                    <span className="px-2">...</span>
                                                </PaginationItem>
                                            );
                                        }

                                        // Adiciona a página atual e duas páginas antes e depois
                                        for (let i = Math.max(4, currentPage - 2); i <= Math.min(totalPages - 2, currentPage + 2); i++) {
                                            if (i > 3 && i < totalPages - 1) {
                                                pages.push(
                                                    <PaginationItem key={i}>
                                                        <PaginationLink 
                                                            href={route('cadastro.equipamentos', { 
                                                                page: i,
                                                                search,
                                                                sort: filters.sort,
                                                                direction: filters.direction
                                                            })}
                                                            isActive={i === currentPage}
                                                        >
                                                            {i}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }
                                        }

                                        if (currentPage < totalPages - 3) {
                                            pages.push(
                                                <PaginationItem key="ellipsis-end">
                                                    <span className="px-2">...</span>
                                                </PaginationItem>
                                            );
                                        }
                                    }

                                    // Adiciona as 2 últimas páginas
                                    for (let i = Math.max(totalPages - 1, 4); i <= totalPages; i++) {
                                        if (i > 3) {
                                            pages.push(
                                                <PaginationItem key={i}>
                                                    <PaginationLink 
                                                        href={route('cadastro.equipamentos', { 
                                                            page: i,
                                                            search,
                                                            sort: filters.sort,
                                                            direction: filters.direction
                                                        })}
                                                        isActive={i === currentPage}
                                                    >
                                                        {i}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        }
                                    }

                                    return pages;
                                })()}

                                <PaginationItem>
                                    <PaginationNext 
                                        href={route('cadastro.equipamentos', { 
                                            page: equipment.current_page + 1,
                                            search,
                                            sort: filters.sort,
                                            direction: filters.direction
                                        })}
                                        className={equipment.current_page === equipment.last_page ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 