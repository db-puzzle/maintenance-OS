import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/cadastro/list-layout';
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
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
    },
    {
        title: 'Plantas',
        href: '/cadastro/plantas',
    },
];

interface Plant {
    id: number;
    name: string;
    description: string | null;
    areas_count: number;
    sectors_count: number;
    equipment_count: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    plants: {
        data: Plant[];
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

export default function Plantas({ plants, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [dependencies, setDependencies] = useState<{
        can_delete: boolean;
        dependencies: {
            areas: {
                total: number;
                items: { id: number; name: string; }[];
            };
            equipment: {
                total: number;
                items: { id: number; tag: string; }[];
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
                route('cadastro.plantas'),
                { 
                    search,
                    sort: filters.sort,
                    direction: filters.direction,
                    page: plants.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, filters.sort, filters.direction]);

    const handleDelete = (plant: Plant) => {
        setIsDeleting(true);
        router.delete(route('cadastro.plantas.destroy', plant.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedPlant(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedPlant(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
                toast.error("Erro ao excluir planta", {
                    description: errors.message || 'Não foi possível excluir a planta.',
                });
            },
        });
    };

    const checkDependencies = async (plant: Plant) => {
        setIsCheckingDependencies(true);
        setSelectedPlant(plant);
        
        try {
            const response = await fetch(route('cadastro.plantas.check-dependencies', plant.id));
            const data = await response.json();
            setDependencies(data);
            
            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências da planta.",
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.plantas'),
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
            <Head title="Plantas" />

            <ListLayout
                title="Plantas"
                description="Gerencie as plantas do sistema"
                searchPlaceholder="Buscar por nome..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('cadastro.plantas.create')}
                createButtonText="Nova Planta"
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
                                <TableHead className="text-center">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('areas_count')}
                                    >
                                        Áreas
                                        <span className="ml-2">{getSortIcon('areas_count')}</span>
                                    </Button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('sectors_count')}
                                    >
                                        Setores
                                        <span className="ml-2">{getSortIcon('sectors_count')}</span>
                                    </Button>
                                </TableHead>
                                <TableHead className="text-center">
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
                            {plants.data.map((plant) => (
                                <TableRow 
                                    key={plant.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.visit(route('cadastro.plantas.show', plant.id))}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{plant.name}</div>
                                            {plant.description && (
                                                <div className="text-sm text-muted-foreground">
                                                    {plant.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{plant.areas_count}</TableCell>
                                    <TableCell className="text-center">{plant.sectors_count}</TableCell>
                                    <TableCell className="text-center">{plant.equipment_count}</TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={route('cadastro.plantas.edit', plant.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => checkDependencies(plant)}
                                                        disabled={isCheckingDependencies}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogTitle>Você tem certeza que deseja excluir esta planta?</DialogTitle>
                                                    <DialogDescription>
                                                        Uma vez que a planta for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
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
                                                            onClick={() => selectedPlant && handleDelete(selectedPlant)}
                                                        >
                                                            {isDeleting ? 'Excluindo...' : 'Excluir planta'}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {plants.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center"
                                    >
                                        Nenhuma planta encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-center">
                    <PaginationWrapper
                        currentPage={plants.current_page}
                        lastPage={plants.last_page}
                        routeName="cadastro.plantas"
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
                    <DialogTitle>Não é possível excluir esta planta</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Esta planta possui área(s) e/ou equipamento(s) vinculado(s) e não pode ser excluída até que todas as áreas 
                                e equipamentos sejam removidos ou movidos para outra planta.
                            </div>
                            
                            <div className="space-y-6">
                                {/* Equipamentos Vinculados */}
                                <div className="space-y-3">
                                    <div className="font-medium text-sm">
                                        Total de Equipamentos Vinculados: {dependencies?.dependencies?.equipment?.total || 0}
                                    </div>

                                    {dependencies?.dependencies?.equipment?.items && dependencies.dependencies.equipment.items.length > 0 && (
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
                                    )}
                                </div>

                                {/* Áreas Vinculadas */}
                                <div className="space-y-3">
                                    <div className="font-medium text-sm">
                                        Total de Áreas Vinculadas: {dependencies?.dependencies?.areas?.total || 0}
                                    </div>

                                    {dependencies?.dependencies?.areas?.items && dependencies.dependencies.areas.items.length > 0 && (
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.dependencies.areas.items.map(area => (
                                                <li key={area.id}>
                                                    <Link
                                                        href={route('cadastro.areas.show', area.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {area.name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
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
        </AppLayout>
    );
} 