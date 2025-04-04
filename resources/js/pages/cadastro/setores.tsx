import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";

import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/cadastro/list-layout';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
    },
    {
        title: 'Setores',
        href: '/cadastro/setores',
    },
];

interface Props {
    sectors: {
        data: Sector[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

interface Sector {
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
    equipment_count: number;
    created_at: string;
    updated_at: string;
}

interface Equipment {
    id: number;
    tag: string;
    description: string | null;
}

interface Dependencies {
    can_delete: boolean;
    dependencies: {
        equipment: {
            total: number;
            items: Equipment[];
        };
    };
}

export default function SectorIndex({ sectors, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [dependencies, setDependencies] = useState<Dependencies | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const page = usePage<PageProps>();
    const flash = page.props.flash;

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
                route('cadastro.setores'),
                { 
                    search,
                    sort: filters.sort,
                    direction: filters.direction,
                    page: sectors.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, filters.sort, filters.direction]);

    const handleDelete = async (id: number) => {
        setIsDeleting(true);
        
        router.delete(route('cadastro.setores.destroy', id), {
            onSuccess: (response) => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
                setConfirmationText('');
            },
            onError: (errors) => {
                toast.error("Erro ao excluir setor", {
                    description: errors.message || "Ocorreu um erro ao excluir o setor.",
                });
                setIsDeleting(false);
                setShowDeleteDialog(false);
                setConfirmationText('');
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.setores'),
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

    const checkDependencies = async (sector: Sector) => {
        setIsCheckingDependencies(true);
        setSelectedSector(sector);
        
        try {
            const response = await fetch(route('cadastro.setores.check-dependencies', sector.id));
            const data = await response.json();
            setDependencies(data);
            
            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências do setor.",
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Setores" />

            <ListLayout
                title="Setores"
                description="Gerencie os setores do sistema"
                searchPlaceholder="Buscar por nome, descrição ou planta..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('cadastro.setores.create')}
                createButtonText="Novo Setor"
            >
                <div className="rounded-md w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('name')}
                                    >
                                        Nome
                                        <span className="ml-2">{getSortIcon('name')}</span>
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
                                        onClick={() => handleSort('equipment_count')}
                                    >
                                        Equipamentos
                                        <span className="ml-2">{getSortIcon('equipment_count')}</span>
                                    </Button>
                                </TableHead>
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
                                        <div>
                                            <div className="font-medium">{sector.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{sector.area?.plant?.name}</TableCell>
                                    <TableCell>{sector.area?.name}</TableCell>
                                    <TableCell className="text-center">{sector.equipment_count ?? 0}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
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
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            checkDependencies(sector);
                                                        }}
                                                        disabled={isCheckingDependencies}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {sectors.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center"
                                    >
                                        Nenhum setor encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-center">
                    <PaginationWrapper
                        currentPage={sectors.current_page}
                        lastPage={sectors.last_page}
                        routeName="cadastro.setores"
                        search={search}
                        sort={filters.sort}
                        direction={filters.direction}
                        perPage={filters.per_page}
                    />
                </div>
            </ListLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir este setor</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Este setor possui equipamento(s) vinculado(s) e não pode ser excluído até que todos sejam removidos ou movidos para outro setor.
                            </div>
                            
                            <div className="space-y-6">
                                {dependencies?.dependencies?.equipment?.total && dependencies.dependencies.equipment.total > 0 && (
                                    <div>
                                        <div className="font-medium text-sm">
                                            Total de Equipamentos Vinculados: {dependencies.dependencies.equipment.total}
                                        </div>
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.dependencies.equipment.items.map(equipment => (
                                                <li key={equipment.id}>
                                                    <Link
                                                        href={route('cadastro.equipamentos.show', equipment.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {equipment.tag}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogDescription>
                    <DialogFooter>
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowDependenciesDialog(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogTitle>Você tem certeza que deseja excluir este setor?</DialogTitle>
                    <DialogDescription>
                        Uma vez que o setor for excluído, todos os seus recursos e dados serão permanentemente excluídos. 
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
                        <Button 
                            variant="secondary"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setConfirmationText('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            disabled={isDeleting || !isConfirmationValid}
                            onClick={() => selectedSector && handleDelete(selectedSector.id)}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir setor'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 