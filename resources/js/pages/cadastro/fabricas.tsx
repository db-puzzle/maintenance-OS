import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
        title: 'Fábricas',
        href: '/cadastro/fabricas',
    },
];

interface Factory {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    factories: {
        data: Factory[];
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

export default function Fabricas({ factories, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [dependencies, setDependencies] = useState<{
        can_delete: boolean;
        dependencies: {
            areas: {
                total: number;
                items: { id: number; name: string; }[];
            };
        };
    } | null>(null);
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
                route('cadastro.fabricas'),
                { 
                    search,
                    page: factories.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search]);

    const handleDelete = (factory: Factory) => {
        setIsDeleting(true);
        router.delete(route('cadastro.fabricas.destroy', factory.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedFactory(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedFactory(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
                toast.error("Erro ao excluir fábrica", {
                    description: errors.message || 'Não foi possível excluir a fábrica.',
                });
            },
        });
    };

    const checkDependencies = async (factory: Factory) => {
        setIsCheckingDependencies(true);
        setSelectedFactory(factory);
        
        try {
            const response = await fetch(route('cadastro.fabricas.check-dependencies', factory.id));
            const data = await response.json();
            setDependencies(data);
            
            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências da fábrica.",
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.fabricas'),
            { 
                search,
                sort: column,
                direction,
                page: factories.current_page
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
            <Head title="Fábricas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Fábricas" 
                            description="Gerencie as fábricas do sistema" 
                        />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Buscar fábricas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button asChild>
                            <Link href={route('cadastro.fabricas.create')}>
                                Nova Fábrica
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
                                            onClick={() => handleSort('street')}
                                        >
                                            Endereço
                                            <span className="ml-2">{getSortIcon('street')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('city')}
                                        >
                                            Cidade
                                            <span className="ml-2">{getSortIcon('city')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('state')}
                                        >
                                            Estado
                                            <span className="ml-2">{getSortIcon('state')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('zip_code')}
                                        >
                                            CEP
                                            <span className="ml-2">{getSortIcon('zip_code')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button 
                                            variant="ghost" 
                                            className="h-8 p-0 font-bold hover:bg-transparent"
                                            onClick={() => handleSort('gps_coordinates')}
                                        >
                                            Coordenadas GPS
                                            <span className="ml-2">{getSortIcon('gps_coordinates')}</span>
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {factories.data.map((factory) => (
                                    <TableRow key={factory.id}>
                                        <TableCell>{factory.name}</TableCell>
                                        <TableCell>
                                            {factory.street}, {factory.number}
                                        </TableCell>
                                        <TableCell>{factory.city}</TableCell>
                                        <TableCell>{factory.state}</TableCell>
                                        <TableCell>{factory.zip_code}</TableCell>
                                        <TableCell>{factory.gps_coordinates}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.fabricas.edit', factory.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => checkDependencies(factory)}
                                                    disabled={isCheckingDependencies}
                                                >
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
                                        href={route('cadastro.fabricas', { 
                                            page: factories.current_page - 1,
                                            search: search 
                                        })}
                                        className={factories.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: factories.last_page }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink 
                                            href={route('cadastro.fabricas', { 
                                                page,
                                                search: search
                                            })}
                                            isActive={page === factories.current_page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext 
                                        href={route('cadastro.fabricas', { 
                                            page: factories.current_page + 1,
                                            search: search
                                        })}
                                        className={factories.current_page === factories.last_page ? 'pointer-events-none opacity-50' : ''}
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
                    <DialogTitle>Não é possível excluir esta fábrica</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Esta fábrica possui área(s) vinculada(s) e não pode ser excluída até que todas as áreas 
                                sejam removidas ou movidas para outra fábrica.
                            </div>
                            
                            <div className="space-y-6">
                                <div className="font-medium text-sm">
                                    Total de Áreas Vinculadas: {dependencies?.dependencies.areas.total}
                                </div>

                                {dependencies?.dependencies.areas.items && dependencies.dependencies.areas.items.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="font-medium text-sm">Algumas das áreas vinculadas:</div>
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.dependencies.areas.items.map(area => (
                                                <li key={area.id}>{area.name}</li>
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
                    <DialogTitle>Você tem certeza que deseja excluir esta fábrica?</DialogTitle>
                    <DialogDescription>
                        Uma vez que a fábrica for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
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
                            onClick={() => selectedFactory && handleDelete(selectedFactory)}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir fábrica'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 