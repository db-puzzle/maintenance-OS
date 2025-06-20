import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftTableView from '@/components/ShiftTableView';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig, PaginationMeta } from '@/types/shared';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ArrowUpDown, Calendar, ChevronDownIcon, ChevronUpIcon, Clock, List, MoreVertical, Plus, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Break {
    start_time: string;
    end_time: string;
}

interface Shift {
    start_time: string;
    end_time: string;
    active: boolean;
    breaks: Break[];
}

interface Schedule {
    weekday: string;
    shifts: Shift[];
}

interface ShiftData {
    id: number;
    name: string;
    plant_count?: number;
    area_count?: number;
    sector_count?: number;
    asset_count?: number;
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface AssetData extends Record<string, unknown> {
    id: number;
    tag: string;
    description: string;
    asset_type: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
    current_runtime_hours: number;
}

interface PageProps {
    flash?: {
        success?: string;
    };
    [key: string]: unknown;
}

interface Props {
    shifts:
    | ShiftData[]
    | {
        data: ShiftData[];
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
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
    {
        title: 'Turnos',
        href: '/asset-hierarchy/shifts',
    },
];

// Component to display assets list in the expanded view
const AssetsList = ({ shiftId, assetCount }: { shiftId: number; assetCount: number }) => {
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);

    const loadAssets = useCallback(async (page: number = 1, itemsPerPage: number = 10) => {
        setLoading(true);
        try {
            const response = await axios.get(route('asset-hierarchy.shifts.assets', shiftId), {
                params: {
                    page,
                    per_page: itemsPerPage,
                },
            });
            setAssets(response.data.assets || []);
            // Create pagination meta from response
            setPagination({
                current_page: response.data.current_page || page,
                last_page: response.data.last_page || 1,
                per_page: response.data.per_page || itemsPerPage,
                total: response.data.total || 0,
                from: response.data.from || null,
                to: response.data.to || null,
            });
        } catch (error) {
            console.error('Error loading assets:', error);
            toast.error('Erro ao carregar ativos');
        } finally {
            setLoading(false);
        }
    }, [shiftId]);

    useEffect(() => {
        if (assetCount > 0) {
            loadAssets(currentPage, perPage);
        }
    }, [assetCount, currentPage, perPage, loadAssets]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePerPageChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    const columns: ColumnConfig[] = [
        {
            key: 'tag',
            label: 'Tag',
            sortable: false,
            width: 'w-[150px]',
            render: (value, row) => (
                <Link href={route('asset-hierarchy.assets.show', (row as AssetData).id)} className="text-primary hover:underline">
                    {(row as AssetData).tag}
                </Link>
            ),
        },
        {
            key: 'description',
            label: 'Descrição',
            sortable: false,
            width: 'w-[250px]',
            render: (value) => (value as string) || '-',
        },
        {
            key: 'asset_type',
            label: 'Tipo',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => (value as string) || '-',
        },
        {
            key: 'location',
            label: 'Localização',
            sortable: false,
            width: 'w-[250px]',
            render: (value, row) => {
                const asset = row as AssetData;
                return [asset.plant, asset.area, asset.sector].filter(Boolean).join(' > ') || '-';
            },
        },
        {
            key: 'current_runtime_hours',
            label: 'Horímetro',
            sortable: false,
            width: 'w-[120px]',
            render: (value) => {
                const numValue = typeof value === 'number' ? value : parseFloat(value as string);
                return isNaN(numValue) ? '0.0h' : `${numValue.toFixed(1)}h`;
            },
        },
    ];

    return (
        <div className="space-y-4">
            {assetCount === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Nenhum ativo associado a este turno.</p>
                </div>
            ) : (
                <>
                    <EntityDataTable
                        data={assets}
                        columns={columns}
                        loading={loading}
                        onRowClick={(asset) => router.visit(route('asset-hierarchy.assets.show', (asset as AssetData).id))}
                        emptyMessage="Nenhum ativo encontrado."
                    />
                    {pagination && pagination.last_page > 1 && (
                        <EntityPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                            perPageOptions={[10, 20, 30, 50]}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default function Index({
    shifts,
    filters = {
        search: '',
        sort: 'name',
        direction: 'asc' as const,
        per_page: 8,
    },
}: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const [perPage] = useState(filters?.per_page || 8);
    const [sort, setSort] = useState(filters?.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters?.direction || 'asc');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [associatedAssets, setAssociatedAssets] = useState<AssetData[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [showAssetsDialog, setShowAssetsDialog] = useState(false);

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
                route('asset-hierarchy.shifts'),
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
        const data = Array.isArray(shifts) ? shifts : shifts.data;
        const shift = data.find((shift: ShiftData) => shift.id === id);
        if (!shift) return;

        setSelectedShift(shift);
        setOpenDropdownId(null); // Close dropdown before opening dialog

        // Check if shift has associated assets
        if (shift.asset_count && shift.asset_count > 0) {
            // Fetch the list of associated assets
            setLoadingAssets(true);
            try {
                const response = await axios.get(route('asset-hierarchy.shifts.assets', shift.id));
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
        if (!selectedShift) return;

        setIsDeleting(true);
        router.delete(route('asset-hierarchy.shifts.destroy', selectedShift.id), {
            onSuccess: () => {
                toast.success('Turno excluído com sucesso!');
                setShowDeleteDialog(false);
                setSelectedShift(null);
                setConfirmationText('');
            },
            onError: () => {
                toast.error('Erro ao excluir turno');
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const data = Array.isArray(shifts) ? shifts : shifts.data;

    // Função para transformar os dados do backend para o formato esperado pelos componentes
    const transformSchedules = (schedules: Record<string, unknown>[]): Schedule[] => {
        return schedules.map((schedule) => ({
            weekday: schedule.weekday as string,
            shifts: (schedule.shifts as Record<string, unknown>[])?.map((shift: Record<string, unknown>) => ({
                start_time: shift.start_time as string,
                end_time: shift.end_time as string,
                active: (shift.active as boolean) ?? true, // Mantém o valor existente ou usa true como padrão
                breaks:
                    (shift.breaks as Record<string, unknown>[])?.map((breakTime: Record<string, unknown>) => ({
                        start_time: breakTime.start_time as string,
                        end_time: breakTime.end_time as string,
                    })) || [],
            })) || [
                    {
                        start_time: '07:00',
                        end_time: '17:00',
                        active: true,
                        breaks: [
                            {
                                start_time: '12:00',
                                end_time: '13:00',
                            },
                        ],
                    },
                ], // Valor padrão se não houver turnos
        }));
    };

    const columns = [
        {
            id: 'name',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => row.original.name,
            width: 'w-[200px]',
        },
        {
            id: 'entities',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('plant_count')}>
                    Associações
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => {
                const counts = [];
                if ((row.original.plant_count || 0) > 0) counts.push(`${row.original.plant_count} planta(s)`);
                if ((row.original.area_count || 0) > 0) counts.push(`${row.original.area_count} área(s)`);
                if ((row.original.sector_count || 0) > 0) counts.push(`${row.original.sector_count} setor(es)`);
                if ((row.original.asset_count || 0) > 0) counts.push(`${row.original.asset_count} ativo(s)`);
                return counts.length > 0 ? counts.join(', ') : 'Nenhuma associação';
            },
            width: 'w-[300px]',
        },
        {
            id: 'work_hours',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('total_work_hours')}>
                    Horas de Trabalho
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => {
                const hours = row.original.total_work_hours || 0;
                const minutes = row.original.total_work_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
            width: 'w-[150px]',
        },
        {
            id: 'break_hours',
            header: (
                <div className="flex cursor-pointer items-center gap-2" onClick={() => handleSort('total_break_hours')}>
                    Horas de Intervalo
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => {
                const hours = row.original.total_break_hours || 0;
                const minutes = row.original.total_break_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
            width: 'w-[150px]',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: (row: { original: ShiftData }) => (
                <DropdownMenu open={openDropdownId === row.original.id} onOpenChange={(open) => setOpenDropdownId(open ? row.original.id : null)}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-muted-foreground data-[state=open]:bg-muted ignore-row-click flex size-8" size="icon">
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="ignore-row-click w-32">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(expanded === row.original.id ? null : row.original.id);
                                setOpenDropdownId(null);
                            }}
                        >
                            Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={route('asset-hierarchy.shifts.edit', row.original.id)} onClick={(e) => e.stopPropagation()}>
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
            <Head title="Turnos" />

            <ListLayout
                title="Turnos"
                description="Gerencie os turnos de trabalho"
                searchPlaceholder="Buscar por nome..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('asset-hierarchy.shifts.shift-editor')}
                createButtonText="Adicionar"
            >
                <div className="space-y-4">
                    {data.length === 0 ? (
                        <Card className="bg-muted/50 rounded-lg border p-6 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
                                    <Clock className="text-muted-foreground size-6" />
                                </div>
                                <h3 className="mb-1 text-lg font-medium">Nenhum turno cadastrado</h3>
                                <p className="text-muted-foreground mb-4 text-sm">
                                    Adicione turnos para começar a gerenciar os horários de trabalho.
                                </p>
                                <Link href={route('asset-hierarchy.shifts.shift-editor')}>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Turno
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[40px] text-center" />
                                        {columns.map((column, index) => (
                                            <TableHead key={column.id} className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}>
                                                {column.header}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((shift) => [
                                        <TableRow
                                            key={shift.id}
                                            className={`${expanded === shift.id ? 'bg-muted/50 hover:bg-background' : 'hover:bg-muted/30'} cursor-pointer transition-colors`}
                                            onClick={(e) => {
                                                // Evita conflito com ações (dropdown e links)
                                                if ((e.target as HTMLElement).closest('.ignore-row-click, a, button')) return;
                                                setExpanded(expanded === shift.id ? null : shift.id);
                                            }}
                                        >
                                            <TableCell className="w-[40px] text-center align-middle">
                                                {expanded === shift.id ? (
                                                    <ChevronUpIcon className="mx-auto h-4 w-4" />
                                                ) : (
                                                    <ChevronDownIcon className="mx-auto h-4 w-4" />
                                                )}
                                            </TableCell>
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.id}
                                                    className={column.width + (column.id === 'actions' ? ' ignore-row-click' : '')}
                                                >
                                                    {column.cell({ original: shift })}
                                                </TableCell>
                                            ))}
                                        </TableRow>,
                                        expanded === shift.id && (
                                            <TableRow key={`expanded-${shift.id}`} className="hover:bg-transparent">
                                                <TableCell colSpan={columns.length + 1} className="bg-muted/50 border-border/40 border-t p-0">
                                                    <Tabs defaultValue="calendar" className="w-full p-4">
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <TabsList className="grid w-[400px] grid-cols-3">
                                                                <TabsTrigger value="calendar" className="flex items-center gap-2">
                                                                    <Calendar className="h-4 w-4" />
                                                                    Calendário
                                                                </TabsTrigger>
                                                                <TabsTrigger value="table" className="flex items-center gap-2">
                                                                    <List className="h-4 w-4" />
                                                                    Tabela
                                                                </TabsTrigger>
                                                                <TabsTrigger value="asset" className="flex items-center gap-2">
                                                                    <Settings className="h-4 w-4" />
                                                                    Ativos
                                                                </TabsTrigger>
                                                            </TabsList>
                                                        </div>
                                                        <TabsContent value="calendar">
                                                            <ShiftCalendarView
                                                                schedules={transformSchedules(shift.schedules as unknown as Record<string, unknown>[])}
                                                                showAllDays={true}
                                                            />
                                                        </TabsContent>
                                                        <TabsContent value="table">
                                                            <ShiftTableView
                                                                schedules={transformSchedules(shift.schedules as unknown as Record<string, unknown>[])}
                                                            />
                                                        </TabsContent>
                                                        <TabsContent value="asset">
                                                            <AssetsList shiftId={shift.id} assetCount={shift.asset_count || 0} />
                                                        </TabsContent>
                                                    </Tabs>
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    ])}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {!Array.isArray(shifts) && (
                        <PaginationWrapper
                            currentPage={shifts.current_page}
                            lastPage={shifts.last_page}
                            total={shifts.total}
                            routeName="asset-hierarchy.shifts"
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
                        setSelectedShift(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir o turno {selectedShift?.name}? Esta ação não pode ser desfeita.
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
                        setSelectedShift(null);
                        setAssociatedAssets([]);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Turno com ativos associados
                    </DialogTitle>
                    <DialogDescription>
                        O turno <strong>{selectedShift?.name}</strong> não pode ser excluído porque está associado aos seguintes ativos:
                    </DialogDescription>

                    {loadingAssets ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-muted-foreground">Carregando ativos...</div>
                        </div>
                    ) : associatedAssets.length > 5 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-background sticky top-0 z-10 border-b">
                                    <TableRow>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead className="text-right">Horímetro</TableHead>
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
                                                <TableCell>{asset.asset_type || '-'}</TableCell>
                                                <TableCell>{[asset.plant, asset.area, asset.sector].filter(Boolean).join(' > ') || '-'}</TableCell>
                                                <TableCell className="text-right">{asset.current_runtime_hours.toFixed(1)}h</TableCell>
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
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead className="text-right">Horímetro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {associatedAssets.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">
                                                <Link href={route('asset-hierarchy.assets.show', asset.id)} className="text-primary hover:underline">
                                                    {asset.tag}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.description || '-'}</TableCell>
                                            <TableCell>{asset.asset_type || '-'}</TableCell>
                                            <TableCell>{[asset.plant, asset.area, asset.sector].filter(Boolean).join(' > ') || '-'}</TableCell>
                                            <TableCell className="text-right">{asset.current_runtime_hours.toFixed(1)}h</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="rounded-md bg-yellow-50 p-4">
                        <p className="text-sm text-yellow-800">
                            Para excluir este turno, primeiro você deve desassociar ou reatribuir os ativos listados acima para outro turno.
                        </p>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Fechar</Button>
                        </DialogClose>
                        <Button asChild>
                            <Link href={route('asset-hierarchy.shifts.edit', selectedShift?.id || 0)}>Editar Turno</Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
