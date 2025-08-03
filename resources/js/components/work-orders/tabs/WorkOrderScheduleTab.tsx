import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import EmptyCard from '@/components/ui/empty-card';
import { ItemSelect } from '@/components/ItemSelect';
import {
    Calendar as CalendarIcon,
    AlertCircle,
    Users,
    User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
interface WorkOrderScheduleTabProps {
    workOrder: any;
    technicians?: any[];
    teams?: any[];
    canSchedule: boolean;
    discipline: 'maintenance' | 'quality';
}
export function WorkOrderScheduleTab({
    workOrder,
    technicians = [],
    teams = [],
    canSchedule,
    discipline,
}: WorkOrderScheduleTabProps) {
    // Initialize hooks before any conditional returns
    const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
    const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
    const { data, setData, post, put, processing, errors } = useForm({
        scheduled_start_date: workOrder.scheduled_start_date || '',
        scheduled_end_date: workOrder.scheduled_end_date || '',
        assigned_team_id: workOrder.assigned_team_id?.toString() || '',
        assigned_technician_id: workOrder.assigned_technician_id?.toString() || '',
    });
    const isViewMode = !canSchedule || !['planned', 'scheduled'].includes(workOrder.status);
    // Check if work order is in a state that allows scheduling
    const canShowSchedule = ['planned', 'scheduled', 'in_progress', 'completed'].includes(workOrder.status);
    if (!canShowSchedule) {
        return (
            <div className="py-12">
                <EmptyCard
                    icon={CalendarIcon}
                    title="Ordem de serviço ainda não foi planejada"
                    description="O agendamento só pode ser realizado após o planejamento da ordem de serviço"
                />
            </div>
        );
    }
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (workOrder.status === 'planned') {
            post(route(`${discipline}.work-orders.schedule.store`, workOrder.id));
        } else {
            put(route(`${discipline}.work-orders.schedule.update`, workOrder.id));
        }
    };
    const handleCompleteScheduling = () => {
        const saveRoute = workOrder.status === 'planned'
            ? route(`${discipline}.work-orders.schedule.store`, workOrder.id)
            : route(`${discipline}.work-orders.schedule.update`, workOrder.id);
        const saveMethod = workOrder.status === 'planned' ? post : put;
        saveMethod(saveRoute, {
            ...data,
            preserveScroll: true,
            onSuccess: () => {
                post(route(`${discipline}.work-orders.schedule.complete`, workOrder.id));
            }
        });
    };
    // Helper functions for date/time handling
    const parseDateTime = (dateTimeString: string) => {
        if (!dateTimeString) return { date: undefined, time: '' };
        // Parse datetime-local format directly without timezone conversion
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        // Create date using local timezone (no conversion)
        const date = new Date(year, month - 1, day);
        // Clean up time part - remove timezone indicator and microseconds
        let cleanTime = timePart || '12:00:00';
        if (cleanTime) {
            cleanTime = cleanTime.replace(/[Z].*$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
            cleanTime = cleanTime.split('.')[0];
            const timeParts = cleanTime.split(':');
            if (timeParts.length === 2) {
                cleanTime = `${timeParts[0]}:${timeParts[1]}:00`;
            }
        }
        return {
            date: date,
            time: cleanTime
        };
    };
    const combineDateTime = (date: Date | undefined, time: string) => {
        if (!date || !time) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const [hours, minutes, seconds = '00'] = time.split(':');
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        return `${year}-${month}-${day}T${formattedTime}`;
    };
    const startDateTime = parseDateTime(data.scheduled_start_date);
    const endDateTime = parseDateTime(data.scheduled_end_date);
    return (
        <div className="space-y-6 py-6">
            {!canSchedule && ['planned', 'scheduled'].includes(workOrder.status) && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Você não tem permissão para agendar esta ordem de serviço.
                    </AlertDescription>
                </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Schedule Planning */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium">Agendamento da Execução</h3>
                        <p className="text-sm text-muted-foreground">
                            Defina quando e quem executará o trabalho
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Start Date/Time */}
                        <div className="space-y-2">
                            <Label htmlFor="scheduled_start_date">
                                Data/Hora de Início <span className="text-red-500">*</span>
                            </Label>
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.scheduled_start_date
                                        ? format(new Date(data.scheduled_start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : 'Não definido'
                                    }
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !startDateTime.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDateTime.date
                                                        ? format(startDateTime.date, "dd/MM/yyyy", { locale: ptBR })
                                                        : "Selecione a data"
                                                    }
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={startDateTime.date}
                                                    captionLayout="dropdown"
                                                    onSelect={(date) => {
                                                        const newDateTime = combineDateTime(date, startDateTime.time || '08:00:00');
                                                        setData('scheduled_start_date', newDateTime);
                                                        setStartDatePickerOpen(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="time"
                                            step="1"
                                            value={startDateTime.time || '08:00:00'}
                                            onChange={(e) => {
                                                const newDateTime = combineDateTime(startDateTime.date || new Date(), e.target.value);
                                                setData('scheduled_start_date', newDateTime);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                            {errors.scheduled_start_date && (
                                <span className="text-sm text-red-500">{errors.scheduled_start_date}</span>
                            )}
                        </div>
                        {/* End Date/Time */}
                        <div className="space-y-2">
                            <Label htmlFor="scheduled_end_date">
                                Data/Hora de Término <span className="text-red-500">*</span>
                            </Label>
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.scheduled_end_date
                                        ? format(new Date(data.scheduled_end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : 'Não definido'
                                    }
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !endDateTime.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDateTime.date
                                                        ? format(endDateTime.date, "dd/MM/yyyy", { locale: ptBR })
                                                        : "Selecione a data"
                                                    }
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={endDateTime.date}
                                                    captionLayout="dropdown"
                                                    onSelect={(date) => {
                                                        const newDateTime = combineDateTime(date, endDateTime.time || '17:00:00');
                                                        setData('scheduled_end_date', newDateTime);
                                                        setEndDatePickerOpen(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="time"
                                            step="1"
                                            value={endDateTime.time || '17:00:00'}
                                            onChange={(e) => {
                                                const newDateTime = combineDateTime(endDateTime.date || new Date(), e.target.value);
                                                setData('scheduled_end_date', newDateTime);
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                            {errors.scheduled_end_date && (
                                <span className="text-sm text-red-500">{errors.scheduled_end_date}</span>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <ItemSelect
                            label="Equipe Responsável"
                            items={teams.map(team => ({
                                id: team.id,
                                name: team.name,
                            }))}
                            value={data.assigned_team_id}
                            onValueChange={(value) => setData('assigned_team_id', value)}
                            placeholder="Selecione uma equipe"
                            view={isViewMode}
                            canClear
                            icon={Users}
                        />
                        <ItemSelect
                            label="Técnico Principal"
                            items={technicians.map(tech => ({
                                id: tech.id,
                                name: tech.name,
                            }))}
                            value={data.assigned_technician_id}
                            onValueChange={(value) => setData('assigned_technician_id', value)}
                            placeholder="Selecione um técnico"
                            view={isViewMode}
                            canClear
                            icon={User}
                        />
                    </div>
                </div>
                {/* Action Buttons */}
                {canSchedule && ['planned', 'scheduled'].includes(workOrder.status) && (
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={processing}
                        >
                            {processing ? 'Salvando...' : 'Salvar Rascunho'}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCompleteScheduling}
                            disabled={processing || !data.scheduled_start_date || !data.scheduled_end_date}
                        >
                            Confirmar Agendamento
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
} 