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
import { Plus, Pencil, Trash2, ArrowUpDown, Calendar, List, Settings } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/cadastro/list-layout';
import { type BreadcrumbItem } from '@/types';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftTableView from '@/components/ShiftTableView';

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
    equipment_count?: number;
    schedules: Schedule[];
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
        title: 'Cadastro',
    },
    {
        title: 'Turnos',
        href: '/cadastro/turnos',
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
    const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set());

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
                route('cadastro.turnos'),
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

    useEffect(() => {
        const handleScroll = () => {
            expandedShifts.forEach(shiftId => {
                const element = document.getElementById(`shift-${shiftId}`);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top < 0) {
                        const offset = 20;
                        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                        const offsetPosition = elementPosition - offset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        };

        const timeoutId = setTimeout(handleScroll, 100);
        return () => clearTimeout(timeoutId);
    }, [expandedShifts]);

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await router.delete(route('cadastro.turnos.destroy', id));
            toast.success('Turno excluído com sucesso!');
        } catch (error) {
            toast.error('Erro ao excluir turno');
        }
    };

    const toggleShiftExpansion = (shiftId: number) => {
        const newExpandedShifts = new Set(expandedShifts);
        if (newExpandedShifts.has(shiftId)) {
            newExpandedShifts.delete(shiftId);
        } else {
            newExpandedShifts.add(shiftId);
        }
        setExpandedShifts(newExpandedShifts);
    };

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Turnos" />

            <ListLayout
                title="Turnos"
                description="Gerencie os turnos de trabalho"
                searchPlaceholder="Buscar por nome..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('cadastro.turnos.create')}
                createButtonText="Adicionar"
            >
                <div className="space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                        {data.map((shift) => {
                            const transformedSchedules = transformSchedules(shift.schedules);
                            
                            return (
                                <AccordionItem 
                                    key={shift.id} 
                                    value={`shift-${shift.id}`}
                                    className="border rounded-lg mb-4 transition-all duration-200 ease-in-out"
                                >
                                    <AccordionTrigger className="flex items-center justify-between px-4 py-3 hover:no-underline data-[state=open]:bg-muted transition-colors duration-200">
                                        <div className="flex items-center space-x-4">
                                            <div className="text-left">
                                                <h3 className="font-semibold text-lg">{shift.name}</h3>
                                                <div className="text-sm text-muted-foreground">
                                                    {shift.plant?.name && (
                                                        <span>Planta: {shift.plant.name}</span>
                                                    )}
                                                    {shift.equipment_count !== undefined && (
                                                        <span className="ml-2">
                                                            Equipamentos: {shift.equipment_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 py-4 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                        <Tabs defaultValue="calendar" className="w-full">
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
                                                    <TabsTrigger value="equipment" className="flex items-center gap-2">
                                                        <Settings className="h-4 w-4" />
                                                        Equipamentos
                                                    </TabsTrigger>
                                                </TabsList>
                                                <Link href={route('cadastro.turnos.edit', shift.id)}>
                                                    <Button variant="outline" size="sm">
                                                        Editar
                                                    </Button>
                                                </Link>
                                            </div>
                                            <TabsContent value="calendar">
                                                <ShiftCalendarView schedules={transformedSchedules} />
                                            </TabsContent>
                                            <TabsContent value="table">
                                                <ShiftTableView schedules={transformedSchedules} />
                                            </TabsContent>
                                            <TabsContent value="equipment">
                                                <div className="p-4">
                                                    <h4 className="font-medium mb-4">Equipamentos Associados</h4>
                                                    {shift.equipment_count && shift.equipment_count > 0 ? (
                                                        <p>Lista de equipamentos aqui...</p>
                                                    ) : (
                                                        <p className="text-muted-foreground">Nenhum equipamento associado a este turno.</p>
                                                    )}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>

                    {!Array.isArray(shifts) && (
                        <PaginationWrapper
                            currentPage={shifts.current_page}
                            lastPage={shifts.last_page}
                            total={shifts.total}
                            routeName="cadastro.turnos"
                            search={search}
                            sort={sort}
                            direction={direction}
                            perPage={perPage}
                        />
                    )}
                </div>
            </ListLayout>
        </AppLayout>
    );
} 