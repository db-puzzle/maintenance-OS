import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface ShiftTableViewProps {
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

export default function ShiftTableView({ schedules }: ShiftTableViewProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Visão Geral Semanal</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dia</TableHead>
                                <TableHead>Turnos Ativos</TableHead>
                                <TableHead>Intervalos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weekdays.map((day) => {
                                const schedule = schedules.find(s => s.weekday === day.key);
                                const activeShifts = schedule?.shifts.filter(s => s.active) || [];

                                return (
                                    <TableRow key={day.key}>
                                        <TableCell className="text-base font-medium">{day.label}</TableCell>
                                        <TableCell>
                                            {activeShifts.length > 0 ? (
                                                <div className="space-y-1">
                                                    {activeShifts.map((shift, i) => (
                                                        <Badge key={i} variant="secondary" className="mr-1 text-sm">
                                                            {shift.start_time} - {shift.end_time}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Sem turnos ativos</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {activeShifts.length > 0 ? (
                                                <div className="space-y-1">
                                                    {activeShifts.map((shift, i) => (
                                                        <div key={i}>
                                                            {shift.breaks.map((breakTime, j) => (
                                                                <Badge key={j} variant="outline" className="mr-1 mb-1 text-sm">
                                                                    {breakTime.start_time} - {breakTime.end_time}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Sem turnos ativos</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
} 