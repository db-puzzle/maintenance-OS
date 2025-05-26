import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ArrowUpDown, Calendar, List, Settings, Clock, MoreVertical, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { toast } from 'sonner';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftTableView from '@/components/ShiftTableView';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    plant?: {
        id: number;
        name: string;
    };
    asset_count?: number;
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

interface Props {
    shifts: ShiftData[] | {
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
        title: 'Manutenção',
        href: '/maintenance-dashboard',
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

export default function Index({ shifts, filters = {
    search: '',
    sort: 'name',
    direction: 'asc' as const,
    per_page: 8
} }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const [perPage, setPerPage] = useState(filters?.per_page || 8);
    const [sort, setSort] = useState(filters?.sort || 'name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters?.direction || 'asc');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const page = usePage<PageProps>();
    const flash = page.props.flash;

    const { post, processing, errors } = useForm();

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
                route('asset-hierarchy.shifts'),
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
        setSelectedShift(data.find((shift: ShiftData) => shift.id === id) || null);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!selectedShift) return;
        
        setIsDeleting(true);
        try {
            await router.delete(route('asset-hierarchy.shifts.destroy', selectedShift.id));
            toast.success('Turno excluído com sucesso!');
            setShowDeleteDialog(false);
            setSelectedShift(null);
            setConfirmationText('');
        } catch (error) {
            toast.error('Erro ao excluir turno');
        } finally {
            setIsDeleting(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const data = Array.isArray(shifts) ? shifts : shifts.data;

    // Função para transformar os dados do backend para o formato esperado pelos componentes
    const transformSchedules = (schedules: any[]): Schedule[] => {
        return schedules.map(schedule => ({
            weekday: schedule.weekday,
            shifts: schedule.shifts?.map((shift: any) => ({
                start_time: shift.start_time,
                end_time: shift.end_time,
                active: shift.active ?? true, // Mantém o valor existente ou usa true como padrão
                breaks: shift.breaks?.map((breakTime: any) => ({
                    start_time: breakTime.start_time,
                    end_time: breakTime.end_time
                })) || []
            })) || [{
                start_time: '07:00',
                end_time: '17:00',
                active: true,
                breaks: [{
                    start_time: '12:00',
                    end_time: '13:00'
                }]
            }] // Valor padrão se não houver turnos
        }));
    };

    const columns = [
        {
            id: "name",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('name')}>
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => row.original.name,
            width: "w-[200px]",
        },
        {
            id: "plant",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('plant_id')}>
                    Planta
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => row.original.plant?.name || '-',
            width: "w-[200px]",
        },
        {
            id: "work_hours",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('total_work_hours')}>
                    Horas de Trabalho
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => {
                const hours = row.original.total_work_hours || 0;
                const minutes = row.original.total_work_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
            width: "w-[150px]",
        },
        {
            id: "break_hours",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('total_break_hours')}>
                    Horas de Intervalo
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => {
                const hours = row.original.total_break_hours || 0;
                const minutes = row.original.total_break_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
            width: "w-[150px]",
        },
        {
            id: "asset_count",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('asset_count')}>
                    Ativos
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: ShiftData }) => row.original.asset_count || 0,
            width: "w-[150px]",
        },
        {
            id: "actions",
            header: "Ações",
            cell: (row: { original: ShiftData }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted ignore-row-click"
                            size="icon"
                        >
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 ignore-row-click">
                        <DropdownMenuItem 
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(expanded === row.original.id ? null : row.original.id);
                            }}
                        >
                            Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link 
                                href={route('asset-hierarchy.shifts.edit', row.original.id)}
                                onClick={(e) => e.stopPropagation()}
                            >
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
            width: "w-[80px]",
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
                        <Card className="bg-muted/50 rounded-lg p-6 border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Clock className="size-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-1">Nenhum turno cadastrado</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Adicione turnos para começar a gerenciar os horários de trabalho.
                                </p>
                                <Link href={route('asset-hierarchy.shifts.shift-editor')}>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Turno
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-muted">
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
                                            className={`${expanded === shift.id ? 'bg-muted/50 hover:bg-background' : 'hover:bg-muted/30'} transition-colors cursor-pointer`}
                                            onClick={(e) => {
                                                // Evita conflito com ações (dropdown e links)
                                                if ((e.target as HTMLElement).closest('.ignore-row-click, a, button')) return;
                                                setExpanded(expanded === shift.id ? null : shift.id);
                                            }}
                                        >
                                            <TableCell className="w-[40px] text-center align-middle">
                                                {expanded === shift.id ? (
                                                    <ChevronUpIcon className="h-4 w-4 mx-auto" />
                                                ) : (
                                                    <ChevronDownIcon className="h-4 w-4 mx-auto" />
                                                )}
                                            </TableCell>
                                            {columns.map((column) => (
                                                <TableCell key={column.id} className={column.width + (column.id === 'actions' ? ' ignore-row-click' : '')}>
                                                    {column.cell({ original: shift })}
                                                </TableCell>
                                            ))}
                                        </TableRow>,
                                        expanded === shift.id && (
                                            <TableRow key={`expanded-${shift.id}`} className="hover:bg-transparent"> 
                                                <TableCell colSpan={columns.length + 1} className="p-0 bg-muted/50 border-t border-border/40">
                                                    <Tabs defaultValue="calendar" className="w-full p-4">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <TabsList className="grid grid-cols-3 w-[400px]">
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
                                                                schedules={transformSchedules(shift.schedules)} 
                                                                showAllDays={true}
                                                            />
                                                        </TabsContent>
                                                        <TabsContent value="table">
                                                            <ShiftTableView schedules={transformSchedules(shift.schedules)} />
                                                        </TabsContent>
                                                        <TabsContent value="asset">
                                                            <div className="p-4">
                                                                <h4 className="font-medium mb-4">Ativos Associados</h4>
                                                                {shift.asset_count && shift.asset_count > 0 ? (
                                                                    <p>Lista de ativos aqui...</p>
                                                                ) : (
                                                                    <p className="text-muted-foreground">Nenhum ativo associado a este turno.</p>
                                                                )}
                                                            </div>
                                                        </TabsContent>
                                                    </Tabs>
                                                </TableCell>
                                            </TableRow>
                                        )
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
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
                        <Button 
                            variant="destructive" 
                            onClick={confirmDelete}
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