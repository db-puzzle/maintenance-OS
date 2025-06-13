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
import { ArrowUpDown, ExternalLink, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
import axios from 'axios';

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
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/tipos-ativo',
    },
];

interface AssetType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    asset_count: number;
}

interface Asset {
    id: number;
    tag: string;
    description: string | null;
}

interface Dependencies {
    hasDependencies: boolean;
    asset: Asset[];
    totalAsset: number;
}

interface Props {
    assetTypes: {
        data: AssetType[];
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

export default function TiposAtivo({ assetTypes, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 8);
    const [sort, setSort] = useState(filters.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters.direction || 'asc');
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [assetTypeToEdit, setAssetTypeToEdit] = useState<AssetType | null>(null);
    const [loadingAssetTypeData, setLoadingAssetTypeData] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('assetTypesColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            description: true,
            asset_count: true,
        };
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(null);
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
                route('asset-hierarchy.tipos-ativo'),
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
        localStorage.setItem('assetTypesColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const handleEditClick = async (assetType: AssetType) => {
        setLoadingAssetTypeData(true);
        try {
            // Fetch fresh asset type data from the server
            const response = await axios.get(route('asset-hierarchy.tipos-ativo.show', assetType.id), {
                params: { format: 'json' },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Set the fresh data
            const assetTypeData = response.data.assetType;
            if (assetTypeData) {
                setAssetTypeToEdit(assetTypeData);
                setIsEditSheetOpen(true);
            } else {
                throw new Error('No asset type data received');
            }
        } catch (error) {
            console.error('Error loading asset type data:', error);
            toast.error('Erro ao carregar dados do tipo de ativo', {
                description: 'Por favor, tente novamente.'
            });
        } finally {
            setLoadingAssetTypeData(false);
        }
    };

    const columns: Column<AssetType>[] = [
        {
            id: 'name',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => {
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
            id: 'description',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('description')}>
                    Descrição
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => row.original.description || '-',
            width: 'w-[300px]',
        },
        {
            id: 'asset_count',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('asset_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => row.original.asset_count,
            width: 'w-[100px]',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: (row: { original: AssetType }) => (
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
                            disabled={loadingAssetTypeData}
                        >
                            {loadingAssetTypeData ? 'Carregando...' : 'Editar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => checkDependencies(row.original)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: 'w-[80px]',
        },
    ];

    const handleDelete = (assetType: AssetType) => {
        setIsDeleting(true);
        router.delete(route('asset-hierarchy.tipos-ativo.destroy', assetType.id), {
            onSuccess: () => {
                setIsDeleting(false);
                setSelectedAssetType(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedAssetType(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
                toast.error('Erro ao excluir tipo de ativo', {
                    description: errors.message || 'Não foi possível excluir o tipo de ativo.',
                });
            },
        });
    };

    const checkDependencies = async (assetType: AssetType) => {
        setIsCheckingDependencies(true);
        setSelectedAssetType(assetType);

        try {
            const response = await fetch(route('asset-hierarchy.tipos-ativo.check-dependencies', assetType.id));
            const data = await response.json();
            setDependencies(data);

            if (!data.hasDependencies) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error('Erro ao verificar dependências', {
                description: 'Não foi possível verificar as dependências do tipo de ativo.',
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de Ativo" />

            <ListLayout
                title="Tipos de Ativo"
                description="Gerencie os tipos de ativo do sistema"
                searchPlaceholder="Buscar tipos de ativo..."
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
                    data={assetTypes.data}
                    columns={columns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onRowClick={(row) => router.get(route('asset-hierarchy.tipos-ativo.show', row.id))}
                    emptyMessage="Nenhum tipo de ativo encontrado."
                />

                <PaginationWrapper
                    currentPage={assetTypes.current_page}
                    lastPage={assetTypes.last_page}
                    total={assetTypes.total}
                    routeName="asset-hierarchy.tipos-ativo"
                    search={search}
                    sort={sort}
                    direction={direction}
                    perPage={perPage}
                />
            </ListLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir este tipo de ativo</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Este tipo de ativo possui ativos vinculados e não pode ser excluído até que todos os ativos sejam removidos ou
                                alterados para outro tipo.
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Total de Ativos Vinculados: {dependencies?.totalAsset}</div>
                                    <div className="text-muted-foreground text-sm italic">Clique no código do ativo para detalhes</div>
                                </div>

                                {dependencies?.asset && dependencies.asset.length > 0 && (
                                    <div className="space-y-3">
                                        <ul className="list-inside list-disc space-y-2 text-sm">
                                            {dependencies.asset.map((asset) => (
                                                <li key={asset.id}>
                                                    <Link
                                                        href={route('asset-hierarchy.assets.show', asset.id)}
                                                        className="text-primary inline-flex items-center gap-1 hover:underline"
                                                    >
                                                        {asset.tag}
                                                        <ExternalLink className="h-3 w-3" />
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
                        Tem certeza que deseja excluir o tipo de ativo {selectedAssetType?.name}? Esta ação não pode ser desfeita.
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
                            onClick={() => selectedAssetType && handleDelete(selectedAssetType)}
                            disabled={!isConfirmationValid || isDeleting}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CreateAssetTypeSheet for creating new asset types */}
            <CreateAssetTypeSheet
                isOpen={isCreateSheetOpen}
                onOpenChange={setIsCreateSheetOpen}
                onSuccess={() => {
                    setIsCreateSheetOpen(false);
                    router.reload();
                }}
            />

            {/* CreateAssetTypeSheet for editing asset types */}
            {assetTypeToEdit && (
                <CreateAssetTypeSheet
                    isOpen={isEditSheetOpen}
                    onOpenChange={(open) => {
                        setIsEditSheetOpen(open);
                        if (!open) {
                            setAssetTypeToEdit(null);
                        }
                    }}
                    assetType={{
                        id: assetTypeToEdit.id,
                        name: assetTypeToEdit.name,
                        description: assetTypeToEdit.description,
                    }}
                    onSuccess={() => {
                        setIsEditSheetOpen(false);
                        setAssetTypeToEdit(null);
                        router.reload();
                    }}
                />
            )}
        </AppLayout>
    );
}
