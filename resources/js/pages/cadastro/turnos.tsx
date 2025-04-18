import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Copy, Save, Clock } from 'lucide-react';
import ShiftTimeline from '@/components/ShiftTimeline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeSelect from '@/components/TimeSelect';
import CreateLayout from '@/layouts/cadastro/create-layout';
import { type BreadcrumbItem } from '@/types';

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

interface FormData {
    [key: string]: any;
    name: string;
    schedules: Schedule[];
}

interface CreateProps {}

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
    },
    {
        title: 'Turnos',
        href: '/cadastro/turnos',
    },
    {
        title: 'Novo Turno',
        href: '/cadastro/turnos/create',
    },
];

export default function Create({}: CreateProps) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        schedules: weekdays.map(day => ({
            weekday: day.key,
            shifts: [{
                start_time: '08:00',
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

    const addShift = (dayIndex: number) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts.push({
            start_time: '08:00',
            end_time: '17:00',
            active: true,
            breaks: []
        });
        setData('schedules', newSchedules);
    };

    const removeShift = (dayIndex: number, shiftIndex: number) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts.splice(shiftIndex, 1);
        setData('schedules', newSchedules);
    };

    const addBreak = (dayIndex: number, shiftIndex: number) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts[shiftIndex].breaks.push({
            start_time: '15:00',
            end_time: '15:15'
        });
        setData('schedules', newSchedules);
    };

    const removeBreak = (dayIndex: number, shiftIndex: number, breakIndex: number) => {
        const newSchedules = [...data.schedules];
        newSchedules[dayIndex].shifts[shiftIndex].breaks.splice(breakIndex, 1);
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
                return { ...sourceDay, weekday: schedule.weekday };
            }
            return schedule;
        });

        setData('schedules', newSchedules);
        setBulkMode(false);
        setSelectedDays([]);
    };

    const handleSave = () => {
        post(route('cadastro.turnos.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cadastrar Turno" />

            <CreateLayout
                title="Cadastrar Turno"
                subtitle="Configure os turnos de trabalho"
                breadcrumbs={breadcrumbs}
                backRoute={route('cadastro.turnos')}
                onSave={handleSave}
                isSaving={processing}
                contentWidth="custom"
                contentClassName="w-[950px]"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="grid grid-cols-1 justify-items-start">
                        <div className="w-fit space-y-6">
                            <div className="space-y-2 w-full">
                                <Label htmlFor="name">Nome do Turno</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    required
                                />
                            </div>

                            <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                                <TabsList className="grid grid-cols-7 gap-2">
                                    {weekdays.map(day => (
                                        <TabsTrigger key={day.key} value={day.key} className="px-4">
                                            {day.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {weekdays.map((day, dayIndex) => (
                                    <TabsContent key={day.key} value={day.key}>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle>{day.label}</CardTitle>
                                                <div className="flex items-center gap-2">
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
                                                                        onClick={() => {
                                                                            const sourceDay = data.schedules.find(s => s.weekday === day.key);
                                                                            if (!sourceDay || selectedDays.length === 0) return;
                                                                            
                                                                            const newSchedules = data.schedules.map(schedule => {
                                                                                if (selectedDays.includes(schedule.weekday)) {
                                                                                    return { ...sourceDay, weekday: schedule.weekday };
                                                                                }
                                                                                return schedule;
                                                                            });
                                                                            
                                                                            setData('schedules', newSchedules);
                                                                            setSelectedDays([]);
                                                                        }}
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
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {data.schedules[dayIndex].shifts.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                                            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                                                <Clock className="size-6 text-muted-foreground" />
                                                            </div>
                                                            <h3 className="text-lg font-medium mb-1">Nenhum turno adicionado</h3>
                                                            <p className="text-sm text-muted-foreground mb-4">
                                                                Adicione turnos para este dia da semana.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        data.schedules[dayIndex].shifts.map((shift, shiftIndex) => (
                                                            <Card key={shiftIndex} className="bg-muted/50">
                                                                <CardHeader className="flex flex-row items-center justify-between">
                                                                    <div className="flex items-center space-x-2">
                                                                        <Label>Turno {shiftIndex + 1}</Label>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => removeShift(dayIndex, shiftIndex)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </CardHeader>
                                                                <CardContent className="space-y-4 -mt-4">
                                                                    <div className="flex items-start gap-8">
                                                                        <div>
                                                                            <TimeSelect
                                                                                value={shift.start_time}
                                                                                onChange={(value: string) => {
                                                                                    const newSchedules = [...data.schedules];
                                                                                    newSchedules[dayIndex].shifts[shiftIndex].start_time = value;
                                                                                    setData('schedules', newSchedules);
                                                                                }}
                                                                                label="Início"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <TimeSelect
                                                                                value={shift.end_time}
                                                                                onChange={(value: string) => {
                                                                                    const newSchedules = [...data.schedules];
                                                                                    newSchedules[dayIndex].shifts[shiftIndex].end_time = value;
                                                                                    setData('schedules', newSchedules);
                                                                                }}
                                                                                label="Fim"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <Card className="bg-muted/50">
                                                                            <CardContent className="px-4 pb-2 space-y-4">
                                                                                <div className="flex justify-between items-center">
                                                                                    <Label>Intervalos</Label>
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
                                                                                    <div className="flex flex-col items-center justify-center py-5 text-center">
                                                                                        <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-2">
                                                                                            <Clock className="size-5 text-muted-foreground" />
                                                                                        </div>
                                                                                        <h3 className="text-lg font-medium mb-1">Nenhum intervalo adicionado</h3>
                                                                                        <p className="text-sm text-muted-foreground mb-3">
                                                                                            Adicione intervalos para este turno.
                                                                                        </p>
                                                                                    </div>
                                                                                ) : (
                                                                                    shift.breaks.map((breakTime, breakIndex) => (
                                                                                        <div key={breakIndex} className="flex items-start gap-8">
                                                                                            <div>
                                                                                                <TimeSelect
                                                                                                    value={breakTime.start_time}
                                                                                                    onChange={(value: string) => updateBreak(dayIndex, shiftIndex, breakIndex, 'start_time', value)}
                                                                                                    label="Início"
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <TimeSelect
                                                                                                    value={breakTime.end_time}
                                                                                                    onChange={(value: string) => updateBreak(dayIndex, shiftIndex, breakIndex, 'end_time', value)}
                                                                                                    label="Fim"
                                                                                                />
                                                                                            </div>
                                                                                            <div className="ml-auto pt-6">
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    variant="destructive"
                                                                                                    size="icon"
                                                                                                    onClick={() => removeBreak(dayIndex, shiftIndex, breakIndex)}
                                                                                                >
                                                                                                    <Trash2 className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </CardContent>
                                                                        </Card>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                ))}
                            </Tabs>

                            <ShiftTimeline schedules={data.schedules} />
                        </div>
                    </div>
                </form>
            </CreateLayout>
        </AppLayout>
    );
} 