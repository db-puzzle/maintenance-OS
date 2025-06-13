import { ColumnVisibility, DataTable, type Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowUpDown, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import CreateSectorSheet from '@/components/CreateSectorSheet';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manutenção',
        href: '/maintenance-dashboard',
    },
    {
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
    {
        title: 'Setores',
        href: '/asset-hierarchy/setores',
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
    plants: Plant[];
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

interface Plant {
    id: number;
    name: string;
    areas?: Area[];
}

interface Area {
    id: number;
    name: string;
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
    asset_count: number;
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
    };
}

export default function SectorIndex({ sectors, filters, plants }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 8);
    const [sort, setSort] = useState(filters.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters.direction || 'asc');
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [sectorToEdit, setSectorToEdit] = useState<Sector | null>(null);
    const [loadingSectorData, setLoadingSectorData] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('sectorsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            plant: true,
            area: true,
            asset_count: true,
        };
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [dependencies, setDependencies] = useState<Dependencies | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const page = usePage<PageProps>();
    const flash = page.props.flash;

    useEffect(() => {
        if (flash?.success) {
            toast.success('Operação realizada com sucesso!', {
                description: flash.success,
            });
        }
    }, [flash]);

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('asset-hierarchy.setores'),
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
        localStorage.setItem('sectorsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const handleEditClick = async (sector: Sector) => {
        setLoadingSectorData(true);
        try {
            // Fetch fresh sector data from the server
            const response = await axios.get(route('asset-hierarchy.setores.show', sector.id), {
                params: { format: 'json' },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Set the fresh data
            const sectorData = response.data.sector;
            if (sectorData) {
                setSectorToEdit(sectorData);
                setIsEditSheetOpen(true);
            } else {
                throw new Error('No sector data received');
            }
        } catch (error) {
            console.error('Error loading sector data:', error);
            toast.error('Erro ao carregar dados do setor', {
                description: 'Por favor, tente novamente.'
            });
        } finally {
            setLoadingSectorData(false);
        }
    };

    const columns: Column<Sector>[] = [
        {
            id: 'name',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Sector }) => {
                return (
                    <div>
                        <div className="font-medium">{row.original.name}</div>
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
            cell: (row: { original: Sector }) => row.original.area?.plant?.name || '-',
            width: 'w-[200px]',
        },
        {
            id: 'area',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('area')}>
                    Área
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Sector }) => row.original.area?.name || '-',
            width: 'w-[200px]',
        },
        {
            id: 'asset_count',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('asset_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Sector }) => row.original.asset_count ?? 0,
            width: 'w-[100px]',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: (row: { original: Sector }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-muted-foreground data-[state=open]:bg-muted flex size-8" size="icon">
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                            onClick={() => handleEditClick(row.original)}
                            disabled={loadingSectorData}
                        >
                            {loadingSectorData ? 'Carregando...' : 'Editar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => checkDependencies(row.original)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: 'w-[80px]',
        },
    ];

    const handleDelete = async (id: number) => {
        setIsDeleting(true);

        router.delete(route('asset-hierarchy.setores.destroy', id), {
            onSuccess: (response) => {
                setIsDeleting(false);
                setShowDeleteDialog(false);
                setConfirmationText('');
            },
            onError: (errors) => {
                toast.error('Erro ao excluir setor', {
                    description: errors.message || 'Ocorreu um erro ao excluir o setor.',
                });
                setIsDeleting(false);
                setShowDeleteDialog(false);
                setConfirmationText('');
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const checkDependencies = async (sector: Sector) => {
        setIsCheckingDependencies(true);
        setSelectedSector(sector);

        try {
            const response = await fetch(route('asset-hierarchy.setores.check-dependencies', sector.id));
            const data = await response.json();
            setDependencies(data);

            if (data.can_delete) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error('Erro ao verificar dependências', {
                description: 'Não foi possível verificar as dependências do setor.',
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
                onCreateClick={() => setIsCreateSheetOpen(true)}
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
                    data={sectors.data}
                    columns={columns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onRowClick={(row) => router.get(route('asset-hierarchy.setores.show', row.id))}
                    emptyMessage="Nenhum setor encontrado."
                />

                <PaginationWrapper
                    currentPage={sectors.current_page}
                    lastPage={sectors.last_page}
                    total={sectors.total}
                    routeName="asset-hierarchy.setores"
                    search={search}
                    sort={sort}
                    direction={direction}
                    perPage={perPage}
                />
            </ListLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir este setor</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Este setor possui ativo(s) vinculado(s) e não pode ser excluído até que todos sejam removidos ou movidos para outro
                                setor.
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
                        Tem certeza que deseja excluir o setor {selectedSector?.name}? Esta ação não pode ser desfeita.
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
                            onClick={() => selectedSector && handleDelete(selectedSector.id)}
                            disabled={!isConfirmationValid || isDeleting}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CreateSectorSheet for creating new sectors */}
            <CreateSectorSheet
                isOpen={isCreateSheetOpen}
                onOpenChange={setIsCreateSheetOpen}
                plants={plants}
                onSuccess={() => {
                    setIsCreateSheetOpen(false);
                    router.reload();
                }}
            />

            {/* CreateSectorSheet for editing sectors */}
            {sectorToEdit && (
                <CreateSectorSheet
                    isOpen={isEditSheetOpen}
                    onOpenChange={(open) => {
                        setIsEditSheetOpen(open);
                        if (!open) {
                            setSectorToEdit(null);
                        }
                    }}
                    plants={plants}
                    sector={{
                        id: sectorToEdit.id,
                        name: sectorToEdit.name,
                        area_id: sectorToEdit.area.id,
                    }}
                    onSuccess={() => {
                        setIsEditSheetOpen(false);
                        setSectorToEdit(null);
                        router.reload();
                    }}
                />
            )}
        </AppLayout>
    );
}
