import { type BreadcrumbItem, type Machine } from '@/types';
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
        title: 'Máquinas',
        href: '/cadastro/maquinas',
    },
];

interface Props {
    machines: {
        data: Machine[];
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

export default function Maquinas({ machines, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const page = usePage<PageProps>();
    const flash = page.props.flash;
    const { delete: destroy } = useForm();

    useEffect(() => {
        if (flash?.success) {
            toast.success("Operação realizada com sucesso!", {
                description: flash.success,
            });
        }
    }, [flash]);

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('cadastro.maquinas'),
                { 
                    search,
                    page: machines.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search]);

    const handleDelete = (id: number) => {
        setIsDeleting(true);
        destroy(route('cadastro.maquinas.destroy', id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedMachine(null);
                setConfirmationText('');
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedMachine(null);
                setConfirmationText('');
                toast.error("Erro ao excluir máquina", {
                    description: errors.message || 'Não foi possível excluir a máquina.',
                });
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.maquinas'),
            { 
                search,
                sort: column,
                direction,
                page: machines.current_page
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
                            title="Máquinas" 
                            description="Gerencie as máquinas do sistema" 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Busque por TAG, apelido ou fabricante..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button asChild>
                            <Link href={route('cadastro.maquinas.create')}>
                                Nova Máquina
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-md border w-full">
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
                                            onClick={() => handleSort('machine_type')}
                                        >
                                            Tipo
                                            <span className="ml-2">{getSortIcon('machine_type')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('nickname')}
                                        >
                                            Apelido
                                            <span className="ml-2">{getSortIcon('nickname')}</span>
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
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {machines.data.map((machine) => (
                                    <TableRow 
                                        key={machine.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.get(route('cadastro.maquinas.show', machine.id))}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{machine.tag}</div>
                                                {machine.nickname && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {machine.nickname}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{machine.machine_type?.name ?? '-'}</TableCell>
                                        <TableCell>{machine.nickname ?? '-'}</TableCell>
                                        <TableCell>{machine.manufacturer ?? '-'}</TableCell>
                                        <TableCell>{machine.manufacturing_year ?? '-'}</TableCell>
                                        <TableCell>{machine.area?.name ?? '-'}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.maquinas.edit', machine.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setSelectedMachine(machine)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>Você tem certeza que deseja excluir esta máquina?</DialogTitle>
                                                        <DialogDescription>
                                                            Uma vez que a máquina for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
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
                                                                onClick={() => selectedMachine && handleDelete(selectedMachine.id)}
                                                            >
                                                                {isDeleting ? 'Excluindo...' : 'Excluir máquina'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {machines.data.length === 0 && (
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
                                        href={route('cadastro.maquinas', { 
                                            page: machines.current_page - 1,
                                            search: search 
                                        })}
                                        className={machines.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: machines.last_page }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink 
                                            href={route('cadastro.maquinas', { 
                                                page,
                                                search: search
                                            })}
                                            isActive={page === machines.current_page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext 
                                        href={route('cadastro.maquinas', { 
                                            page: machines.current_page + 1,
                                            search: search
                                        })}
                                        className={machines.current_page === machines.last_page ? 'pointer-events-none opacity-50' : ''}
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