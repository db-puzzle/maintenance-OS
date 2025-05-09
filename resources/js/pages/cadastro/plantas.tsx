import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/cadastro/list-layout';
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { DataTable, ColumnVisibility, type Column } from '@/components/data-table';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { Button } from '@/components/ui/button';
import { MoreVertical, ArrowUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@inertiajs/react';

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
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 8);
    const [sort, setSort] = useState(filters.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters.direction || 'asc');
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('plantsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            areas_count: true,
            sectors_count: true,
            equipment_count: true,
        };
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
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
                    sort,
                    direction,
                    per_page: perPage
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, sort, direction, perPage]);

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('plantsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const columns: Column<Plant>[] = [
        {
            id: "name",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Plant }) => {
                return (
                    <div>
                        <div className="font-medium">{row.original.name}</div>
                        {row.original.description && (
                            <div className="text-sm text-muted-foreground">
                                {row.original.description}
                            </div>
                        )}
                    </div>
                );
            },
            width: "w-[300px]",
        },
        {
            id: "areas_count",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('areas_count')}>
                    Áreas
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Plant }) => row.original.areas_count,
            width: "w-[100px]",
        },
        {
            id: "sectors_count",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('sectors_count')}>
                    Setores
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Plant }) => row.original.sectors_count,
            width: "w-[100px]",
        },
        {
            id: "equipment_count",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('equipment_count')}>
                    Equipamentos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Plant }) => row.original.equipment_count,
            width: "w-[100px]",
        },
        {
            id: "actions",
            header: "Ações",
            cell: (row: { original: Plant }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                            size="icon"
                        >
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem asChild>
                            <Link href={route('cadastro.plantas.edit', row.original.id)}>
                                Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => checkDependencies(row.original)}>
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: "w-[80px]",
        },
    ];

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
                createButtonText="Adicionar"
                actions={
                    <div className="flex items-center gap-2">
                        <ColumnVisibility
                            columns={columns}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                        />
                    </div>
                }
            >
                <DataTable
                    data={plants.data}
                    columns={columns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onRowClick={(row) => router.get(route('cadastro.plantas.show', row.id))}
                    emptyMessage="Nenhuma planta encontrada."
                />

                <PaginationWrapper
                    currentPage={plants.current_page}
                    lastPage={plants.last_page}
                    total={plants.total}
                    routeName="cadastro.plantas"
                    search={search}
                    sort={sort}
                    direction={direction}
                    perPage={perPage}
                />
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

            {/* Diálogo de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir a planta {selectedPlant?.name}? Esta ação não pode ser desfeita.
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
                            onClick={() => selectedPlant && handleDelete(selectedPlant)}
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