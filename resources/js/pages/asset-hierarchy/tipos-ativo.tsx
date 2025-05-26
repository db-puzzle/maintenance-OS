import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { DataTable, ColumnVisibility, type Column } from '@/components/data-table';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { Button } from '@/components/ui/button';
import { MoreVertical, ArrowUpDown, ExternalLink } from 'lucide-react';
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
            toast.success("Sucesso!", {
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

    const columns: Column<AssetType>[] = [
        {
            id: "name",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => {
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
            id: "description",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('description')}>
                    Descrição
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => row.original.description || '-',
            width: "w-[300px]",
        },
        {
            id: "asset_count",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('asset_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: AssetType }) => row.original.asset_count,
            width: "w-[100px]",
        },
        {
            id: "actions",
            header: "Ações",
            cell: (row: { original: AssetType }) => (
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
                            <Link href={route('asset-hierarchy.tipos-ativo.edit', row.original.id)}>
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
                toast.error("Erro ao excluir tipo de ativo", {
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
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências do tipo de ativo.",
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
                createRoute={route('asset-hierarchy.tipos-ativo.create')}
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
                                Este tipo de ativo possui ativos vinculados e não pode ser excluído até que todos 
                                os ativos sejam removidos ou alterados para outro tipo.
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="font-medium text-sm">
                                        Total de Ativos Vinculados: {dependencies?.totalAsset}
                                    </div>
                                    <div className="text-sm text-muted-foreground italic">
                                        Clique no código do ativo para detalhes
                                    </div>
                                </div>

                                {dependencies?.asset && dependencies.asset.length > 0 && (
                                    <div className="space-y-3">
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.asset.map(asset => (
                                                <li key={asset.id}>
                                                    <Link
                                                        href={route('asset-hierarchy.ativos.show', asset.id)}
                                                        className="text-primary hover:underline inline-flex items-center gap-1"
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
        </AppLayout>
    );
} 