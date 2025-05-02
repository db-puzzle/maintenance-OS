import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Copy, Save, Clock, Table, X, PlusCircle } from 'lucide-react';
import ShiftTableView from '@/components/ShiftTableView';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeSelect from '@/components/TimeSelect';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import { type BreadcrumbItem, type ShiftForm } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ItemSelect from '@/components/ItemSelect';
import TextInput from '@/components/TextInput';

// Interface para representar um intervalo de descanso
interface Break {
    start_time: string;
    end_time: string;
}

// Interface para representar um turno de trabalho
interface Shift {
    start_time: string;
    end_time: string;
    active: boolean;
    breaks: Break[];
}

// Interface para representar a programação de um dia da semana
interface Schedule {
    weekday: string;
    shifts: Shift[];
}

// Interface para os dados do formulário
interface FormData {
    [key: string]: any;
    name: string;
    plant_id?: string;
    schedules: Schedule[];
}

interface CreateProps {
    plants: {
        id: number;
        name: string;
    }[];
}

interface ShiftData {
    id: number;
    name: string;
    plant?: {
        id: number;
        name: string;
    };
    schedules: Schedule[];
}

const weekdays = [
    { key: 'Monday', label: 'Segunda-feira' },
    { key: 'Tuesday', label: 'Terça-feira' },
    { key: 'Wednesday', label: 'Quarta-feira' },
    { key: 'Thursday', label: 'Quinta-feira' },
    { key: 'Friday', label: 'Sexta-feira' },
    { key: 'Saturday', label: 'Sábado' },
    { key: 'Sunday', label: 'Domingo' },
];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Turnos',
        href: '/asset-hierarchy/shifts',
    },
    {
        title: 'Novo Turno',
        href: '/asset-hierarchy/shifts/shift-editor',
    },
];

// Função para validar se um intervalo está dentro do horário do turno
const isBreakValid = (shift: Shift, breakTime: Break): boolean => {
    const shiftStart = new Date(`2000-01-01T${shift.start_time}`);
    const shiftEnd = new Date(`2000-01-01T${shift.end_time}`);
    const breakStart = new Date(`2000-01-01T${breakTime.start_time}`);
    const breakEnd = new Date(`2000-01-01T${breakTime.end_time}`);

    // Se o turno termina no dia seguinte
    if (shiftEnd < shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    // Se o intervalo termina no dia seguinte
    if (breakEnd < breakStart) {
        breakEnd.setDate(breakEnd.getDate() + 1);
    }

    return breakStart >= shiftStart && breakEnd <= shiftEnd;
};

// Função para converter horário em minutos
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Função para converter minutos em horário
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Função para calcular a duração entre dois horários
const calculateDuration = (start: string, end: string): number => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    
    // Se o horário final for menor que o inicial, significa que atravessou a meia-noite
    if (endMinutes < startMinutes) {
        return (24 * 60 - startMinutes) + endMinutes;
    }
    
    return endMinutes - startMinutes;
};

// Função para adicionar minutos a um horário
const addMinutes = (time: string, minutes: number): string => {
    const totalMinutes = timeToMinutes(time) + minutes;
    return minutesToTime(totalMinutes);
};

// Função para encontrar o maior período sem intervalo
const findLargestGap = (shift: Shift): { start: string, end: string } | null => {
    if (shift.breaks.length === 0) {
        return {
            start: shift.start_time,
            end: shift.end_time
        };
    }

    // Ordena os intervalos por horário de início
    const sortedBreaks = [...shift.breaks].sort((a, b) => 
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    let largestGap = 0;
    let gapStart = shift.start_time;
    let gapEnd = shift.end_time;

    // Verifica o período antes do primeiro intervalo
    const firstGap = calculateDuration(shift.start_time, sortedBreaks[0].start_time);
    if (firstGap > largestGap) {
        largestGap = firstGap;
        gapStart = shift.start_time;
        gapEnd = sortedBreaks[0].start_time;
    }

    // Verifica os períodos entre intervalos
    for (let i = 0; i < sortedBreaks.length - 1; i++) {
        const currentGap = calculateDuration(sortedBreaks[i].end_time, sortedBreaks[i + 1].start_time);
        if (currentGap > largestGap) {
            largestGap = currentGap;
            gapStart = sortedBreaks[i].end_time;
            gapEnd = sortedBreaks[i + 1].start_time;
        }
    }

    // Verifica o período após o último intervalo
    const lastGap = calculateDuration(sortedBreaks[sortedBreaks.length - 1].end_time, shift.end_time);
    if (lastGap > largestGap) {
        largestGap = lastGap;
        gapStart = sortedBreaks[sortedBreaks.length - 1].end_time;
        gapEnd = shift.end_time;
    }

    return largestGap > 0 ? { start: gapStart, end: gapEnd } : null;
};

// Função para verificar se dois turnos se sobrepõem
const hasOverlappingShifts = (shift1: Shift, shift2: Shift): boolean => {
    const shift1Start = timeToMinutes(shift1.start_time);
    const shift1End = timeToMinutes(shift1.end_time);
    const shift2Start = timeToMinutes(shift2.start_time);
    const shift2End = timeToMinutes(shift2.end_time);

    // Se algum dos turnos atravessa a meia-noite
    if (shift1End < shift1Start) {
        // Verifica se o turno 2 começa antes do turno 1 terminar
        if (shift2Start < shift1End) return true;
        // Verifica se o turno 2 termina depois do turno 1 começar
        if (shift2End > shift1Start) return true;
        // Verifica se o turno 2 atravessa a meia-noite e se sobrepõe
        if (shift2End < shift2Start && shift2Start < shift1End && shift2End > shift1Start) return true;
    } else if (shift2End < shift2Start) {
        // Verifica se o turno 1 começa antes do turno 2 terminar
        if (shift1Start < shift2End) return true;
        // Verifica se o turno 1 termina depois do turno 2 começar
        if (shift1End > shift2Start) return true;
        // Verifica se o turno 1 atravessa a meia-noite e se sobrepõe
        if (shift1End < shift1Start && shift1Start < shift2End && shift1End > shift2Start) return true;
    } else {
        // Caso nenhum dos turnos atravesse a meia-noite
        return (shift1Start < shift2End && shift2Start < shift1End);
    }

    return false;
};

// Função para encontrar turnos sobrepostos
const findOverlappingShifts = (shifts: Shift[], currentShiftIndex: number): number[] => {
    const currentShift = shifts[currentShiftIndex];
    const overlappingIndices: number[] = [];

    for (let i = 0; i < shifts.length; i++) {
        if (i !== currentShiftIndex && hasOverlappingShifts(currentShift, shifts[i])) {
            overlappingIndices.push(i);
        }
    }

    return overlappingIndices;
};

// Função para verificar se dois intervalos se sobrepõem
const hasOverlappingBreaks = (break1: Break, break2: Break): boolean => {
    const break1Start = timeToMinutes(break1.start_time);
    const break1End = timeToMinutes(break1.end_time);
    const break2Start = timeToMinutes(break2.start_time);
    const break2End = timeToMinutes(break2.end_time);

    // Se algum dos intervalos atravessa a meia-noite
    if (break1End < break1Start) {
        // Verifica se o intervalo 2 começa antes do intervalo 1 terminar
        if (break2Start < break1End) return true;
        // Verifica se o intervalo 2 termina depois do intervalo 1 começar
        if (break2End > break1Start) return true;
        // Verifica se o intervalo 2 atravessa a meia-noite e se sobrepõe
        if (break2End < break2Start && break2Start < break1End && break2End > break1Start) return true;
    } else if (break2End < break2Start) {
        // Verifica se o intervalo 1 começa antes do intervalo 2 terminar
        if (break1Start < break2End) return true;
        // Verifica se o intervalo 1 termina depois do intervalo 2 começar
        if (break1End > break2Start) return true;
        // Verifica se o intervalo 1 atravessa a meia-noite e se sobrepõe
        if (break1End < break1Start && break1Start < break2End && break1End > break2Start) return true;
    } else {
        // Caso nenhum dos intervalos atravesse a meia-noite
        return (break1Start < break2End && break2Start < break1End);
    }

    return false;
};

// Função para verificar se um intervalo está sobrepondo com outros intervalos do mesmo turno
const isBreakOverlapping = (shift: Shift, currentBreak: Break, currentBreakIndex: number): boolean => {
    return shift.breaks.some((breakTime, index) => 
        index !== currentBreakIndex && hasOverlappingBreaks(currentBreak, breakTime)
    );
};

interface ShiftFormProps extends CreateProps {
    mode?: 'create' | 'edit';
    shift?: ShiftData;
}

const ShiftForm: React.FC<ShiftFormProps> = ({ plants, mode = 'create', shift }) => {
    const { data, setData, post, put, processing, errors, clearErrors } = useForm<ShiftForm>({
        name: shift?.name || '',
        plant_id: shift?.plant?.id?.toString() || '',
        schedules: shift?.schedules || weekdays.map(day => ({
            weekday: day.key,
            shifts: day.key === 'Saturday' || day.key === 'Sunday' ? [] : [{
                start_time: '07:00',
                end_time: '17:00',
                active: true,
                breaks: [
                    { start_time: '12:00', end_time: '13:00' }
                ]
            }]
        }))
    });

    const [selectedDay, setSelectedDay] = useState(weekdays[0].key);
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedShift, setSelectedShift] = useState(0);
    const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

    // Função para adicionar um novo turno em um dia específico
    const addShift = (dayIndex: number) => {
        const newSchedules = [...data.schedules];
        const existingShifts = newSchedules[dayIndex].shifts;
        
        // Se não houver turnos, usa o padrão
        if (existingShifts.length === 0) {
            newSchedules[dayIndex].shifts.push({
                start_time: '07:00',
                end_time: '17:00',
                active: true,
                breaks: [
                    { start_time: '12:00', end_time: '13:00' }
                ]
            });
        } else {
            // Pega o último turno
            const lastShift = existingShifts[existingShifts.length - 1];
            const lastEndTime = lastShift.end_time;
            
            // Calcula o novo horário
            const [lastEndHour, lastEndMinute] = lastEndTime.split(':').map(Number);
            const newStartHour = lastEndHour;
            const newStartMinute = lastEndMinute;
            
            // Calcula o horário de término (9 horas depois)
            let newEndHour = newStartHour + 9;
            if (newEndHour >= 24) {
                newEndHour -= 24;
            }
            
            // Calcula o horário do intervalo (4 horas depois do início)
            let breakStartHour = newStartHour + 4;
            if (breakStartHour >= 24) {
                breakStartHour -= 24;
            }
            let breakEndHour = breakStartHour + 1;
            if (breakEndHour >= 24) {
                breakEndHour -= 24;
            }
            
            // Formata os horários
            const formatTime = (hour: number, minute: number) => {
                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            };
            
            newSchedules[dayIndex].shifts.push({
                start_time: formatTime(newStartHour, newStartMinute),
                end_time: formatTime(newEndHour, newStartMinute),
                active: true,
                breaks: [
                    { 
                        start_time: formatTime(breakStartHour, newStartMinute),
                        end_time: formatTime(breakEndHour, newStartMinute)
                    }
                ]
            });
        }
        
        setData('schedules', newSchedules);
    };

    // Função para remover um turno de um dia específico
    const removeShift = (dayIndex: number, shiftIndex: number) => {
        const newSchedules = data.schedules.map((day, idx) => {
            if (idx === dayIndex) {
                return {
                    ...day,
                    shifts: day.shifts.filter((_, index) => index !== shiftIndex)
                };
            }
            return day;
        });

        setData('schedules', newSchedules);
    };

    // Função para adicionar um intervalo em um turno específico
    const addBreak = (dayIndex: number, shiftIndex: number) => {
        const newSchedules = [...data.schedules];
        const shift = newSchedules[dayIndex].shifts[shiftIndex];
        
        if (shift.breaks.length === 0) {
            // Se não houver intervalos, adiciona um intervalo de 30 minutos no meio do turno
            const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
            const breakStart = addMinutes(shift.start_time, Math.floor(shiftDuration / 2) - 15);
            const breakEnd = addMinutes(breakStart, 30);

            newSchedules[dayIndex].shifts[shiftIndex].breaks.push({
                start_time: breakStart,
                end_time: breakEnd
            });
        } else {
            // Encontra o maior período sem intervalo
            const largestGap = findLargestGap(shift);
            
            if (largestGap) {
                const gapDuration = calculateDuration(largestGap.start, largestGap.end);
                const breakStart = addMinutes(largestGap.start, Math.floor(gapDuration / 2) - 7);
                const breakEnd = addMinutes(breakStart, 15);

                newSchedules[dayIndex].shifts[shiftIndex].breaks.push({
                    start_time: breakStart,
                    end_time: breakEnd
                });
            }
        }

        setData('schedules', newSchedules);
    };

    const removeBreak = (dayIndex: number, shiftIndex: number, breakIndex: number) => {
        const newSchedules = data.schedules.map((day, idx) => {
            if (idx === dayIndex) {
                return {
                    ...day,
                    shifts: day.shifts.map((shift, sIdx) => {
                        if (sIdx === shiftIndex) {
                            return {
                                ...shift,
                                breaks: shift.breaks.filter((_, bIdx) => bIdx !== breakIndex)
                            };
                        }
                        return shift;
                    })
                };
            }
            return day;
        });

        setData('schedules', newSchedules);
    };

    const updateBreak = (dayIndex: number, shiftIndex: number, breakIndex: number, field: keyof Break, value: string) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts[shiftIndex].breaks[breakIndex][field] = value;
        setData('schedules', newSchedules);
    };

    const toggleShiftActive = (dayIndex: number, shiftIndex: number) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts[shiftIndex].active = !newSchedules[dayIndex].shifts[shiftIndex].active;
        setData('schedules', newSchedules);
    };

    const applyToSelectedDays = () => {
        const sourceDay = data.schedules.find(s => s.weekday === selectedDay);
        if (!sourceDay) return;

        const newSchedules = data.schedules.map(schedule => {
            if (selectedDays.includes(schedule.weekday)) {
                // Cria uma cópia profunda do dia de origem
                return {
                    ...sourceDay,
                    weekday: schedule.weekday,
                    shifts: sourceDay.shifts.map(shift => ({
                        ...shift,
                        breaks: shift.breaks.map(breakTime => ({ ...breakTime }))
                    }))
                };
            }
            return schedule;
        });

        setData('schedules', newSchedules);
        setSelectedDays([]);
    };

    const handleSave = () => {
        // Remove os segundos de todos os horários antes de enviar
        const formattedData = {
            ...data,
            schedules: data.schedules.map(schedule => ({
                ...schedule,
                shifts: schedule.shifts.map(shift => ({
                    ...shift,
                    start_time: shift.start_time?.substring(0, 5) || shift.start_time,
                    end_time: shift.end_time?.substring(0, 5) || shift.end_time,
                    breaks: shift.breaks.map(breakTime => ({
                        start_time: breakTime.start_time?.substring(0, 5) || breakTime.start_time,
                        end_time: breakTime.end_time?.substring(0, 5) || breakTime.end_time
                    }))
                }))
            }))
        };

        // Atualiza os dados do formulário com os valores formatados
        setData(formattedData);

        if (mode === 'create') {
            post(route('asset-hierarchy.shifts.store'), {
                onSuccess: () => {
                    toast.success("Turno criado com sucesso!");
                },
                onError: () => {
                    toast.error("Erro ao criar turno", {
                        description: "Ocorreu um erro. Por favor, verifique os dados e tente novamente."
                    });
                }
            });
        } else {
            put(route('asset-hierarchy.shifts.update', shift?.id), {
                onSuccess: () => {
                    toast.success("Turno atualizado com sucesso!");
                },
                onError: () => {
                    toast.error("Erro ao atualizar turno", {
                        description: "Ocorreu um erro. Por favor, verifique os dados e tente novamente."
                    });
                }
            });
        }
    };

    const isEditing = mode === 'edit';
    const title = isEditing ? "Editar Turno" : "Cadastrar Turno";
    const subtitle = isEditing ? "Edite as configurações do turno" : "Configure os turnos de trabalho";
    const saveButtonText = isEditing ? "Salvar Alterações" : "Salvar";

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <CreateLayout
                title={title}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.shifts')}
                onSave={handleSave}
                isSaving={processing}
                contentWidth="custom"
                contentClassName="w-[950px]"
                saveButtonText={saveButtonText}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="grid grid-cols-1 justify-items-start">
                        <div className="w-fit space-y-6">
                            {/* Campo de nome do turno */}
                            <div className="space-y-2 w-full">
                                <div className="flex gap-4">
                                    <div className="w-1/2">
                                        <TextInput<ShiftForm>
                                            form={{
                                                data,
                                                setData,
                                                errors,
                                                clearErrors
                                            }}
                                            name="name"
                                            label="Nome do Turno"
                                            placeholder="Digite o nome do turno"
                                            required
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <ItemSelect
                                            label="Planta"
                                            items={plants}
                                            value={data.plant_id || ''}
                                            onValueChange={(value) => setData('plant_id', value)}
                                            createRoute={route('asset-hierarchy.plantas.create')}
                                            placeholder="Selecione uma planta"
                                            error={errors.plant_id}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seletor de dias da semana */}
                            <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                                <TabsList className="grid grid-cols-7 gap-2">
                                    {weekdays.map(day => (
                                        <TabsTrigger key={day.key} value={day.key} className="px-4">
                                            {day.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Conteúdo de cada dia da semana */}
                                {weekdays.map((day, dayIndex) => (
                                    <TabsContent key={day.key} value={day.key} className="!pl-2 !pr-0">
                                        <div className="flex flex-row items-center justify-between pt-6 pb-6">
                                            <h3 className="text-lg font-semibold">Turnos da {day.label}</h3>
                                            <div className="flex items-center gap-2">
                                                {/* Botão para copiar turnos para múltiplos dias */}
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={data.schedules[dayIndex].shifts.length === 0}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Copiar para Múltiplos Dias
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-6" align="end" sideOffset={5}>
                                                        {/* Conteúdo do popover de cópia */}
                                                        <div className="space-y-5">
                                                            <div className="grid grid-cols-2 gap-4 mt-1">
                                                                {weekdays
                                                                    .filter(d => d.key !== day.key)
                                                                    .map(d => (
                                                                        <div key={d.key} className="flex items-center space-x-1 py-1">
                                                                            <Checkbox
                                                                                checked={selectedDays.includes(d.key)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        setSelectedDays([...selectedDays, d.key]);
                                                                                    } else {
                                                                                        setSelectedDays(selectedDays.filter(day => day !== d.key));
                                                                                    }
                                                                                }}
                                                                                id={`copy-day-${d.key}`}
                                                                                className="h-5 w-5"
                                                                            />
                                                                            <Label htmlFor={`copy-day-${d.key}`} className="cursor-pointer">
                                                                                {d.label}
                                                                            </Label>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                            <div className="pt-3">
                                                                <Button
                                                                    type="button"
                                                                    onClick={applyToSelectedDays}
                                                                    size="sm"
                                                                    disabled={selectedDays.length === 0}
                                                                    className="w-full"
                                                                >
                                                                    Aplicar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                {/* Botão para adicionar novo turno */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addShift(dayIndex)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Adicionar Turno
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Lista de turnos do dia */}
                                        {data.schedules[dayIndex].shifts.length === 0 ? (
                                            <div className="bg-muted/50 rounded-lg p-6 border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                                        <Clock className="size-6 text-muted-foreground" />
                                                    </div>
                                                    <h3 className="text-lg font-medium mb-1">Nenhum turno adicionado</h3>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Adicione turnos para este dia da semana.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            data.schedules[dayIndex].shifts.map((shift, shiftIndex) => {
                                                const overlappingShifts = findOverlappingShifts(data.schedules[dayIndex].shifts, shiftIndex);
                                                
                                                return (
                                                    <Card 
                                                        key={`shift-${dayIndex}-${shiftIndex}-${shift.start_time}-${shift.end_time}`} 
                                                        className="bg-muted/50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] mb-4"
                                                    >
                                                        <CardHeader className="flex flex-col space-y-2">
                                                            <div className="flex items-center">
                                                                <Label className="text-md font-semibold">Turno {shiftIndex + 1}</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <div className="flex items-center space-x-2">
                                                                    {/* Seletor de horário de início */}
                                                                    <TimeSelect
                                                                        value={shift.start_time}
                                                                        onChange={(value: string) => {
                                                                            const newSchedules = [...data.schedules];
                                                                            newSchedules[dayIndex].shifts[shiftIndex].start_time = value;
                                                                            setData('schedules', newSchedules);
                                                                        }}
                                                                    />
                                                                    <span className="text-muted-foreground">até</span>
                                                                    {/* Seletor de horário de término */}
                                                                    <TimeSelect
                                                                        value={shift.end_time}
                                                                        onChange={(value: string) => {
                                                                            const newSchedules = [...data.schedules];
                                                                            newSchedules[dayIndex].shifts[shiftIndex].end_time = value;
                                                                            setData('schedules', newSchedules);
                                                                        }}
                                                                    />
                                                                    {/* Botão para remover turno */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        onClick={() => removeShift(dayIndex, shiftIndex)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                {overlappingShifts.length > 0 && (
                                                                    <Alert variant="destructive" className="py-2 border-0 flex items-center gap-2 ml-2">
                                                                        <AlertCircle className="h-4 w-4 mb-1" />
                                                                        <AlertDescription className="text-sm">
                                                                            Este turno está sobrepondo com {overlappingShifts.length === 1 ? 'o turno' : 'os turnos'} {overlappingShifts.map(i => i + 1).join(', ')}
                                                                        </AlertDescription>
                                                                    </Alert>
                                                                )}
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-2 -mt-2">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {/* Seção de intervalos */}
                                                                <div className="space-y-0.5 pl-4">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <Label className="text-base font-medium pt-2 ml-2">Intervalos</Label>
                                                                        {/* Botão para adicionar intervalo */}
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => addBreak(dayIndex, shiftIndex)}
                                                                        >
                                                                            <Plus className="h-4 w-4 mr-2" />
                                                                            Adicionar Intervalo
                                                                        </Button>
                                                                    </div>
                                                                    {shift.breaks.length === 0 ? (
                                                                        <Card className="bg-background shadow-none">
                                                                            <CardContent className="px-2 py-0 flex items-start space-x-2 ml-2 -mt-3 -mb-3">
                                                                                <div className="size-8 rounded-full bg-muted flex items-center justify-center -mt-0.75">
                                                                                    <Clock className="size-4 text-muted-foreground" />
                                                                                </div>
                                                                                <div className="flex flex-col py-0.5">
                                                                                    <h3 className="text-base font-medium">Nenhum intervalo adicionado</h3>
                                                                                    <p className="text-sm text-muted-foreground">
                                                                                        Adicione intervalos para este turno.
                                                                                    </p>
                                                                                </div>
                                                                            </CardContent>
                                                                        </Card>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {/* Lista de intervalos */}
                                                                            {shift.breaks.map((breakTime, breakIndex) => {
                                                                                const isValidInShift = isBreakValid(shift, breakTime);
                                                                                const isOverlapping = isValidInShift && isBreakOverlapping(shift, breakTime, breakIndex);
                                                                                
                                                                                return (
                                                                                    <Card key={`break-${dayIndex}-${shiftIndex}-${breakIndex}-${breakTime.start_time}-${breakTime.end_time}`} className="bg-background shadow-none">
                                                                                        <CardContent className="px-2 flex items-center space-x-2 -mt-3 -mb-3 ml-1">
                                                                                            <div className="flex items-center space-x-2">
                                                                                                {/* Seletor de horário de início do intervalo */}
                                                                                                <TimeSelect
                                                                                                    value={breakTime.start_time}
                                                                                                    onChange={(value: string) => updateBreak(dayIndex, shiftIndex, breakIndex, 'start_time', value)}
                                                                                                />
                                                                                                <span className="text-muted-foreground">até</span>
                                                                                                {/* Seletor de horário de término do intervalo */}
                                                                                                <TimeSelect
                                                                                                    value={breakTime.end_time}
                                                                                                    onChange={(value: string) => updateBreak(dayIndex, shiftIndex, breakIndex, 'end_time', value)}
                                                                                                />
                                                                                                {/* Botão para remover intervalo */}
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    variant="destructive"
                                                                                                    size="icon"
                                                                                                    className="h-6 w-6"
                                                                                                    onClick={() => removeBreak(dayIndex, shiftIndex, breakIndex)}
                                                                                                >
                                                                                                    <X className="h-3 w-3" />
                                                                                                </Button>
                                                                                            </div>
                                                                                            {!isValidInShift && (
                                                                                                <Alert variant="destructive" className="py-2 border-0 flex items-center gap-2 ml-2">
                                                                                                    <AlertCircle className="h-4 w-4 mb-1" />
                                                                                                    <AlertDescription className="text-sm">
                                                                                                        O intervalo deve estar dentro do horário do turno
                                                                                                    </AlertDescription>
                                                                                                </Alert>
                                                                                            )}
                                                                                            {isOverlapping && (
                                                                                                <Alert variant="destructive" className="py-2 border-0 flex items-center gap-2 ml-2">
                                                                                                    <AlertCircle className="h-4 w-4 mb-1" />
                                                                                                    <AlertDescription className="text-sm">
                                                                                                        Este intervalo está sobrepondo com outro intervalo do turno
                                                                                                    </AlertDescription>
                                                                                                </Alert>
                                                                                            )}
                                                                                        </CardContent>
                                                                                    </Card>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })
                                        )}
                                    </TabsContent>
                                ))}
                            </Tabs>

                            {/* Seção de visualização */}
                            <div className="space-y-4">
                                {/* Seletor de modo de visualização */}
                                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'table')}>
                                    <TabsList className="grid grid-cols-2 w-[200px]">
                                        <TabsTrigger value="timeline" className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Timeline
                                        </TabsTrigger>
                                        <TabsTrigger value="table" className="flex items-center gap-2">
                                            <Table className="h-4 w-4" />
                                            Tabela
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {/* Visualização dos turnos */}
                                <div className="relative">
                                    {/* Visualização em timeline */}
                                    <div className={`transition-opacity duration-300 ${viewMode === 'timeline' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Visualização dos Turnos</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ShiftCalendarView schedules={data.schedules} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                    {/* Visualização em tabela */}
                                    <div className={`transition-opacity duration-300 ${viewMode === 'table' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Visão Geral Semanal</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ShiftTableView schedules={data.schedules} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
}

export default ShiftForm; 