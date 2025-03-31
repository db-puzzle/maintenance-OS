import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
];

interface Area {
    id: number;
    name: string;
    description: string | null;
    plant_id: number | null;
    plant: {
        id: number;
        name: string;
    } | null;
    equipment_count: number;
    sectors_count: number;
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
        sectors: {
            total: number;
            items: { id: number; name: string; }[];
        };
    };
}

interface Props {
    areas: {
        data: Area[];
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

export default function Areas({ areas, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [dependencies, setDependencies] = useState<Dependencies | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
                route('cadastro.areas'),
                { 
                    search,
                    sort: filters.sort,
                    direction: filters.direction,
                    page: areas.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, filters.sort, filters.direction]);

    const handleDelete = (area: Area) => {
        setIsDeleting(true);
        router.delete(route('cadastro.areas.destroy', area.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedArea(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedArea(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
                toast.error("Erro ao excluir área", {
                    description: errors.message || 'Não foi possível excluir a área.',
                });
            },
        });
    };

    const checkDependencies = async (area: Area) => {
        setIsCheckingDependencies(true);
        setSelectedArea(area);
        
        try {
            const response = await fetch(route('cadastro.areas.check-dependencies', area.id));
            const data = await response.json();
            setDependencies(data);
            
            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências da área.",
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.areas'),
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
            <Head title="Áreas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Áreas" 
                            description="Gerencie as áreas do sistema" 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Buscar por nome da área ou planta..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button asChild>
                            <Link href={route('cadastro.areas.create')}>
                                Nova Área
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
                                            className="h-8 p-0 font-bold hover:bg-transparent w-full text-center"
                                            onClick={() => handleSort('sectors_count')}
                                        >
                                            Setores
                                            <span className="ml-2">{getSortIcon('sectors_count')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent w-full text-center"
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
                                {areas.data.map((area) => (
                                    <TableRow 
                                        key={area.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.get(route('cadastro.areas.show', area.id))}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{area.name}</div>
                                                {area.description && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {area.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{area.plant?.name || '-'}</TableCell>
                                        <TableCell className="text-center">{area.sectors_count}</TableCell>
                                        <TableCell className="text-center">{area.equipment_count}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.areas.edit', area.id)}>
                                                        <span className="sr-only">Editar área</span>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => checkDependencies(area)}
                                                    disabled={isCheckingDependencies}
                                                >
                                                    <span className="sr-only">Excluir área</span>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                                        href={route('cadastro.areas', { 
                                            page: areas.current_page - 1,
                                            search,
                                            sort: filters.sort,
                                            direction: filters.direction
                                        })}
                                        className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {(() => {
                                    const pages = [];
                                    const totalPages = areas.last_page;
                                    const currentPage = areas.current_page;

                                    // Adiciona as 3 primeiras páginas
                                    for (let i = 1; i <= Math.min(3, totalPages); i++) {
                                        pages.push(
                                            <PaginationItem key={i}>
                                                <PaginationLink 
                                                    href={route('cadastro.areas', { 
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
                                                            href={route('cadastro.areas', { 
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
                                                        href={route('cadastro.areas', { 
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
                                        href={route('cadastro.areas', { 
                                            page: areas.current_page + 1,
                                            search,
                                            sort: filters.sort,
                                            direction: filters.direction
                                        })}
                                        className={areas.current_page === areas.last_page ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </CadastroLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir esta área</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Esta área possui equipamento(s) e/ou setor(es) vinculado(s) e não pode ser excluída até que todos sejam removidos ou movidos para outra área.
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

                                {dependencies?.dependencies?.sectors?.total && dependencies.dependencies.sectors.total > 0 && (
                                    <div>
                                        <div className="font-medium text-sm">
                                            Total de Setores Vinculados: {dependencies.dependencies.sectors.total}
                                        </div>
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.dependencies.sectors.items.map(sector => (
                                                <li key={sector.id}>
                                                    <Link
                                                        href={route('cadastro.setores.show', sector.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {sector.name}
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
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir a área {selectedArea?.name}? Esta ação não pode ser desfeita.
                    </DialogDescription>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
                            <Input
                                id="confirmation"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            onClick={() => selectedArea && handleDelete(selectedArea)}
                            disabled={!isConfirmationValid || isDeleting}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 