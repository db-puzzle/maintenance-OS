import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowUpDown, Building2, MoreVertical, Plus, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import CreateManufacturerSheet from '@/components/CreateManufacturerSheet';

interface AssetData {
    id: number;
    tag: string;
    description: string;
    serial_number: string | null;
    part_number: string | null;
    asset_type: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
}

interface ManufacturerData {
    id: number;
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    notes?: string | null;
    assets_count?: number;
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

interface Props {
    manufacturers:
    | ManufacturerData[]
    | {
        data: ManufacturerData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters?: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
}

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
        title: 'Fabricantes',
        href: '/asset-hierarchy/manufacturers',
    },
];

export default function Index({
    manufacturers,
    filters = {
        search: '',
        sort: 'name',
        direction: 'asc' as const,
        per_page: 8,
    },
}: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const [perPage, setPerPage] = useState(filters?.per_page || 8);
    const [sort, setSort] = useState(filters?.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters?.direction || 'asc');
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerData | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [associatedAssets, setAssociatedAssets] = useState<AssetData[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [showAssetsDialog, setShowAssetsDialog] = useState(false);

    const page = usePage<PageProps>();
    const flash = page.props.flash;

    const { post, processing, errors } = useForm();

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
                route('asset-hierarchy.manufacturers'),
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

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const handleDelete = async (id: number) => {
        const data = Array.isArray(manufacturers) ? manufacturers : manufacturers.data;
        const manufacturer = data.find((m: ManufacturerData) => m.id === id);
        if (!manufacturer) return;

        setSelectedManufacturer(manufacturer);
        setOpenDropdownId(null); // Close dropdown before opening dialog

        // Check if manufacturer has associated assets
        if (manufacturer.assets_count && manufacturer.assets_count > 0) {
            // Fetch the list of associated assets
            setLoadingAssets(true);
            try {
                const response = await axios.get(route('asset-hierarchy.manufacturers.assets', manufacturer.id));
                setAssociatedAssets(response.data.assets || []);
                setShowAssetsDialog(true);
            } catch (error) {
                console.error('Error fetching associated assets:', error);
                toast.error('Erro ao buscar ativos associados');
            } finally {
                setLoadingAssets(false);
            }
        } else {
            // No assets associated, show regular delete dialog
            setShowDeleteDialog(true);
        }
    };

    const confirmDelete = () => {
        if (!selectedManufacturer) return;

        setIsDeleting(true);
        router.delete(route('asset-hierarchy.manufacturers.destroy', selectedManufacturer.id), {
            onSuccess: () => {
                toast.success('Fabricante excluído com sucesso!');
                setShowDeleteDialog(false);
                setSelectedManufacturer(null);
                setConfirmationText('');
            },
            onError: () => {
                toast.error('Erro ao excluir fabricante');
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const data = Array.isArray(manufacturers) ? manufacturers : manufacturers.data;

    const columns = [
        {
            id: 'name',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ManufacturerData }) => row.original.name,
            width: 'w-[200px]',
        },
        {
            id: 'country',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('country')}>
                    País
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ManufacturerData }) => row.original.country || '-',
            width: 'w-[150px]',
        },
        {
            id: 'contact',
            header: 'Contato',
            cell: (row: { original: ManufacturerData }) => {
                const contacts = [];
                if (row.original.email) contacts.push(row.original.email);
                if (row.original.phone) contacts.push(row.original.phone);
                return contacts.length > 0 ? contacts.join(' | ') : '-';
            },
            width: 'w-[300px]',
        },
        {
            id: 'assets_count',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('assets_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ManufacturerData }) => {
                const count = row.original.assets_count || 0;
                return count > 0 ? `${count} ativo(s)` : 'Nenhum ativo';
            },
            width: 'w-[150px]',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: (row: { original: ManufacturerData }) => (
                <DropdownMenu
                    open={openDropdownId === row.original.id}
                    onOpenChange={(open) => setOpenDropdownId(open ? row.original.id : null)}
                >
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-muted-foreground data-[state=open]:bg-muted ignore-row-click flex size-8" size="icon">
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="ignore-row-click w-32">
                        <DropdownMenuItem asChild>
                            <Link href={route('asset-hierarchy.manufacturers.show', row.original.id)} onClick={(e) => e.stopPropagation()}>
                                Visualizar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={route('asset-hierarchy.manufacturers.edit', row.original.id)} onClick={(e) => e.stopPropagation()}>
                                Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.original.id);
                            }}
                        >
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: 'w-[80px]',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fabricantes" />

            <ListLayout
                title="Fabricantes"
                description="Gerencie os fabricantes de ativos"
                searchPlaceholder="Buscar por nome, email ou país..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute=""
                createButtonText=""
                actions={
                    <CreateManufacturerSheet
                        showTrigger
                        triggerText="Adicionar"
                        triggerVariant="default"
                    />
                }
            >
                <div className="space-y-4">
                    {data.length === 0 ? (
                        <Card className="bg-muted/50 rounded-lg border p-6 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
                                    <Building2 className="text-muted-foreground size-6" />
                                </div>
                                <h3 className="mb-1 text-lg font-medium">Nenhum fabricante cadastrado</h3>
                                <p className="text-muted-foreground mb-4 text-sm">
                                    Adicione fabricantes para associar aos ativos.
                                </p>
                                <CreateManufacturerSheet
                                    showTrigger
                                    triggerText="Adicionar Fabricante"
                                    triggerVariant="default"
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10">
                                    <TableRow>
                                        {columns.map((column, index) => (
                                            <TableHead key={column.id} className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}>
                                                {column.header}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((manufacturer) => (
                                        <TableRow
                                            key={manufacturer.id}
                                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={(e) => {
                                                // Evita conflito com ações (dropdown e links)
                                                if ((e.target as HTMLElement).closest('.ignore-row-click, a, button')) return;
                                                router.visit(route('asset-hierarchy.manufacturers.show', manufacturer.id));
                                            }}
                                        >
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.id}
                                                    className={column.width + (column.id === 'actions' ? ' ignore-row-click' : '')}
                                                >
                                                    {column.cell({ original: manufacturer })}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {!Array.isArray(manufacturers) && (
                        <PaginationWrapper
                            currentPage={manufacturers.current_page}
                            lastPage={manufacturers.last_page}
                            total={manufacturers.total}
                            routeName="asset-hierarchy.manufacturers"
                            search={search}
                            sort={sort}
                            direction={direction}
                            perPage={perPage}
                        />
                    )}
                </div>
            </ListLayout>

            {/* Diálogo de Confirmação de Exclusão */}
            <Dialog
                open={showDeleteDialog}
                onOpenChange={(open) => {
                    setShowDeleteDialog(open);
                    if (!open) {
                        setConfirmationText('');
                        setSelectedManufacturer(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir o fabricante {selectedManufacturer?.name}? Esta ação não pode ser desfeita.
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
                        <Button variant="destructive" onClick={confirmDelete} disabled={!isConfirmationValid || isDeleting}>
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo de Ativos Associados */}
            <Dialog
                open={showAssetsDialog}
                onOpenChange={(open) => {
                    setShowAssetsDialog(open);
                    if (!open) {
                        setSelectedManufacturer(null);
                        setAssociatedAssets([]);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Fabricante com ativos associados
                    </DialogTitle>
                    <DialogDescription>
                        O fabricante <strong>{selectedManufacturer?.name}</strong> não pode ser excluído porque está associado aos seguintes ativos:
                    </DialogDescription>

                    {loadingAssets ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-muted-foreground">Carregando ativos...</div>
                        </div>
                    ) : associatedAssets.length > 5 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                                    <TableRow>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Número Serial</TableHead>
                                        <TableHead>Part Number</TableHead>
                                        <TableHead>Localização</TableHead>
                                    </TableRow>
                                </TableHeader>
                            </Table>
                            <ScrollArea className="h-[205px]">
                                <Table>
                                    <TableBody>
                                        {associatedAssets.map((asset) => (
                                            <TableRow key={asset.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={route('asset-hierarchy.assets.show', asset.id)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {asset.tag}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{asset.description || '-'}</TableCell>
                                                <TableCell>{asset.serial_number || '-'}</TableCell>
                                                <TableCell>{asset.part_number || '-'}</TableCell>
                                                <TableCell>
                                                    {[asset.plant, asset.area, asset.sector]
                                                        .filter(Boolean)
                                                        .join(' > ') || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Número Serial</TableHead>
                                        <TableHead>Part Number</TableHead>
                                        <TableHead>Localização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {associatedAssets.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={route('asset-hierarchy.assets.show', asset.id)}
                                                    className="text-primary hover:underline"
                                                >
                                                    {asset.tag}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.description || '-'}</TableCell>
                                            <TableCell>{asset.serial_number || '-'}</TableCell>
                                            <TableCell>{asset.part_number || '-'}</TableCell>
                                            <TableCell>
                                                {[asset.plant, asset.area, asset.sector]
                                                    .filter(Boolean)
                                                    .join(' > ') || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="rounded-md bg-yellow-50 p-4">
                        <p className="text-sm text-yellow-800">
                            Para excluir este fabricante, primeiro você deve desassociar ou reatribuir os ativos listados acima para outro fabricante.
                        </p>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Fechar</Button>
                        </DialogClose>
                        <Button asChild>
                            <Link href={route('asset-hierarchy.manufacturers.edit', selectedManufacturer?.id || 0)}>
                                Editar Fabricante
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 