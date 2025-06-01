import { Calendar, Clock, Coffee } from 'lucide-react';
import React from 'react';

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
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface ShiftVisualizationProps {
    shift: ShiftData | null;
}

const weekdayOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const calculateDuration = (start: string, end: string): number => {
    const startMinutes = timeToMinutes(start);
    let endMinutes = timeToMinutes(end);

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    return endMinutes - startMinutes;
};

const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
};

const ShiftVisualization: React.FC<ShiftVisualizationProps> = ({ shift }) => {
    if (!shift) {
        return (
            <div className="p-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum turno selecionado</h3>
                <p className="mt-1 text-sm text-gray-500">Selecione um turno para visualizar os detalhes</p>
            </div>
        );
    }

    // Calculate totals
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;

    shift.schedules.forEach(schedule => {
        schedule.shifts.forEach(shift => {
            if (shift.active) {
                const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                totalWorkMinutes += shiftDuration;

                shift.breaks.forEach(breakTime => {
                    const breakDuration = calculateDuration(breakTime.start_time, breakTime.end_time);
                    totalBreakMinutes += breakDuration;
                });
            }
        });
    });

    const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;

    return (
        <div className="space-y-6">
            {/* Header with summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
                        {shift.plant && (
                            <p className="text-sm text-gray-500">Planta: {shift.plant.name}</p>
                        )}
                    </div>
                    <div className="flex gap-6 text-sm">
                        <div className="text-center">
                            <p className="text-gray-500">Horas Totais</p>
                            <p className="font-semibold">{formatDuration(totalWorkMinutes)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-500">Intervalos</p>
                            <p className="font-semibold">{formatDuration(totalBreakMinutes)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-500">Trabalhando</p>
                            <p className="font-semibold text-primary-600">{formatDuration(netWorkMinutes)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly schedule */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Programação Semanal</h4>
                <div className="space-y-3">
                    {weekdayOrder.map((weekday) => {
                        const schedule = shift.schedules.find(s => s.weekday === weekday);
                        if (!schedule) return null;

                        const hasActiveShifts = schedule.shifts.some(s => s.active);

                        return (
                            <div key={weekday} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h5 className="font-medium text-gray-900 mb-2">{weekday}</h5>
                                        {schedule.shifts.length === 0 ? (
                                            <p className="text-sm text-gray-500">Sem expediente</p>
                                        ) : !hasActiveShifts ? (
                                            <p className="text-sm text-gray-500">Sem expediente (turnos inativos)</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {schedule.shifts.map((shift, shiftIndex) => {
                                                    if (!shift.active) return null;

                                                    const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                                                    const breakDuration = shift.breaks.reduce((total, breakTime) => {
                                                        return total + calculateDuration(breakTime.start_time, breakTime.end_time);
                                                    }, 0);

                                                    return (
                                                        <div key={shiftIndex} className="flex items-start gap-4">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Clock className="h-4 w-4 text-gray-400" />
                                                                <span className="font-medium">
                                                                    {shift.start_time} - {shift.end_time}
                                                                </span>
                                                                <span className="text-gray-500">
                                                                    ({formatDuration(shiftDuration - breakDuration)} líquidas)
                                                                </span>
                                                            </div>

                                                            {shift.breaks.length > 0 && (
                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                    <Coffee className="h-4 w-4 text-gray-400" />
                                                                    {shift.breaks.map((breakTime, breakIndex) => (
                                                                        <span key={breakIndex}>
                                                                            {breakTime.start_time} - {breakTime.end_time}
                                                                            {breakIndex < shift.breaks.length - 1 && ', '}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right text-sm">
                                        {hasActiveShifts && (
                                            <span className="text-gray-500">
                                                {formatDuration(
                                                    schedule.shifts
                                                        .filter(s => s.active)
                                                        .reduce((total, shift) => {
                                                            const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                                                            const breakDuration = shift.breaks.reduce((breakTotal, breakTime) => {
                                                                return breakTotal + calculateDuration(breakTime.start_time, breakTime.end_time);
                                                            }, 0);
                                                            return total + (shiftDuration - breakDuration);
                                                        }, 0)
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ShiftVisualization; 