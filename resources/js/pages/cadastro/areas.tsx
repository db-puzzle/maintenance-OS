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
    factory_id: number | null;
    parent_area_id: number | null;
    factory?: {
        id: number;
        name: string;
    } | null;
    parent_area?: {
        id: number;
        name: string;
        factory?: {
            id: number;
            name: string;
        } | null;
    } | null;
    closest_factory?: {
        id: number;
        name: string;
    } | null;
    created_at: string;
    updated_at: string;
}

interface Machine {
    id: number;
    tag: string;
    name: string;
}

interface Dependencies {
    can_delete: boolean;
    dependencies: {
        machines: {
            total: number;
            items: Machine[];
        };
        areas: {
            total: number;
            items: Area[];
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
                    page: areas.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search]);

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
                page: areas.current_page
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
                                placeholder="Buscar áreas..."
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

                    <div className="rounded-md border w-full">
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
                                            onClick={() => handleSort('factory')}
                                        >
                                            Fábrica
                                            <span className="ml-2">{getSortIcon('factory')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('parent_area')}
                                        >
                                            Área Pai
                                            <span className="ml-2">{getSortIcon('parent_area')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areas.data.map((area) => (
                                    <TableRow key={area.id}>
                                        <TableCell>{area.name}</TableCell>
                                        <TableCell>{area.closest_factory?.name || '-'}</TableCell>
                                        <TableCell>
                                            {area.parent_area_id && area.parent_area ? area.parent_area.name : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.areas.edit', area.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => checkDependencies(area)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
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
                                        href={route('cadastro.areas', { 
                                            page: areas.current_page - 1,
                                            search: search 
                                        })}
                                        className={areas.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: areas.last_page }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink 
                                            href={route('cadastro.areas', { 
                                                page,
                                                search: search
                                            })}
                                            isActive={page === areas.current_page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext 
                                        href={route('cadastro.areas', { 
                                            page: areas.current_page + 1,
                                            search: search 
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
                                Esta área possui itens vinculados e não pode ser excluída até que todas as dependências 
                                sejam removidas ou movidas para outra área.
                            </div>
                            
                            <div className="space-y-6">
                                {dependencies && dependencies.dependencies.machines.total > 0 && (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="font-medium text-sm">
                                                Total de Máquinas Vinculadas: {dependencies.dependencies.machines.total}
                                            </div>
                                            <div className="text-sm text-muted-foreground italic">
                                                Clique no código da máquina para detalhes
                                            </div>
                                        </div>

                                        {dependencies.dependencies.machines.items && dependencies.dependencies.machines.items.length > 0 && (
                                            <div className="space-y-3">
                                                <ul className="list-disc list-inside space-y-2 text-sm">
                                                    {dependencies.dependencies.machines.items.map(machine => (
                                                        <li key={machine.id}>
                                                            <Link
                                                                href={route('cadastro.maquinas.show', machine.id)}
                                                                className="text-primary hover:underline inline-flex items-center gap-1"
                                                            >
                                                                {machine.tag}
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {dependencies && dependencies.dependencies.areas.total > 0 && (
                                    <div className="space-y-3">
                                        <div className="font-medium text-sm">
                                            Total de Subáreas: {dependencies.dependencies.areas.total}
                                        </div>

                                        {dependencies.dependencies.areas.items && dependencies.dependencies.areas.items.length > 0 && (
                                            <div className="space-y-3">
                                                <ul className="list-disc list-inside space-y-2 text-sm">
                                                    {dependencies.dependencies.areas.items.map(area => (
                                                        <li key={area.id}>{area.name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
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
                    <DialogTitle>Você tem certeza que deseja excluir esta área?</DialogTitle>
                    <DialogDescription>
                        Uma vez que a área for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
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
                            onClick={() => selectedArea && handleDelete(selectedArea)}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir área'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 