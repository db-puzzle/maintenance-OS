import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Máquina',
        href: '/cadastro/tipos-maquina',
    },
];

interface MachineType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    machineTypes: {
        data: MachineType[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
    };
}

export default function TiposMaquina({ machineTypes, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedMachineType, setSelectedMachineType] = useState<MachineType | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const { flash } = usePage<PageProps>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success("Sucesso!", {
                description: flash.success,
            });
        }
    }, [flash]);

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('cadastro.tipos-maquina'),
                { 
                    search,
                    page: machineTypes.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search]);

    const handleDelete = (machineType: MachineType) => {
        setIsDeleting(true);
        router.delete(route('cadastro.tipos-maquina.destroy', machineType.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedMachineType(null);
                setConfirmationText('');
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedMachineType(null);
                setConfirmationText('');
                toast.error("Erro ao excluir tipo de máquina", {
                    description: errors.message || 'Não foi possível excluir o tipo de máquina.',
                });
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de Máquina" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Tipos de Máquina" 
                            description="Gerencie os tipos de máquina do sistema" 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Buscar tipos de máquina..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button asChild>
                            <Link href={route('cadastro.tipos-maquina.create')}>
                                Novo Tipo de Máquina
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-md border w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="w-[400px]">Descrição</TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {machineTypes.data.map((machineType) => (
                                    <TableRow key={machineType.id}>
                                        <TableCell>{machineType.name}</TableCell>
                                        <TableCell>{machineType.description || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.tipos-maquina.edit', machineType.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setSelectedMachineType(machineType)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>Confirmar Exclusão</DialogTitle>
                                                        <DialogDescription>
                                                            Você tem certeza que deseja excluir o tipo de máquina "{machineType.name}"? 
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
                                                                onClick={() => selectedMachineType && handleDelete(selectedMachineType)}
                                                            >
                                                                {isDeleting ? 'Excluindo...' : 'Excluir tipo de máquina'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
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
                                        href={route('cadastro.tipos-maquina', { 
                                            page: machineTypes.current_page - 1,
                                            search: search 
                                        })}
                                        className={machineTypes.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: machineTypes.last_page }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink 
                                            href={route('cadastro.tipos-maquina', { 
                                                page,
                                                search: search
                                            })}
                                            isActive={page === machineTypes.current_page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext 
                                        href={route('cadastro.tipos-maquina', { 
                                            page: machineTypes.current_page + 1,
                                            search: search 
                                        })}
                                        className={machineTypes.current_page === machineTypes.last_page ? 'pointer-events-none opacity-50' : ''}
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