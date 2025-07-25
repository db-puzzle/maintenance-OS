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

interface ShiftTimelineProps {
    schedules: Schedule[];
    showAllDays?: boolean;
}

const weekdays = [
    { key: 'Monday', label: 'Segunda' },
    { key: 'Tuesday', label: 'Terça' },
    { key: 'Wednesday', label: 'Quarta' },
    { key: 'Thursday', label: 'Quinta' },
    { key: 'Friday', label: 'Sexta' },
    { key: 'Saturday', label: 'Sábado' },
    { key: 'Sunday', label: 'Domingo' },
];

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const ShiftCalendarView: React.FC<ShiftTimelineProps> = ({ schedules, showAllDays = false }) => {
    // Função para encontrar o período mais extenso de horas em todos os dias
    const findTimeRange = () => {
        let earliestHour = 24;
        let latestHour = 0;
        let hasOvernightShifts = false;
        let hasAnyShifts = false;

        // Primeiro, verifica se há turnos noturnos e se existem turnos configurados
        schedules.forEach((schedule) => {
            schedule.shifts.forEach((shift) => {
                if (shift.active) {
                    hasAnyShifts = true;
                    const startHour = parseInt(shift.start_time.split(':')[0]);
                    const endHour = parseInt(shift.end_time.split(':')[0]);

                    if (endHour < startHour) {
                        hasOvernightShifts = true;
                    }
                }
            });
        });

        // Se não houver turnos configurados, usa o horário padrão (7h às 17h)
        if (!hasAnyShifts) {
            return { earliestHour: 7, latestHour: 17 };
        }

        // Se houver turnos noturnos, força o início às 00:00
        if (hasOvernightShifts) {
            earliestHour = 0;
            latestHour = 24;
            return { earliestHour, latestHour };
        }

        // Caso contrário, calcula o período normalmente
        schedules.forEach((schedule) => {
            schedule.shifts.forEach((shift) => {
                if (shift.active) {
                    const startHour = parseInt(shift.start_time.split(':')[0]);
                    const endHour = parseInt(shift.end_time.split(':')[0]);

                    earliestHour = Math.min(earliestHour, startHour);
                    latestHour = Math.max(latestHour, endHour);

                    // Verifica também os intervalos
                    shift.breaks.forEach((breakTime) => {
                        const breakStartHour = parseInt(breakTime.start_time.split(':')[0]);
                        const breakEndHour = parseInt(breakTime.end_time.split(':')[0]);

                        earliestHour = Math.min(earliestHour, breakStartHour);
                        latestHour = Math.max(latestHour, breakEndHour);
                    });
                }
            });
        });

        // Adiciona uma hora de margem antes e depois
        earliestHour = Math.max(0, earliestHour - 1);
        latestHour = Math.min(24, latestHour + 1);

        return { earliestHour, latestHour };
    };

    const { earliestHour, latestHour } = findTimeRange();
    const timeMarkers = Array.from({ length: latestHour - earliestHour }, (_, i) => {
        const hour = earliestHour + i;
        return {
            hour: hour % 24,
            isNextDay: hour >= 24,
        };
    });

    return (
        <div className="mt-0">
            <div className="flex flex-col">
                {/* Cabeçalho com os dias da semana */}
                <div className="flex">
                    <div className="flex h-10 w-20 flex-shrink-0 items-center justify-center font-medium"></div>
                    {weekdays.map((day) => {
                        const schedule = schedules.find((s) => s.weekday === day.key);
                        if (!showAllDays && !schedule) return null;

                        return (
                            <div key={day.key} className="flex h-10 flex-1 flex-col items-center justify-center border-b px-2">
                                <span className="text-sm font-medium">{day.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Grid principal */}
                <div className="flex">
                    {/* Coluna de horas */}
                    <div className="w-20 flex-shrink-0">
                        {timeMarkers.map(({ hour, isNextDay }, index) => (
                            <div key={index} className="relative flex h-12 items-center justify-center border-r text-xs text-gray-500">
                                <span className="absolute -top-2.5">
                                    {hour}h{isNextDay && <span className="text-muted-foreground text-[10px]"> (dia seg.)</span>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Grid de turnos */}
                    <div className="grid flex-1 grid-cols-7">
                        {weekdays.map((day, dayIndex) => {
                            const dayKey = day.key;
                            const schedule = schedules.find((s) => s.weekday === dayKey);

                            if (!showAllDays && !schedule) return null;

                            return (
                                <div key={dayKey} className="relative">
                                    {/* Renderiza as linhas da grade */}
                                    {timeMarkers.map((_, index) => (
                                        <div key={index} className="relative h-12 border-r border-b" />
                                    ))}

                                    {/* Renderiza os turnos do dia atual */}
                                    {schedule?.shifts.map((shift, index) => {
                                        if (!shift.active) return null;

                                        const startMinutes = timeToMinutes(shift.start_time);
                                        const endMinutes = timeToMinutes(shift.end_time);

                                        // Se o turno termina no dia seguinte
                                        const isOvernight = endMinutes < startMinutes;
                                        const currentDayEndMinutes = isOvernight ? 24 * 60 : endMinutes;

                                        // Calcula a posição relativa ao início da grade
                                        const relativeStartMinutes = startMinutes - earliestHour * 60;
                                        const relativeEndMinutes = currentDayEndMinutes - earliestHour * 60;

                                        return (
                                            <div
                                                key={`${index}-current`}
                                                className="absolute right-0.5 left-0.5 rounded-sm bg-blue-500/50"
                                                style={{
                                                    top: `${relativeStartMinutes * 0.8 + 1}px`,
                                                    height: `${(relativeEndMinutes - relativeStartMinutes) * 0.8 - 2}px`,
                                                }}
                                            >
                                                {/* Renderiza os intervalos do dia atual */}
                                                {shift.breaks.map((breakTime, breakIndex) => {
                                                    const breakStart = timeToMinutes(breakTime.start_time);
                                                    const breakEnd = timeToMinutes(breakTime.end_time);
                                                    const isBreakOvernight = breakEnd < breakStart;
                                                    const currentDayBreakEnd = isBreakOvernight ? 24 * 60 : breakEnd;

                                                    // Calcula a posição relativa ao início da grade
                                                    const relativeBreakStart = breakStart - earliestHour * 60;
                                                    const relativeBreakEnd = currentDayBreakEnd - earliestHour * 60;

                                                    // Verifica se o intervalo está dentro do turno no dia atual
                                                    if (breakStart >= startMinutes && breakStart < currentDayEndMinutes) {
                                                        return (
                                                            <div
                                                                key={breakIndex}
                                                                className="absolute right-0 left-0 rounded-sm bg-red-500/50"
                                                                style={{
                                                                    top: `${(relativeBreakStart - relativeStartMinutes) * 0.8}px`,
                                                                    height: `${(Math.min(relativeBreakEnd, relativeEndMinutes) - relativeBreakStart) * 0.8}px`,
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        );
                                    })}

                                    {/* Renderiza turnos que continuam do dia anterior */}
                                    {schedules.map((schedule, scheduleIndex) => {
                                        if (schedule.weekday !== weekdays[(dayIndex + 6) % 7].key) return null;

                                        return schedule.shifts.map((shift, shiftIndex) => {
                                            if (!shift.active) return null;

                                            const startMinutes = timeToMinutes(shift.start_time);
                                            const endMinutes = timeToMinutes(shift.end_time);

                                            // Verifica se é um turno noturno que continua no dia atual
                                            if (endMinutes < startMinutes) {
                                                const relativeEndMinutes = endMinutes - earliestHour * 60;

                                                return (
                                                    <div
                                                        key={`prev-${scheduleIndex}-${shiftIndex}`}
                                                        className="absolute right-0.5 left-0.5 rounded-sm bg-blue-500/50"
                                                        style={{
                                                            top: '0px',
                                                            height: `${relativeEndMinutes * 0.8}px`,
                                                        }}
                                                    >
                                                        {/* Renderiza intervalos que continuam do dia anterior */}
                                                        {shift.breaks.map((breakTime, breakIndex) => {
                                                            const breakStart = timeToMinutes(breakTime.start_time);
                                                            const breakEnd = timeToMinutes(breakTime.end_time);

                                                            // Calcula a posição relativa ao início da grade
                                                            const relativeBreakStart = breakStart - earliestHour * 60;
                                                            const relativeBreakEnd = breakEnd - earliestHour * 60;

                                                            // Verifica se é um intervalo que atravessa a meia-noite
                                                            if (breakEnd < breakStart) {
                                                                return (
                                                                    <div
                                                                        key={`prev-break-${breakIndex}`}
                                                                        className="absolute right-0 left-0 rounded-sm bg-red-500/50"
                                                                        style={{
                                                                            top: '0px',
                                                                            height: `${Math.min(relativeBreakEnd, relativeEndMinutes) * 0.8}px`,
                                                                        }}
                                                                    />
                                                                );
                                                            }

                                                            // Verifica se é um intervalo que começa após a meia-noite, mas dentro do turno
                                                            if (breakStart < endMinutes && breakEnd <= endMinutes) {
                                                                return (
                                                                    <div
                                                                        key={`current-break-${breakIndex}`}
                                                                        className="absolute right-0 left-0 rounded-sm bg-red-500/50"
                                                                        style={{
                                                                            top: `${relativeBreakStart * 0.8}px`,
                                                                            height: `${(relativeBreakEnd - relativeBreakStart) * 0.8}px`,
                                                                        }}
                                                                    />
                                                                );
                                                            }

                                                            return null;
                                                        })}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        });
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftCalendarView;
