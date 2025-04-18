import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const ShiftTimeline: React.FC<ShiftTimelineProps> = ({ schedules }) => {
    const startHour = 0;
    const endHour = 23;
    const totalMinutes = (endHour - startHour) * 60;
    const timeMarkers = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Função para verificar se um horário está dentro de algum turno ativo
    const isInActiveShift = (day: string, currentMinutes: number) => {
        const schedule = schedules.find(s => s.weekday === day);
        if (!schedule) return false;

        return schedule.shifts.some(shift => 
            shift.active && 
            currentMinutes >= timeToMinutes(shift.start_time) && 
            currentMinutes < timeToMinutes(shift.end_time)
        );
    };

    // Função para verificar se um horário está dentro de algum intervalo
    const isInBreak = (day: string, currentMinutes: number) => {
        const schedule = schedules.find(s => s.weekday === day);
        if (!schedule) return false;

        return schedule.shifts.some(shift => 
            shift.active && 
            shift.breaks.some(breakTime => 
                currentMinutes >= timeToMinutes(breakTime.start_time) && 
                currentMinutes < timeToMinutes(breakTime.end_time)
            )
        );
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Visualização dos Turnos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col">
                    {/* Cabeçalho com os dias da semana */}
                    <div className="flex">
                        <div className="w-20 flex-shrink-0 h-10 flex items-center justify-center font-medium border-r">
                        </div>
                        {weekdays.map((day) => {
                            const schedule = schedules.find(s => s.weekday === day.key);
                            if (!schedule) return null;

                            const hasActiveShifts = schedule.shifts.some(shift => shift.active);

                            return (
                                <div
                                    key={day.key}
                                    className="flex-1 h-10 flex flex-col items-center justify-center border-b border-r px-2"
                                >
                                    <span className="font-medium text-sm">{day.label}</span>
                                    <span className={cn(
                                        "text-xs",
                                        hasActiveShifts ? "text-green-600" : "text-red-600"
                                    )}>
                                        {hasActiveShifts ? "Ativo" : "Inativo"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid principal */}
                    <div className="flex">
                        {/* Coluna de horas */}
                        <div className="w-20 flex-shrink-0">
                            {timeMarkers.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-12 flex items-center justify-center border-r text-xs text-gray-500 relative"
                                >
                                    <span className="absolute -top-2.5">{hour}h</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid de turnos */}
                        <div className="flex-1 grid grid-cols-7">
                            {weekdays.map((day, dayIndex) => {
                                const dayKey = day.key;
                                const nextDayIndex = (dayIndex + 1) % 7;
                                const nextDay = weekdays[nextDayIndex].key;

                                return (
                                    <div key={dayKey} className="relative">
                                        {/* Renderiza as linhas da grade */}
                                        {timeMarkers.map((hour) => (
                                            <div
                                                key={hour}
                                                className="h-12 border-b border-r relative"
                                            />
                                        ))}

                                        {/* Renderiza os turnos do dia atual */}
                                        {schedules.find(s => s.weekday === dayKey)?.shifts.map((shift, index) => {
                                            if (!shift.active) return null;
                                            
                                            const startMinutes = timeToMinutes(shift.start_time);
                                            const endMinutes = timeToMinutes(shift.end_time);
                                            
                                            // Se o turno termina no dia seguinte
                                            const isOvernight = endMinutes < startMinutes;
                                            const currentDayEndMinutes = isOvernight ? 24 * 60 : endMinutes;
                                            
                                            return (
                                                <div
                                                    key={`${index}-current`}
                                                    className="absolute left-0.5 right-0.5 bg-blue-500/50 rounded-sm"
                                                    style={{
                                                        top: `${(startMinutes * 0.8) + 1}px`,
                                                        height: `${(currentDayEndMinutes - startMinutes) * 0.8 - 2}px`
                                                    }}
                                                >
                                                    {/* Renderiza os intervalos do dia atual */}
                                                    {shift.breaks.map((breakTime, breakIndex) => {
                                                        const breakStart = timeToMinutes(breakTime.start_time);
                                                        const breakEnd = timeToMinutes(breakTime.end_time);
                                                        const isBreakOvernight = breakEnd < breakStart;
                                                        const currentDayBreakEnd = isBreakOvernight ? 24 * 60 : breakEnd;
                                                        
                                                        // Verifica se o intervalo está dentro do turno no dia atual
                                                        if (breakStart >= startMinutes && breakStart < currentDayEndMinutes) {
                                                            return (
                                                                <div
                                                                    key={breakIndex}
                                                                    className="absolute left-0 right-0 bg-red-500/50 rounded-sm"
                                                                    style={{
                                                                        top: `${(breakStart - startMinutes) * 0.8}px`,
                                                                        height: `${(Math.min(currentDayBreakEnd, currentDayEndMinutes) - breakStart) * 0.8}px`
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
                                                    return (
                                                        <div
                                                            key={`prev-${scheduleIndex}-${shiftIndex}`}
                                                            className="absolute left-0.5 right-0.5 bg-blue-500/50 rounded-sm"
                                                            style={{
                                                                top: '0px',
                                                                height: `${endMinutes * 0.8}px`
                                                            }}
                                                        >
                                                            {/* Renderiza intervalos que continuam do dia anterior */}
                                                            {shift.breaks.map((breakTime, breakIndex) => {
                                                                const breakStart = timeToMinutes(breakTime.start_time);
                                                                const breakEnd = timeToMinutes(breakTime.end_time);
                                                                
                                                                // Verifica se é um intervalo que atravessa a meia-noite
                                                                if (breakEnd < breakStart) {
                                                                    return (
                                                                        <div
                                                                            key={`prev-break-${breakIndex}`}
                                                                            className="absolute left-0 right-0 bg-red-500/50 rounded-sm"
                                                                            style={{
                                                                                top: '0px',
                                                                                height: `${Math.min(breakEnd, endMinutes) * 0.8}px`
                                                                            }}
                                                                        />
                                                                    );
                                                                }
                                                                
                                                                // Verifica se é um intervalo que começa após a meia-noite, mas dentro do turno
                                                                if (breakStart < endMinutes && breakEnd <= endMinutes) {
                                                                    return (
                                                                        <div
                                                                            key={`current-break-${breakIndex}`}
                                                                            className="absolute left-0 right-0 bg-red-500/50 rounded-sm"
                                                                            style={{
                                                                                top: `${breakStart * 0.8}px`,
                                                                                height: `${(breakEnd - breakStart) * 0.8}px`
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
            </CardContent>
        </Card>
    );
};

export default ShiftTimeline; 