import { ColumnVisibility, DataTable, type Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowUpDown, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy',
    },
    {
        title: 'Áreas',
        href: '/asset-hierarchy/areas',
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
    asset_count: number;
    sectors_count: number;
    created_at: string;
    updated_at: string;
}

interface Asset {
    id: number;
    tag: string;
    description: string | null;
}

interface Dependencies {
    can_delete: boolean;
    dependencies: {
        asset: {
            total: number;
            items: Asset[];
        };
        sectors: {
            total: number;
            items: { id: number; name: string }[];
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
        per_page: number;
    };
}

export default function Areas({ areas, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 8);
    const [sort, setSort] = useState(filters.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters.direction || 'asc');
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('areasColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            plant: true,
            sectors_count: true,
            asset_count: true,
        };
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [dependencies, setDependencies] = useState<Dependencies | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { flash } = usePage<PageProps>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success('Sucesso!', {
                description: flash.success,
            });
        }
    }, [flash]);

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('asset-hierarchy.areas'),
                {
                    search,
                    sort,
                    direction,
                    per_page: perPage,
                },
                { preserveState: true, preserveScroll: true },
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
        localStorage.setItem('areasColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const columns: Column<Area>[] = [
        {
            id: 'name',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Area }) => {
                return (
                    <div>
                        <div className="font-medium">{row.original.name}</div>
                        {row.original.description && <div className="text-muted-foreground text-sm">{row.original.description}</div>}
                    </div>
                );
            },
            width: 'w-[300px]',
        },
        {
            id: 'plant',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('plant')}>
                    Planta
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Area }) => row.original.plant?.name || '-',
            width: 'w-[200px]',
        },
        {
            id: 'sectors_count',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('sectors_count')}>
                    Setores
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Area }) => row.original.sectors_count,
            width: 'w-[100px]',
        },
        {
            id: 'asset_count',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('asset_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Area }) => row.original.asset_count,
            width: 'w-[100px]',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: (row: { original: Area }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-muted-foreground data-[state=open]:bg-muted flex size-8" size="icon">
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem asChild>
                            <Link href={route('asset-hierarchy.areas.edit', row.original.id)}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => checkDependencies(row.original)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: 'w-[80px]',
        },
    ];

    const handleDelete = (area: Area) => {
        setIsDeleting(true);
        router.delete(route('asset-hierarchy.areas.destroy', area.id), {
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
                toast.error('Erro ao excluir área', {
                    description: errors.message || 'Não foi possível excluir a área.',
                });
            },
        });
    };

    const checkDependencies = async (area: Area) => {
        setIsCheckingDependencies(true);
        setSelectedArea(area);

        try {
            const response = await fetch(route('asset-hierarchy.areas.check-dependencies', area.id));
            const data = await response.json();
            setDependencies(data);

            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error('Erro ao verificar dependências', {
                description: 'Não foi possível verificar as dependências da área.',
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Áreas" />

            <ListLayout
                title="Áreas"
                description="Gerencie as áreas do sistema"
                searchPlaceholder="Buscar por nome da área ou planta..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('asset-hierarchy.areas.create')}
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
                    data={areas.data}
                    columns={columns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onRowClick={(row) => router.get(route('asset-hierarchy.areas.show', row.id))}
                    emptyMessage="Nenhuma área encontrada."
                />

                <PaginationWrapper
                    currentPage={areas.current_page}
                    lastPage={areas.last_page}
                    total={areas.total}
                    routeName="asset-hierarchy.areas"
                    search={search}
                    sort={sort}
                    direction={direction}
                    perPage={perPage}
                />
            </ListLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir esta área</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Esta área possui ativo(s) e/ou setor(es) vinculado(s) e não pode ser excluída até que todos sejam removidos ou movidos
                                para outra área.
                            </div>

                            <div className="space-y-6">
                                {dependencies?.dependencies?.asset?.total && dependencies.dependencies.asset.total > 0 && (
                                    <div>
                                        <div className="text-sm font-medium">Total de Ativos Vinculados: {dependencies.dependencies.asset.total}</div>
                                        <ul className="list-inside list-disc space-y-2 text-sm">
                                            {dependencies.dependencies.asset.items.map((asset) => (
                                                <li key={asset.id}>
                                                    <Link
                                                        href={route('asset-hierarchy.assets.show', asset.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {asset.tag}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {dependencies?.dependencies?.sectors?.total && dependencies.dependencies.sectors.total > 0 && (
                                    <div>
                                        <div className="text-sm font-medium">
                                            Total de Setores Vinculados: {dependencies.dependencies.sectors.total}
                                        </div>
                                        <ul className="list-inside list-disc space-y-2 text-sm">
                                            {dependencies.dependencies.sectors.items.map((sector) => (
                                                <li key={sector.id}>
                                                    <Link
                                                        href={route('asset-hierarchy.setores.show', sector.id)}
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
                        <Button variant="secondary" onClick={() => setShowDependenciesDialog(false)}>
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
                                variant="destructive"
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
